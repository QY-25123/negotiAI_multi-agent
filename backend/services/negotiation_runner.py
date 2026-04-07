"""
negotiation_runner.py — Async wrapper that drives the AI negotiation loop.

Runs the blocking agent.take_turn() calls in a ThreadPoolExecutor, writes
NegotiationMessage rows to the DB after each turn, and pushes SSE events to
the per-negotiation asyncio.Queue managed in routers/negotiations.py.
"""

import asyncio
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

# Allow importing from parent directory (agents.py, negotiation_platform.py, models.py)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from agents import BuyerAgent, SellerAgent  # noqa: E402
from negotiation_platform import NegotiationPlatform  # noqa: E402

from database import Contract, Negotiation, NegotiationMessage  # noqa: E402
from services.agent_bridge import (  # noqa: E402
    build_ad_space_from_listing,
    build_buyer_config,
    build_seller_config,
)

_executor = ThreadPoolExecutor(max_workers=4)

MAX_ROUNDS = 10

# Track which proposal IDs we've already persisted, keyed by negotiation_id
_written_proposal_ids: Dict[str, set] = {}


async def run_negotiation(
    negotiation_id: str,
    buyer_config_overrides: Dict[str, Any],
    db_session_factory,
) -> None:
    """
    Main async entry-point.
    1. Load negotiation + listing + companies from DB.
    2. Build platform, agents.
    3. Run buyer/seller turns until done.
    4. Write DB records, push SSE events.
    5. On error, mark negotiation failed and push error event.
    """

    # Import here to avoid circular imports at module load time
    from routers.negotiations import get_queue

    async def push(neg_id: str, event: Dict[str, Any]) -> None:
        queue = get_queue(neg_id)
        if queue is not None:
            await queue.put(event)

    loop = asyncio.get_event_loop()
    _written_proposal_ids[negotiation_id] = set()

    db = db_session_factory()
    try:
        neg = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
        if not neg:
            return

        listing = neg.listing
        seller_company = neg.seller_company
        buyer_company = neg.buyer_company

        # ------------------------------------------------------------------
        # Build platform and agents
        # ------------------------------------------------------------------
        try:
            seller_config = build_seller_config(seller_company.name, listing.terms_json)
            buyer_config = build_buyer_config(buyer_config_overrides)
        except Exception as exc:
            await push(negotiation_id, {"type": "error", "detail": str(exc)})
            neg.status = "failed"
            neg.outcome = "no_deal"
            neg.completed_at = datetime.utcnow()
            db.commit()
            return

        platform = NegotiationPlatform(
            seller_name=seller_company.name,
            buyer_name=buyer_company.name,
            max_rounds=MAX_ROUNDS,
        )

        ad_space = build_ad_space_from_listing(
            listing_id=listing.id,
            listing_title=listing.title,
            listing_location=listing.location,
            terms_json_str=listing.terms_json,
        )
        platform.register_ad_spaces([ad_space])

        seller_agent = SellerAgent(platform, seller_config)
        buyer_agent = BuyerAgent(platform, buyer_config)

        db_round_count = 0  # Number of DB messages written
        turn_number = 0

        # ------------------------------------------------------------------
        # Negotiation loop — buyer goes first, then alternate
        # ------------------------------------------------------------------
        while True:
            is_done, _reason = platform.is_negotiation_over()
            if is_done or turn_number >= MAX_ROUNDS:
                break

            # Determine whose turn it is
            if turn_number % 2 == 0:
                current_party = "buyer"
                agent = buyer_agent
                await push(negotiation_id, {"type": "thinking", "party": "buyer"})
            else:
                current_party = "seller"
                agent = seller_agent
                await push(negotiation_id, {"type": "thinking", "party": "seller"})

            context = (
                f"It is turn {turn_number + 1}. "
                + platform.get_inventory_summary()
                + "\n\n"
                + platform.get_negotiation_history()
            )

            def _run_turn(ctx=context, a=agent):
                return a.take_turn(ctx)

            await loop.run_in_executor(_executor, _run_turn)
            turn_number += 1

            # Persist all new proposals/status changes since last flush
            new_msgs = await _flush_new_proposals(
                db, negotiation_id, platform, push, db_round_count
            )
            db_round_count += len(new_msgs)

            is_done, _reason = platform.is_negotiation_over()
            if is_done:
                break

        # ------------------------------------------------------------------
        # Determine outcome
        # ------------------------------------------------------------------
        outcome = "no_deal"
        final_value: Optional[float] = None
        contract_id: Optional[str] = None

        for p in platform.negotiation_history:
            if p.status == "accepted":
                outcome = "agreement"
                final_value = p.terms.price_per_day * p.terms.duration_days
                contract_id = str(uuid4())
                contract = Contract(
                    id=contract_id,
                    negotiation_id=negotiation_id,
                    seller_company_id=seller_company.id,
                    buyer_company_id=buyer_company.id,
                    listing_title=listing.title,
                    terms_json=json.dumps(p.terms.to_dict()),
                    total_value=final_value,
                )
                db.add(contract)
                break

        # Update negotiation record
        neg.status = "completed"
        neg.outcome = outcome
        neg.round_count = db_round_count
        neg.final_value = final_value
        neg.completed_at = datetime.utcnow()
        db.commit()

        await push(
            negotiation_id,
            {
                "type": "complete",
                "outcome": outcome,
                "contract_id": contract_id,
            },
        )

    except Exception as exc:
        try:
            from routers.negotiations import get_queue as _gq  # noqa: F811
            queue = _gq(negotiation_id)
            if queue:
                await queue.put({"type": "error", "detail": str(exc)})
            neg_record = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
            if neg_record:
                neg_record.status = "failed"
                neg_record.outcome = "no_deal"
                neg_record.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        _written_proposal_ids.pop(negotiation_id, None)
        db.close()


async def _flush_new_proposals(
    db,
    negotiation_id: str,
    platform: NegotiationPlatform,
    push_fn,
    db_round_offset: int,
) -> List[NegotiationMessage]:
    """
    Inspect the platform's negotiation_history and write any proposals that
    haven't been persisted yet. Also handles accept/reject responses which
    modify an existing proposal's status rather than adding a new entry.

    Returns the list of NegotiationMessage rows written in this call.
    """
    written = _written_proposal_ids[negotiation_id]
    new_msgs: List[NegotiationMessage] = []
    msg_number = db_round_offset

    for proposal in platform.negotiation_history:
        pid = proposal.id

        if pid not in written:
            # Brand new proposal row
            msg_number += 1
            action = "proposal" if proposal.round_number == 1 else "counter"
            msg = _make_db_message(negotiation_id, proposal, msg_number, action)
            db.add(msg)
            db.commit()
            written.add(pid)
            new_msgs.append(msg)

            await push_fn(
                negotiation_id,
                _make_sse_event(proposal, msg_number, action),
            )
        else:
            # Proposal already written — check if status changed to accepted/rejected
            # and we haven't yet written an "accept/reject" record for it
            accept_key = f"{pid}:accept"
            reject_key = f"{pid}:reject"

            if proposal.status == "accepted" and accept_key not in written:
                msg_number += 1
                # The accepting party is the opposite of the proposing party
                responding_party = "seller" if proposal.from_party == "buyer" else "buyer"
                accept_msg = NegotiationMessage(
                    negotiation_id=negotiation_id,
                    round_number=msg_number,
                    from_party=responding_party,
                    action="accept",
                    price_per_unit=proposal.terms.price_per_day,
                    duration_days=proposal.terms.duration_days,
                    format_type=proposal.terms.format,
                    message=f"Accepted terms: ${proposal.terms.price_per_day:.2f}/day × {proposal.terms.duration_days} days.",
                    terms_json=json.dumps(proposal.terms.to_dict()),
                )
                db.add(accept_msg)
                db.commit()
                written.add(accept_key)
                new_msgs.append(accept_msg)

                await push_fn(
                    negotiation_id,
                    {
                        "type": "message",
                        "round": msg_number,
                        "from_party": responding_party,
                        "action": "accept",
                        "message": accept_msg.message,
                        "price_per_unit": proposal.terms.price_per_day,
                        "duration_days": proposal.terms.duration_days,
                        "terms_json": proposal.terms.to_dict(),
                    },
                )

            elif proposal.status == "rejected" and reject_key not in written:
                # Only write a standalone "reject" record if this is a terminal rejection
                # (not a rejection that was immediately followed by a counter-offer).
                # A "counter" action sets the previous proposal to "rejected" and adds a
                # new proposal — the new proposal already captures the counter response.
                # So we skip if the next history entry is from the responding party.
                proposal_idx = platform.negotiation_history.index(proposal)
                is_followed_by_counter = False
                if proposal_idx + 1 < len(platform.negotiation_history):
                    next_p = platform.negotiation_history[proposal_idx + 1]
                    responding_party_check = "seller" if proposal.from_party == "buyer" else "buyer"
                    if next_p.from_party == responding_party_check:
                        is_followed_by_counter = True

                if not is_followed_by_counter:
                    msg_number += 1
                    responding_party = "seller" if proposal.from_party == "buyer" else "buyer"
                    reject_msg = NegotiationMessage(
                        negotiation_id=negotiation_id,
                        round_number=msg_number,
                        from_party=responding_party,
                        action="reject",
                        price_per_unit=proposal.terms.price_per_day,
                        duration_days=proposal.terms.duration_days,
                        format_type=proposal.terms.format,
                        message="Rejected the proposal.",
                        terms_json=json.dumps(proposal.terms.to_dict()),
                    )
                    db.add(reject_msg)
                    db.commit()
                    new_msgs.append(reject_msg)

                    await push_fn(
                        negotiation_id,
                        {
                            "type": "message",
                            "round": msg_number,
                            "from_party": responding_party,
                            "action": "reject",
                            "message": reject_msg.message,
                            "price_per_unit": proposal.terms.price_per_day,
                            "duration_days": proposal.terms.duration_days,
                            "terms_json": proposal.terms.to_dict(),
                        },
                    )

                written.add(reject_key)

    return new_msgs


def _make_db_message(
    negotiation_id: str,
    proposal,
    round_number: int,
    action: str,
) -> NegotiationMessage:
    return NegotiationMessage(
        negotiation_id=negotiation_id,
        round_number=round_number,
        from_party=proposal.from_party,
        action=action,
        price_per_unit=proposal.terms.price_per_day,
        duration_days=proposal.terms.duration_days,
        format_type=proposal.terms.format,
        message=proposal.message,
        terms_json=json.dumps(proposal.terms.to_dict()),
    )


def _make_sse_event(proposal, round_number: int, action: str) -> Dict[str, Any]:
    return {
        "type": "message",
        "round": round_number,
        "from_party": proposal.from_party,
        "action": action,
        "message": proposal.message,
        "price_per_unit": proposal.terms.price_per_day,
        "duration_days": proposal.terms.duration_days,
        "terms_json": proposal.terms.to_dict(),
    }

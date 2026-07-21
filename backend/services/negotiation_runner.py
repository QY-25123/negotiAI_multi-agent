"""
negotiation_runner.py — Async wrapper that drives the AI negotiation loop.

Runs the blocking agent.take_turn() calls in a ThreadPoolExecutor, writes
NegotiationMessage rows to the DB after each turn, and pushes SSE events to
the per-negotiation asyncio.Queue managed in routers/negotiations.py.
"""

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4


from agents import SponsorAgent, OrganizerAgent  # noqa: E402
from negotiation_platform import NegotiationPlatform  # noqa: E402

from database import Contract, Negotiation, NegotiationMessage  # noqa: E402
from services.agent_bridge import (  # noqa: E402
    build_sponsorship_package_from_listing,
    build_sponsor_config,
    build_organizer_config,
    build_organizer_config_from_overrides,
    build_sponsor_config_from_listing,
)

_executor = ThreadPoolExecutor(max_workers=4)

MAX_ROUNDS = 10

# Track which proposal IDs we've already persisted, keyed by negotiation_id
_written_proposal_ids: Dict[str, set] = {}


def _build_context(
    turn_number: int,
    max_rounds: int,
    current_party: str,
    platform,
    organizer_config,
    sponsor_config,
) -> str:
    """
    Build the per-turn context string injected into each agent call.

    Adds round pressure (rounds used / remaining) and a live price-gap
    summary so agents can calibrate how aggressively to converge.
    """
    round_number = turn_number + 1          # 1-based round index
    rounds_used = len(platform.negotiation_history)
    rounds_remaining = max_rounds - rounds_used

    # --- Derive latest prices from each side ----------------------------------
    latest_buyer_price: Optional[float] = None
    latest_seller_price: Optional[float] = None
    for p in reversed(platform.negotiation_history):
        if p.from_party == "buyer" and latest_buyer_price is None:
            latest_buyer_price = p.terms.price_per_day
        if p.from_party == "seller" and latest_seller_price is None:
            latest_seller_price = p.terms.price_per_day
        if latest_buyer_price is not None and latest_seller_price is not None:
            break

    # Fall back to configured limits when no proposals exist yet
    effective_buyer = latest_buyer_price if latest_buyer_price is not None else sponsor_config.max_budget_per_day
    effective_seller = latest_seller_price if latest_seller_price is not None else organizer_config.absolute_min_price_per_day
    gap = effective_seller - effective_buyer

    # --- Build pressure header ------------------------------------------------
    if rounds_remaining <= 0:
        pressure = "FINAL ROUND — this is your last chance to reach a deal. Make a meaningful concession or accept the current offer now."
    elif rounds_remaining == 1:
        pressure = "URGENT — only 1 round remains after this. If no deal is reached the session ends with no agreement."
    elif rounds_remaining <= 3:
        pressure = f"WARNING — only {rounds_remaining} rounds remaining. Start converging now or the session will end without a deal."
    else:
        pressure = f"{rounds_remaining} rounds remaining."

    if gap > 0:
        gap_line = f"Current price gap: ${gap:,.2f}/day (latest buyer offer ${effective_buyer:,.2f} vs latest organizer ask ${effective_seller:,.2f})."
    elif gap <= 0:
        gap_line = f"Prices have crossed — a deal is within reach (buyer ceiling ${effective_buyer:,.2f} >= organizer floor ${effective_seller:,.2f})."
    else:
        gap_line = ""

    header = (
        f"=== ROUND {round_number} of {max_rounds} | You are the {current_party.upper()} agent ===\n"
        f"{pressure}\n"
        f"{gap_line}\n"
    )

    return header + "\n" + platform.get_inventory_summary() + "\n\n" + platform.get_negotiation_history()


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
            override_constraints: Dict[str, Any] = {}
            if neg.override_constraints_json:
                try:
                    override_constraints = json.loads(neg.override_constraints_json)
                except Exception:
                    pass

            if buyer_config_overrides.get("reverse_roles"):
                # Organizer initiated against a sponsor's listing.
                # seller_company is the organizer; buyer_company is the sponsor.
                organizer_config = build_organizer_config_from_overrides(
                    seller_company.name, buyer_config_overrides
                )
                sponsor_config = build_sponsor_config_from_listing(
                    buyer_company.name, listing.terms_json
                )
            else:
                organizer_config = build_organizer_config(
                    seller_company.name, listing.terms_json, override_constraints
                )
                sponsor_config = build_sponsor_config(buyer_config_overrides)
        except Exception as exc:
            await push(negotiation_id, {"type": "error", "detail": str(exc)})
            neg.status = "failed"
            neg.outcome = "no_deal"
            neg.completed_at = datetime.utcnow()
            db.commit()
            return

        # ------------------------------------------------------------------
        # ZOPA pre-check — if sponsor ceiling < organizer floor, skip agents
        # ------------------------------------------------------------------
        if sponsor_config.max_budget_per_day < organizer_config.absolute_min_price_per_day:
            neg.status = "completed"
            neg.outcome = "no_deal"
            neg.round_count = 0
            neg.failure_reason = (
                f"No zone of possible agreement: sponsor ceiling "
                f"${sponsor_config.max_budget_per_day:,.2f}/day is below "
                f"organizer floor ${organizer_config.absolute_min_price_per_day:,.2f}/day. "
                "Adjust budgets and try again."
            )
            neg.completed_at = datetime.utcnow()
            db.commit()
            await push(negotiation_id, {"type": "complete", "outcome": "no_deal", "contract_id": None})
            return

        # Use per-negotiation max_rounds (set when negotiation was created)
        platform = NegotiationPlatform(
            organizer_name=seller_company.name,
            sponsor_name=buyer_company.name,
            max_rounds=neg.max_rounds,
        )

        package = build_sponsorship_package_from_listing(
            listing_id=listing.id,
            listing_title=listing.title,
            listing_location=listing.location,
            terms_json_str=listing.terms_json,
        )
        platform.register_packages([package])

        organizer_agent = OrganizerAgent(platform, organizer_config)
        sponsor_agent = SponsorAgent(platform, sponsor_config)

        db_round_count = 0  # Number of DB messages written
        turn_number = 0

        # ------------------------------------------------------------------
        # Negotiation loop — buyer goes first, then alternate
        # ------------------------------------------------------------------
        termination_reason: str = ""
        while True:
            is_done, term_reason = platform.is_negotiation_over()
            if is_done:
                termination_reason = term_reason
                break
            if turn_number >= neg.max_rounds * 2:  # safety: turns = 2× proposals
                termination_reason = f"Turn limit reached ({neg.max_rounds} max rounds)."
                break

            # Determine whose turn it is
            if turn_number % 2 == 0:
                current_party = "buyer"
                agent = sponsor_agent
                await push(negotiation_id, {"type": "thinking", "party": "buyer"})
            else:
                current_party = "seller"
                agent = organizer_agent
                await push(negotiation_id, {"type": "thinking", "party": "seller"})

            context = _build_context(
                turn_number=turn_number,
                max_rounds=neg.max_rounds,
                current_party=current_party,
                platform=platform,
                organizer_config=organizer_config,
                sponsor_config=sponsor_config,
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

            is_done, term_reason = platform.is_negotiation_over()
            if is_done:
                termination_reason = term_reason
                break

        # ------------------------------------------------------------------
        # Determine outcome
        # ------------------------------------------------------------------
        accepted_proposal = None
        for p in platform.negotiation_history:
            if p.status == "accepted":
                accepted_proposal = p
                break

        if accepted_proposal is not None:
            # ── Human-in-the-loop: pause for review before finalising ──────
            neg.status = "pending_review"
            neg.outcome = "pending_review"
            neg.round_count = db_round_count
            neg.pending_terms_json = json.dumps(accepted_proposal.terms.to_dict())
            db.commit()

            await push(
                negotiation_id,
                {
                    "type": "pending_review",
                    "terms": accepted_proposal.terms.to_dict(),
                    "proposed_value": round(
                        accepted_proposal.terms.price_per_day * accepted_proposal.terms.duration_days, 2
                    ),
                },
            )
        else:
            # No agreement — terminate immediately
            neg.status = "completed"
            neg.outcome = "no_deal"
            neg.round_count = db_round_count
            neg.final_value = None
            neg.completed_at = datetime.utcnow()
            neg.failure_reason = termination_reason or "No agreement reached."
            db.commit()

            await push(
                negotiation_id,
                {"type": "complete", "outcome": "no_deal", "contract_id": None},
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
                    format_type=proposal.terms.tier,
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
                        "created_at": datetime.utcnow().isoformat() + "Z",
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
                        format_type=proposal.terms.tier,
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
                            "created_at": datetime.utcnow().isoformat() + "Z",
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
        format_type=proposal.terms.tier,
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
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

"""
Negotiations router — list, detail, start (AI), and SSE stream.
"""

import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from database import Contract, Negotiation, NegotiationMessage, ServiceListing, get_db
from services.negotiation_runner import run_negotiation

router = APIRouter(prefix="/api/v1/negotiations", tags=["negotiations"])

# Module-level dict mapping negotiation_id → asyncio.Queue
_queues: Dict[str, asyncio.Queue] = {}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class CompanyRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    avatar_color: str
    logo_initials: str


class NegotiationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    service_type: str
    status: str
    outcome: str
    failure_reason: Optional[str] = None
    max_rounds: int = 10
    round_count: int
    final_value: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]
    seller: CompanyRef
    buyer: CompanyRef
    pending_terms_json: Optional[str] = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    round_number: int
    from_party: str
    action: str
    price_per_unit: Optional[float]
    duration_days: Optional[int]
    format_type: Optional[str]
    message: str
    terms_json: str
    created_at: datetime


class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_title: str
    terms_json: str
    total_value: float
    created_at: datetime


class NegotiationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    service_type: str
    status: str
    outcome: str
    failure_reason: Optional[str] = None
    max_rounds: int = 10
    round_count: int
    final_value: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]
    seller: CompanyRef
    buyer: CompanyRef
    messages: List[MessageResponse]
    contract: Optional[ContractResponse]
    pending_terms_json: Optional[str] = None
    buyer_config_json: Optional[str] = None


class StartNegotiationRequest(BaseModel):
    listing_id: str
    buyer_company_id: str
    target_price_per_unit: Optional[float] = None   # opening offer / desired price
    max_budget_per_unit: float = 50.0               # hard ceiling — never exceeded
    preferred_duration_days: int = 21
    start_date: str = "2026-04-07"
    max_rounds: int = 10  # negotiation fails if no deal by this many rounds


class StartNegotiationResponse(BaseModel):
    negotiation_id: str
    status: str
    message: str


class ReviewRequest(BaseModel):
    action: str  # "approve" | "renegotiate"
    overrides: Optional[Dict[str, Any]] = None


class ReviewResponse(BaseModel):
    status: str
    contract_id: Optional[str] = None
    negotiation_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_list_item(neg: Negotiation) -> NegotiationListItem:
    seller = neg.seller_company
    buyer = neg.buyer_company
    return NegotiationListItem(
        id=neg.id,
        title=neg.title,
        service_type=neg.service_type,
        status=neg.status,
        outcome=neg.outcome,
        failure_reason=neg.failure_reason,
        max_rounds=neg.max_rounds if neg.max_rounds is not None else 10,
        round_count=neg.round_count,
        final_value=neg.final_value,
        created_at=neg.created_at,
        completed_at=neg.completed_at,
        seller=CompanyRef(
            id=seller.id,
            name=seller.name,
            avatar_color=seller.avatar_color,
            logo_initials=seller.logo_initials,
        ),
        buyer=CompanyRef(
            id=buyer.id,
            name=buyer.name,
            avatar_color=buyer.avatar_color,
            logo_initials=buyer.logo_initials,
        ),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[NegotiationListItem])
def list_negotiations(
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Negotiation)
    if status:
        query = query.filter(Negotiation.status == status)
    if service_type:
        query = query.filter(Negotiation.service_type == service_type)
    negs = query.order_by(Negotiation.created_at.desc()).all()
    return [_build_list_item(n) for n in negs]


@router.get("/{negotiation_id}", response_model=NegotiationDetail)
def get_negotiation(negotiation_id: str, db: Session = Depends(get_db)):
    neg = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    seller = neg.seller_company
    buyer = neg.buyer_company

    contract_resp = None
    if neg.contract:
        c = neg.contract
        contract_resp = ContractResponse(
            id=c.id,
            listing_title=c.listing_title,
            terms_json=c.terms_json,
            total_value=c.total_value,
            created_at=c.created_at,
        )

    return NegotiationDetail(
        id=neg.id,
        title=neg.title,
        service_type=neg.service_type,
        status=neg.status,
        outcome=neg.outcome,
        failure_reason=neg.failure_reason,
        max_rounds=neg.max_rounds if neg.max_rounds is not None else 10,
        round_count=neg.round_count,
        final_value=neg.final_value,
        created_at=neg.created_at,
        completed_at=neg.completed_at,
        seller=CompanyRef(
            id=seller.id,
            name=seller.name,
            avatar_color=seller.avatar_color,
            logo_initials=seller.logo_initials,
        ),
        buyer=CompanyRef(
            id=buyer.id,
            name=buyer.name,
            avatar_color=buyer.avatar_color,
            logo_initials=buyer.logo_initials,
        ),
        messages=[
            MessageResponse(
                id=m.id,
                round_number=m.round_number,
                from_party=m.from_party,
                action=m.action,
                price_per_unit=m.price_per_unit,
                duration_days=m.duration_days,
                format_type=m.format_type,
                message=m.message,
                terms_json=m.terms_json,
                created_at=m.created_at,
            )
            for m in neg.messages
        ],
        contract=contract_resp,
    )


@router.post("", response_model=StartNegotiationResponse, status_code=201)
def start_negotiation(
    body: StartNegotiationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    from database import Company

    # Validate listing
    listing = db.query(ServiceListing).filter(ServiceListing.id == body.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Validate buyer company
    buyer_company = db.query(Company).filter(Company.id == body.buyer_company_id).first()
    if not buyer_company:
        raise HTTPException(status_code=404, detail="Buyer company not found")

    seller_company = listing.company

    # Build negotiation title
    title = f"{listing.title} — {buyer_company.name}"

    # Create negotiation row
    neg = Negotiation(
        seller_company_id=seller_company.id,
        buyer_company_id=buyer_company.id,
        listing_id=listing.id,
        service_type=listing.service_type,
        title=title,
        status="active",
        outcome="in_progress",
        round_count=0,
        max_rounds=body.max_rounds,
    )
    db.add(neg)
    db.commit()
    db.refresh(neg)

    negotiation_id = neg.id

    buyer_config_overrides = {
        "max_budget_per_unit": body.max_budget_per_unit,
        "target_price_per_unit": body.target_price_per_unit,
        "preferred_duration_days": body.preferred_duration_days,
        "start_date": body.start_date,
        "buyer_name": buyer_company.name,
        "client_name": buyer_company.name,
    }
    # Persist buyer config so it can be reused on renegotiation
    neg.buyer_config_json = json.dumps(buyer_config_overrides)
    db.commit()

    from database import SessionLocal

    background_tasks.add_task(
        run_negotiation,
        negotiation_id,
        buyer_config_overrides,
        SessionLocal,
    )

    return StartNegotiationResponse(
        negotiation_id=negotiation_id,
        status="active",
        message="Negotiation started. Connect to the SSE stream for live updates.",
    )


@router.post("/{negotiation_id}/review", response_model=ReviewResponse)
def review_negotiation(
    negotiation_id: str,
    body: ReviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Human-in-the-loop review endpoint: approve the deal or override constraints and renegotiate."""
    neg = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    if neg.status != "pending_review":
        raise HTTPException(status_code=400, detail="Negotiation is not awaiting human review")

    if body.action == "approve":
        terms_dict = json.loads(neg.pending_terms_json or "{}")
        price = float(terms_dict.get("price_per_day", 0))
        duration = int(terms_dict.get("duration_days", 1))
        total_value = price * duration

        contract = Contract(
            negotiation_id=negotiation_id,
            seller_company_id=neg.seller_company_id,
            buyer_company_id=neg.buyer_company_id,
            listing_title=neg.listing.title,
            terms_json=neg.pending_terms_json,
            total_value=total_value,
        )
        db.add(contract)
        neg.status = "completed"
        neg.outcome = "agreement"
        neg.final_value = total_value
        neg.completed_at = datetime.utcnow()
        neg.pending_terms_json = None
        db.commit()
        return ReviewResponse(status="approved", contract_id=contract.id)

    if body.action == "renegotiate":
        overrides = body.overrides or {}

        # Restore original buyer config and apply overrides on top
        original_config: Dict[str, Any] = {}
        if neg.buyer_config_json:
            try:
                original_config = json.loads(neg.buyer_config_json)
            except Exception:
                pass

        merged_buyer: Dict[str, Any] = {**original_config}
        if "buyer_max_price" in overrides:
            merged_buyer["max_budget_per_unit"] = float(overrides["buyer_max_price"])
        if "buyer_target_price" in overrides:
            merged_buyer["target_price_per_unit"] = float(overrides["buyer_target_price"])

        # Update negotiation state
        if "max_rounds" in overrides:
            neg.max_rounds = int(overrides["max_rounds"])
        neg.status = "active"
        neg.outcome = "in_progress"
        neg.pending_terms_json = None
        neg.override_constraints_json = json.dumps(overrides)
        db.commit()

        from database import SessionLocal
        background_tasks.add_task(run_negotiation, negotiation_id, merged_buyer, SessionLocal)
        return ReviewResponse(status="renegotiating", negotiation_id=negotiation_id)

    raise HTTPException(status_code=400, detail="action must be 'approve' or 'renegotiate'")


@router.get("/{negotiation_id}/stream")
async def stream_negotiation(negotiation_id: str, db: Session = Depends(get_db)):
    """SSE stream for a negotiation. Replays stored messages if already completed."""

    neg = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    # If negotiation is not live, replay stored messages then emit terminal event
    if neg.status != "active":
        async def replay_generator():
            messages = (
                db.query(NegotiationMessage)
                .filter(NegotiationMessage.negotiation_id == negotiation_id)
                .order_by(NegotiationMessage.round_number)
                .all()
            )
            for msg in messages:
                try:
                    terms = json.loads(msg.terms_json or "{}")
                except Exception:
                    terms = {}

                event_data: Dict[str, Any] = {
                    "type": "message",
                    "round": msg.round_number,
                    "from_party": msg.from_party,
                    "action": msg.action,
                    "message": msg.message,
                    "price_per_unit": msg.price_per_unit,
                    "duration_days": msg.duration_days,
                    "terms_json": terms,
                }
                yield {"data": json.dumps(event_data)}
                await asyncio.sleep(1.0)

            # Terminal event differs by status
            if neg.status == "pending_review" and neg.pending_terms_json:
                try:
                    pending_terms = json.loads(neg.pending_terms_json)
                except Exception:
                    pending_terms = {}
                price = float(pending_terms.get("price_per_day", 0))
                duration = int(pending_terms.get("duration_days", 1))
                yield {
                    "data": json.dumps({
                        "type": "pending_review",
                        "terms": pending_terms,
                        "proposed_value": round(price * duration, 2),
                    })
                }
            else:
                contract_id = None
                if neg.contract:
                    contract_id = neg.contract.id
                yield {
                    "data": json.dumps({
                        "type": "complete",
                        "outcome": neg.outcome,
                        "contract_id": contract_id,
                    })
                }

        return EventSourceResponse(replay_generator())

    # Active negotiation — create a queue and stream live events
    queue: asyncio.Queue = asyncio.Queue()
    _queues[negotiation_id] = queue

    async def live_generator():
        try:
            while True:
                event = await queue.get()
                yield {"data": json.dumps(event)}
                if event.get("type") in ("complete", "error", "pending_review"):
                    break
        finally:
            _queues.pop(negotiation_id, None)

    return EventSourceResponse(live_generator())


def get_queue(negotiation_id: str) -> Optional[asyncio.Queue]:
    """Used by the negotiation runner to push events to the SSE stream."""
    return _queues.get(negotiation_id)

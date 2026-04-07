"""
Stats and activity feed router.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Company, Contract, Negotiation, NegotiationMessage, ServiceListing, get_db

router = APIRouter(prefix="/api/v1", tags=["stats"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class StatsResponse(BaseModel):
    total_companies: int
    total_listings: int
    total_negotiations: int
    completed_negotiations: int
    total_value_closed: float
    avg_rounds_to_agreement: float


class ActivityItem(BaseModel):
    type: str
    description: str
    negotiation_id: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_listings = db.query(func.count(ServiceListing.id)).scalar() or 0
    total_negotiations = db.query(func.count(Negotiation.id)).scalar() or 0

    completed_negs = (
        db.query(Negotiation)
        .filter(Negotiation.status == "completed", Negotiation.outcome == "agreement")
        .all()
    )
    completed_negotiations = len(completed_negs)

    total_value_closed: float = 0.0
    total_rounds = 0
    for n in completed_negs:
        if n.final_value:
            total_value_closed += n.final_value
        total_rounds += n.round_count

    avg_rounds_to_agreement = (
        total_rounds / completed_negotiations if completed_negotiations > 0 else 0.0
    )

    return StatsResponse(
        total_companies=total_companies,
        total_listings=total_listings,
        total_negotiations=total_negotiations,
        completed_negotiations=completed_negotiations,
        total_value_closed=total_value_closed,
        avg_rounds_to_agreement=round(avg_rounds_to_agreement, 2),
    )


@router.get("/activity", response_model=List[ActivityItem])
def get_activity(db: Session = Depends(get_db)):
    items: List[Dict[str, Any]] = []

    # Recent negotiations created
    recent_negs = (
        db.query(Negotiation)
        .order_by(Negotiation.created_at.desc())
        .limit(10)
        .all()
    )
    for neg in recent_negs:
        items.append({
            "type": "negotiation_started",
            "description": f"Negotiation started: {neg.title}",
            "negotiation_id": neg.id,
            "created_at": neg.created_at,
        })

    # Messages with action="accept" (agreements)
    accept_msgs = (
        db.query(NegotiationMessage)
        .filter(NegotiationMessage.action == "accept")
        .order_by(NegotiationMessage.created_at.desc())
        .limit(10)
        .all()
    )
    for msg in accept_msgs:
        neg = db.query(Negotiation).filter(Negotiation.id == msg.negotiation_id).first()
        if neg:
            items.append({
                "type": "agreement_reached",
                "description": f"Agreement reached: {neg.title}",
                "negotiation_id": neg.id,
                "created_at": msg.created_at,
            })

    # Sort all items by created_at descending and return top 20
    items.sort(key=lambda x: x["created_at"], reverse=True)
    top_items = items[:20]

    return [
        ActivityItem(
            type=it["type"],
            description=it["description"],
            negotiation_id=it["negotiation_id"],
            created_at=it["created_at"],
        )
        for it in top_items
    ]

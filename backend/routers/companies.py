"""
Companies router — CRUD for Company records.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Company, Negotiation, ServiceListing, get_db

router = APIRouter(prefix="/api/v1/companies", tags=["companies"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class CompanyCreate(BaseModel):
    name: str
    type: str
    industry: str
    description: str = ""
    avatar_color: str = "#6366f1"
    logo_initials: str = ""
    website: Optional[str] = None
    contact_email: Optional[str] = None


class CompanySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    industry: str
    description: str
    avatar_color: str
    logo_initials: str
    created_at: datetime
    listing_count: int
    negotiation_count: int


class ListingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    service_type: str
    title: str
    description: str
    min_price: Optional[float]
    max_price: Optional[float]
    location: Optional[str]
    status: str
    created_at: datetime


class NegotiationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    service_type: str
    status: str
    outcome: str
    round_count: int
    final_value: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]


class CompanyDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    industry: str
    description: str
    avatar_color: str
    logo_initials: str
    website: Optional[str]
    contact_email: Optional[str]
    created_at: datetime
    listings: List[ListingSummary]
    recent_negotiations: List[NegotiationSummary]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[CompanySummary])
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for c in companies:
        listing_count = db.query(func.count(ServiceListing.id)).filter(
            ServiceListing.company_id == c.id
        ).scalar() or 0

        neg_count = db.query(func.count(Negotiation.id)).filter(
            (Negotiation.seller_company_id == c.id) | (Negotiation.buyer_company_id == c.id)
        ).scalar() or 0

        result.append(
            CompanySummary(
                id=c.id,
                name=c.name,
                type=c.type,
                industry=c.industry,
                description=c.description,
                avatar_color=c.avatar_color,
                logo_initials=c.logo_initials,
                created_at=c.created_at,
                listing_count=listing_count,
                negotiation_count=neg_count,
            )
        )
    return result


@router.get("/{company_id}", response_model=CompanyDetail)
def get_company(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    listings = (
        db.query(ServiceListing)
        .filter(ServiceListing.company_id == company_id)
        .order_by(ServiceListing.created_at.desc())
        .all()
    )

    recent_negs = (
        db.query(Negotiation)
        .filter(
            (Negotiation.seller_company_id == company_id)
            | (Negotiation.buyer_company_id == company_id)
        )
        .order_by(Negotiation.created_at.desc())
        .limit(5)
        .all()
    )

    return CompanyDetail(
        id=company.id,
        name=company.name,
        type=company.type,
        industry=company.industry,
        description=company.description,
        avatar_color=company.avatar_color,
        logo_initials=company.logo_initials,
        website=company.website,
        contact_email=company.contact_email,
        created_at=company.created_at,
        listings=[
            ListingSummary(
                id=lst.id,
                service_type=lst.service_type,
                title=lst.title,
                description=lst.description,
                min_price=lst.min_price,
                max_price=lst.max_price,
                location=lst.location,
                status=lst.status,
                created_at=lst.created_at,
            )
            for lst in listings
        ],
        recent_negotiations=[
            NegotiationSummary(
                id=n.id,
                title=n.title,
                service_type=n.service_type,
                status=n.status,
                outcome=n.outcome,
                round_count=n.round_count,
                final_value=n.final_value,
                created_at=n.created_at,
                completed_at=n.completed_at,
            )
            for n in recent_negs
        ],
    )


@router.post("", response_model=CompanySummary, status_code=201)
def create_company(body: CompanyCreate, db: Session = Depends(get_db)):
    company = Company(
        name=body.name,
        type=body.type,
        industry=body.industry,
        description=body.description,
        avatar_color=body.avatar_color,
        logo_initials=body.logo_initials,
        website=body.website,
        contact_email=body.contact_email,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanySummary(
        id=company.id,
        name=company.name,
        type=company.type,
        industry=company.industry,
        description=company.description,
        avatar_color=company.avatar_color,
        logo_initials=company.logo_initials,
        created_at=company.created_at,
        listing_count=0,
        negotiation_count=0,
    )

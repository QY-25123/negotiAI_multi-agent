"""
Listings router — CRUD for ServiceListing records.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import Company, ServiceListing, get_db

router = APIRouter(prefix="/api/v1/listings", tags=["listings"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ListingCreate(BaseModel):
    company_id: str
    service_type: str
    title: str
    description: str = ""
    terms_json: str = "{}"
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    location: Optional[str] = None


class CompanyNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    industry: str
    avatar_color: str
    logo_initials: str


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    service_type: str
    title: str
    description: str
    terms_json: str
    min_price: Optional[float]
    max_price: Optional[float]
    location: Optional[str]
    status: str
    created_at: datetime
    company: Optional[CompanyNested] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[ListingResponse])
def list_listings(
    service_type: Optional[str] = None,
    company_id: Optional[str] = None,
    status: str = "active",
    db: Session = Depends(get_db),
):
    query = db.query(ServiceListing)
    if status:
        query = query.filter(ServiceListing.status == status)
    if service_type:
        query = query.filter(ServiceListing.service_type == service_type)
    if company_id:
        query = query.filter(ServiceListing.company_id == company_id)
    listings = query.order_by(ServiceListing.created_at.desc()).all()
    return listings


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(ServiceListing).filter(ServiceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("", response_model=ListingResponse, status_code=201)
def create_listing(body: ListingCreate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == body.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    listing = ServiceListing(
        company_id=body.company_id,
        service_type=body.service_type,
        title=body.title,
        description=body.description,
        terms_json=body.terms_json,
        min_price=body.min_price,
        max_price=body.max_price,
        location=body.location,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

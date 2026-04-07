"""
Contracts router — PDF download endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import Contract, Negotiation, get_db
from services.pdf_generator import generate_contract_pdf

router = APIRouter(prefix="/api/v1/contracts", tags=["contracts"])


@router.get("/{contract_id}/pdf")
def download_contract_pdf(contract_id: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    neg = db.query(Negotiation).filter(Negotiation.id == contract.negotiation_id).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    pdf_bytes = generate_contract_pdf(
        contract_id=contract.id,
        negotiation_id=contract.negotiation_id,
        listing_title=contract.listing_title,
        service_type=neg.service_type,
        terms_json=contract.terms_json,
        total_value=contract.total_value,
        contract_created_at=contract.created_at,
        seller_name=neg.seller_company.name,
        buyer_name=neg.buyer_company.name,
        round_count=neg.round_count,
        negotiation_completed_at=neg.completed_at,
    )

    safe_title = "".join(c if c.isalnum() or c in "-_ " else "_" for c in contract.listing_title)
    filename = f"contract_{safe_title[:40].strip()}_{contract.id[:8]}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

"""
Data models for the agent-to-agent advertising space negotiation system.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Literal
from datetime import datetime
import uuid


@dataclass
class AdSpace:
    id: str
    name: str
    location: str
    available_formats: List[str]
    min_price_per_day: float
    max_duration_days: int
    available_from: str  # ISO date string e.g. "2026-04-07"
    seller_notes: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "available_formats": self.available_formats,
            "min_price_per_day": self.min_price_per_day,
            "max_duration_days": self.max_duration_days,
            "available_from": self.available_from,
            "seller_notes": self.seller_notes,
        }


@dataclass
class NegotiationTerm:
    ad_space_id: str
    format: str
    duration_days: int
    price_per_day: float
    start_date: str  # ISO date string
    special_conditions: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "ad_space_id": self.ad_space_id,
            "format": self.format,
            "duration_days": self.duration_days,
            "price_per_day": self.price_per_day,
            "start_date": self.start_date,
            "special_conditions": self.special_conditions,
        }


@dataclass
class Proposal:
    id: str
    round_number: int
    from_party: Literal["buyer", "seller"]
    terms: NegotiationTerm
    message: str
    status: Literal["pending", "accepted", "rejected", "withdrawn"] = "pending"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "round_number": self.round_number,
            "from_party": self.from_party,
            "terms": self.terms.to_dict(),
            "message": self.message,
            "status": self.status,
        }


@dataclass
class Contract:
    id: str
    seller_name: str
    buyer_name: str
    ad_space: AdSpace
    terms: NegotiationTerm
    total_price: float
    created_at: str
    signed: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "seller_name": self.seller_name,
            "buyer_name": self.buyer_name,
            "ad_space": self.ad_space.to_dict(),
            "terms": self.terms.to_dict(),
            "total_price": self.total_price,
            "created_at": self.created_at,
            "signed": self.signed,
        }

    def to_text(self) -> str:
        separator = "=" * 60
        thin_sep = "-" * 60
        lines = [
            separator,
            "           ADVERTISING SPACE CONTRACT",
            separator,
            f"Contract ID : {self.id}",
            f"Date Created: {self.created_at}",
            f"Status      : {'SIGNED' if self.signed else 'UNSIGNED'}",
            thin_sep,
            "PARTIES",
            thin_sep,
            f"  Seller (Landlord) : {self.seller_name}",
            f"  Buyer  (Advertiser): {self.buyer_name}",
            thin_sep,
            "ADVERTISING SPACE",
            thin_sep,
            f"  Space ID  : {self.ad_space.id}",
            f"  Name      : {self.ad_space.name}",
            f"  Location  : {self.ad_space.location}",
            f"  Notes     : {self.ad_space.seller_notes}",
            thin_sep,
            "AGREED TERMS",
            thin_sep,
            f"  Format            : {self.terms.format}",
            f"  Duration          : {self.terms.duration_days} days",
            f"  Start Date        : {self.terms.start_date}",
            f"  Price Per Day     : ${self.terms.price_per_day:.2f}",
            f"  TOTAL CONTRACT VALUE: ${self.total_price:.2f}",
        ]
        if self.terms.special_conditions:
            lines.append(f"  Special Conditions: {self.terms.special_conditions}")
        lines += [
            thin_sep,
            "SIGNATURES",
            thin_sep,
            f"  {self.seller_name} (Seller): {'[SIGNED]' if self.signed else '[PENDING]'}",
            f"  {self.buyer_name} (Buyer) : {'[SIGNED]' if self.signed else '[PENDING]'}",
            separator,
        ]
        return "\n".join(lines)

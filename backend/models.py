"""
Data models for the AI-powered event sponsorship deal platform.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Literal
from datetime import datetime
import uuid


@dataclass
class SponsorshipPackage:
    id: str
    name: str
    location: str
    available_tiers: List[str]
    min_price_per_day: float
    max_duration_days: int
    available_from: str      # ISO date string e.g. "2026-09-01"
    organizer_notes: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "available_tiers": self.available_tiers,
            "min_price_per_day": self.min_price_per_day,
            "max_duration_days": self.max_duration_days,
            "available_from": self.available_from,
            "organizer_notes": self.organizer_notes,
        }


@dataclass
class NegotiationTerm:
    package_id: str
    tier: str
    duration_days: int
    price_per_day: float
    start_date: str          # ISO date string
    special_conditions: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "package_id": self.package_id,
            "tier": self.tier,
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
    organizer_name: str
    sponsor_name: str
    package: SponsorshipPackage
    terms: NegotiationTerm
    total_price: float
    created_at: str
    signed: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "organizer_name": self.organizer_name,
            "sponsor_name": self.sponsor_name,
            "package": self.package.to_dict(),
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
            "        EVENT SPONSORSHIP AGREEMENT",
            separator,
            f"Contract ID   : {self.id}",
            f"Date Created  : {self.created_at}",
            f"Status        : {'SIGNED' if self.signed else 'UNSIGNED'}",
            thin_sep,
            "PARTIES",
            thin_sep,
            f"  Organizer : {self.organizer_name}",
            f"  Sponsor   : {self.sponsor_name}",
            thin_sep,
            "SPONSORSHIP PACKAGE",
            thin_sep,
            f"  Package ID    : {self.package.id}",
            f"  Package Name  : {self.package.name}",
            f"  Location      : {self.package.location}",
            f"  Notes         : {self.package.organizer_notes}",
            thin_sep,
            "AGREED TERMS",
            thin_sep,
            f"  Tier              : {self.terms.tier}",
            f"  Duration          : {self.terms.duration_days} days",
            f"  Start Date        : {self.terms.start_date}",
            f"  Price Per Day     : ${self.terms.price_per_day:.2f}",
            f"  TOTAL DEAL VALUE  : ${self.total_price:.2f}",
        ]
        if self.terms.special_conditions:
            lines.append(f"  Special Conditions: {self.terms.special_conditions}")
        lines += [
            thin_sep,
            "SIGNATURES",
            thin_sep,
            f"  {self.organizer_name} (Organizer) : {'[SIGNED]' if self.signed else '[PENDING]'}",
            f"  {self.sponsor_name}  (Sponsor)   : {'[SIGNED]' if self.signed else '[PENDING]'}",
            separator,
        ]
        return "\n".join(lines)

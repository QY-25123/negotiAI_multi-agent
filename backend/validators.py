"""
validators.py — Pydantic schema validation for agent proposal terms.

Every proposal submitted by either agent is validated here BEFORE it is
committed to the NegotiationPlatform.  If a hard constraint is violated the
validator returns a human-readable error string that is fed back to the agent
as a tool_result, forcing it to self-correct on the next iteration.
"""

from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


class ProposalTermsSchema(BaseModel):
    package_id: str
    tier: str
    duration_days: int
    price_per_day: float
    start_date: str
    special_conditions: Optional[str] = None

    @field_validator("duration_days")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("duration_days must be at least 1.")
        return v

    @field_validator("price_per_day")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price_per_day must be greater than 0.")
        return v

    @field_validator("start_date")
    @classmethod
    def start_date_format(cls, v: str) -> str:
        import re
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("start_date must be in YYYY-MM-DD format.")
        return v


def validate_organizer_terms(
    terms_dict: dict,
    absolute_min_price: float,
    available_tiers: Optional[list] = None,
) -> tuple[bool, str]:
    """
    Returns (ok, error_message).
    Validates a proposal from the Organizer (seller) agent.
    """
    try:
        terms = ProposalTermsSchema(**terms_dict)
    except Exception as exc:
        return False, f"SCHEMA VALIDATION FAILED: {exc}. Fix the field types and try again."

    errors = []

    if terms.price_per_day < absolute_min_price:
        errors.append(
            f"price_per_day ${terms.price_per_day:.2f} is below your absolute "
            f"minimum of ${absolute_min_price:.2f}/day. You must NOT go below this floor."
        )

    if available_tiers and terms.tier not in available_tiers:
        errors.append(
            f"tier '{terms.tier}' is not available for this package. "
            f"Allowed tiers: {', '.join(available_tiers)}."
        )

    if errors:
        return False, "CONSTRAINT VIOLATION — " + " | ".join(errors)

    return True, ""


def validate_sponsor_terms(
    terms_dict: dict,
    max_budget_per_day: float,
    min_duration_days: int,
    max_duration_days: int,
) -> tuple[bool, str]:
    """
    Returns (ok, error_message).
    Validates a proposal from the Sponsor (buyer) agent.
    """
    try:
        terms = ProposalTermsSchema(**terms_dict)
    except Exception as exc:
        return False, f"SCHEMA VALIDATION FAILED: {exc}. Fix the field types and try again."

    errors = []

    if terms.price_per_day > max_budget_per_day:
        errors.append(
            f"price_per_day ${terms.price_per_day:.2f} exceeds your maximum "
            f"budget of ${max_budget_per_day:.2f}/day. You must NOT exceed this ceiling."
        )

    if not (min_duration_days <= terms.duration_days <= max_duration_days):
        errors.append(
            f"duration_days {terms.duration_days} is outside your allowed range "
            f"of {min_duration_days}–{max_duration_days} days."
        )

    if errors:
        return False, "CONSTRAINT VIOLATION — " + " | ".join(errors)

    return True, ""


# Keep old names as aliases so any remaining callers don't break immediately
validate_seller_terms = validate_organizer_terms
validate_buyer_terms = validate_sponsor_terms

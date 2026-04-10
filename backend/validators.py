"""
validators.py — Pydantic schema validation for agent proposal terms.

Every proposal submitted by either agent is validated here BEFORE it is
committed to the NegotiationPlatform.  If a hard constraint is violated the
validator returns a human-readable error string that is fed back to the agent
as a tool_result, forcing it to self-correct on the next iteration.
"""

from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


# ---------------------------------------------------------------------------
# Shared schema — every proposal must satisfy this regardless of party
# ---------------------------------------------------------------------------

class ProposalTermsSchema(BaseModel):
    ad_space_id: str
    format: str
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


# ---------------------------------------------------------------------------
# Seller-specific validation
# ---------------------------------------------------------------------------

def validate_seller_terms(
    terms_dict: dict,
    absolute_min_price: float,
    available_formats: Optional[list] = None,
) -> tuple[bool, str]:
    """
    Returns (ok, error_message).
    ok=True means the terms pass all constraints and can be submitted.
    ok=False means the agent must revise — error_message explains what to fix.
    """
    # 1. Schema validation
    try:
        terms = ProposalTermsSchema(**terms_dict)
    except Exception as exc:
        return False, (
            f"SCHEMA VALIDATION FAILED: {exc}. "
            "Fix the field types and try again."
        )

    errors = []

    # 2. Hard price floor — seller MUST NOT go below absolute minimum
    if terms.price_per_day < absolute_min_price:
        errors.append(
            f"price_per_day ${terms.price_per_day:.2f} is below your absolute "
            f"minimum of ${absolute_min_price:.2f}/day. You must NOT go below "
            "this floor under any circumstances."
        )

    # 3. Format must be one of the available formats for this space
    if available_formats and terms.format not in available_formats:
        errors.append(
            f"format '{terms.format}' is not available for this space. "
            f"Allowed formats: {', '.join(available_formats)}."
        )

    if errors:
        return False, "CONSTRAINT VIOLATION — " + " | ".join(errors)

    return True, ""


# ---------------------------------------------------------------------------
# Buyer-specific validation
# ---------------------------------------------------------------------------

def validate_buyer_terms(
    terms_dict: dict,
    max_budget_per_day: float,
    min_duration_days: int,
    max_duration_days: int,
) -> tuple[bool, str]:
    """
    Returns (ok, error_message).
    """
    # 1. Schema validation
    try:
        terms = ProposalTermsSchema(**terms_dict)
    except Exception as exc:
        return False, (
            f"SCHEMA VALIDATION FAILED: {exc}. "
            "Fix the field types and try again."
        )

    errors = []

    # 2. Hard budget ceiling — buyer MUST NOT exceed their maximum budget
    if terms.price_per_day > max_budget_per_day:
        errors.append(
            f"price_per_day ${terms.price_per_day:.2f} exceeds your maximum "
            f"budget of ${max_budget_per_day:.2f}/day. You must NOT exceed this "
            "budget ceiling under any circumstances."
        )

    # 3. Duration must be within the buyer's allowed range
    if not (min_duration_days <= terms.duration_days <= max_duration_days):
        errors.append(
            f"duration_days {terms.duration_days} is outside your allowed range "
            f"of {min_duration_days}–{max_duration_days} days."
        )

    if errors:
        return False, "CONSTRAINT VIOLATION — " + " | ".join(errors)

    return True, ""

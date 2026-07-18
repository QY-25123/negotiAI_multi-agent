"""
agent_bridge.py — Builds SponsorshipPackage objects and OrganizerConfig/SponsorConfig from DB data.
"""

import json
import os
from typing import Any, Dict, Optional

from fastapi import HTTPException
from agents import SponsorConfig, OrganizerConfig
from models import SponsorshipPackage


def _require_api_key() -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured. Cannot run AI deal session.",
        )
    return api_key


def build_sponsorship_package_from_listing(
    listing_id: str,
    listing_title: str,
    listing_location: Optional[str],
    terms_json_str: str,
) -> SponsorshipPackage:
    """
    Parse a ServiceListing's terms_json and construct a SponsorshipPackage.
    Falls back to sensible defaults for missing fields.
    """
    try:
        terms: Dict[str, Any] = json.loads(terms_json_str or "{}")
    except Exception:
        terms = {}

    # Derive available tiers from perks or fall back to a generic package tier
    perks: list = terms.get("perks", [])
    available_tiers: list = terms.get("available_tiers", [])
    if not available_tiers:
        # Build tiers from the listing title keyword or perks
        if "title" in listing_title.lower():
            available_tiers = ["Title Sponsor"]
        elif "gold" in listing_title.lower():
            available_tiers = ["Gold Sponsor"]
        elif "platinum" in listing_title.lower():
            available_tiers = ["Platinum Sponsor"]
        elif "silver" in listing_title.lower():
            available_tiers = ["Silver Sponsor"]
        else:
            available_tiers = ["Sponsorship Package"]

    min_price_per_day = float(terms.get("min_price_per_day", 500.0))
    max_duration_days = int(terms.get("max_duration_days", terms.get("event_duration_days", 3)))
    available_from = terms.get("available_from", "2026-09-01")
    organizer_notes = terms.get("notes", "")

    # Append perks summary to notes so agents can see them
    if perks and organizer_notes:
        organizer_notes = f"{organizer_notes} | Included perks: {', '.join(perks)}"
    elif perks:
        organizer_notes = f"Included perks: {', '.join(perks)}"

    return SponsorshipPackage(
        id=listing_id,
        name=listing_title,
        location=listing_location or "TBD",
        available_tiers=available_tiers,
        min_price_per_day=min_price_per_day,
        max_duration_days=max_duration_days,
        available_from=available_from,
        organizer_notes=organizer_notes,
    )


def build_organizer_config(
    organizer_name: str,
    listing_terms_json_str: str,
    overrides: Optional[Dict[str, Any]] = None,
) -> "OrganizerConfig":
    """Build an OrganizerConfig from a ServiceListing's terms_json."""
    _require_api_key()
    try:
        terms: Dict[str, Any] = json.loads(listing_terms_json_str or "{}")
    except Exception:
        terms = {}

    absolute_min_price_per_day = float(terms.get("min_price_per_day", 500.0))
    preferred_min_duration_days = int(
        terms.get("min_duration_days", terms.get("event_duration_days", 1))
    )

    raw_asking = terms.get("max_price_per_day")
    asking_price_per_day = float(raw_asking) if raw_asking is not None else None

    if overrides and "seller_min_price_override" in overrides:
        absolute_min_price_per_day = float(overrides["seller_min_price_override"])
        asking_price_per_day = None  # reset so it recalculates from new floor

    audience_size = int(terms.get("audience_size", 0))

    return OrganizerConfig(
        organizer_name=organizer_name,
        absolute_min_price_per_day=absolute_min_price_per_day,
        asking_price_per_day=asking_price_per_day,
        preferred_min_duration_days=preferred_min_duration_days,
        audience_size=audience_size,
        max_discount_pct=10.0,
    )


def build_sponsor_config(overrides: Dict[str, Any]) -> "SponsorConfig":
    """Build a SponsorConfig from caller-supplied override dict."""
    _require_api_key()
    max_budget = float(overrides.get("max_budget_per_unit", 1000.0))

    raw_target = overrides.get("target_price_per_unit")
    target_price_per_day = float(raw_target) if raw_target is not None else None

    return SponsorConfig(
        sponsor_name=overrides.get("buyer_name", "Sponsor Company"),
        company_name=overrides.get("client_name", overrides.get("buyer_name", "Sponsor")),
        max_budget_per_day=max_budget,
        target_price_per_day=target_price_per_day,
        preferred_tiers=overrides.get("preferred_formats", ["Sponsorship Package"]),
        min_duration_days=int(overrides.get("min_duration_days", 1)),
        max_duration_days=int(overrides.get("preferred_duration_days", 7)),
        desired_start_date=overrides.get("start_date", "2026-09-01"),
    )


def build_organizer_config_from_overrides(
    organizer_name: str,
    overrides: Dict[str, Any],
) -> "OrganizerConfig":
    """
    Build an OrganizerConfig from form overrides (used in the reverse flow where
    an organizer initiates a deal from a sponsor's listing).
    organizer_floor_price  → absolute minimum the organizer will accept
    organizer_asking_price → opening ask / desired price
    """
    floor = float(overrides.get("organizer_floor_price", 500.0))
    asking = overrides.get("organizer_asking_price")
    asking_price = float(asking) if asking is not None else None

    return OrganizerConfig(
        organizer_name=organizer_name,
        absolute_min_price_per_day=floor,
        asking_price_per_day=asking_price,
        preferred_min_duration_days=int(overrides.get("preferred_duration_days", 1)),
        max_discount_pct=10.0,
    )


def build_sponsor_config_from_listing(
    sponsor_name: str,
    listing_terms_json_str: str,
) -> "SponsorConfig":
    """
    Build a SponsorConfig from a sponsor's own listing terms_json (used in the
    reverse flow where the sponsor's listing drives their config rather than
    form inputs from a sponsor user).
    """
    _require_api_key()
    try:
        terms: Dict[str, Any] = json.loads(listing_terms_json_str or "{}")
    except Exception:
        terms = {}

    max_budget = float(terms.get("max_budget_per_day", 1000.0))
    raw_target = terms.get("target_price_per_day")
    target_price = float(raw_target) if raw_target is not None else None
    min_dur = int(terms.get("preferred_duration_days", 1))
    max_dur = int(terms.get("max_duration_days", min_dur))

    return SponsorConfig(
        sponsor_name=sponsor_name,
        company_name=sponsor_name,
        max_budget_per_day=max_budget,
        target_price_per_day=target_price,
        min_duration_days=min_dur,
        max_duration_days=max_dur,
    )


# Keep old function names as aliases so negotiation_runner.py import still works
# until we update the call sites
build_seller_config = build_organizer_config
build_buyer_config = build_sponsor_config
build_ad_space_from_listing = build_sponsorship_package_from_listing

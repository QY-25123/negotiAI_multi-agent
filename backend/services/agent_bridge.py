"""
agent_bridge.py — Builds AdSpace objects and SellerConfig/BuyerConfig from DB data.
Bridges the FastAPI backend to the agent layer in the parent directory.
"""

import json
import os
import sys
from typing import Any, Dict, Optional

# Allow importing from parent directory (agents.py, negotiation_platform.py, models.py)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import HTTPException  # noqa: E402 (after sys.path manipulation)

from agents import BuyerConfig, SellerConfig  # noqa: E402
from models import AdSpace  # noqa: E402


def _require_api_key() -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured. Cannot run AI negotiation.",
        )
    return api_key


def build_ad_space_from_listing(listing_id: str, listing_title: str, listing_location: Optional[str], terms_json_str: str) -> AdSpace:
    """
    Parse a ServiceListing's terms_json and construct an AdSpace dataclass.
    Falls back to sensible defaults for missing fields.
    """
    try:
        terms: Dict[str, Any] = json.loads(terms_json_str or "{}")
    except Exception:
        terms = {}

    available_formats = terms.get("available_formats", ["digital_screen"])
    min_price_per_day = float(terms.get("min_price_per_day", 20.0))
    max_duration_days = int(terms.get("max_duration_days", 90))
    available_from = terms.get("available_from", "2026-04-07")
    seller_notes = terms.get("notes", "")

    return AdSpace(
        id=listing_id,
        name=listing_title,
        location=listing_location or "Unknown Location",
        available_formats=available_formats if isinstance(available_formats, list) else [available_formats],
        min_price_per_day=min_price_per_day,
        max_duration_days=max_duration_days,
        available_from=available_from,
        seller_notes=seller_notes,
    )


def build_seller_config(seller_name: str, listing_terms_json_str: str) -> SellerConfig:
    """Build a SellerConfig from a ServiceListing's terms_json."""
    _require_api_key()
    try:
        terms: Dict[str, Any] = json.loads(listing_terms_json_str or "{}")
    except Exception:
        terms = {}

    absolute_min_price_per_day = float(terms.get("min_price_per_day", 20.0))
    preferred_min_duration_days = int(terms.get("min_duration_days", 7))

    return SellerConfig(
        seller_name=seller_name,
        absolute_min_price_per_day=absolute_min_price_per_day,
        preferred_min_duration_days=preferred_min_duration_days,
        brand_keywords=["family-friendly", "local", "community"],
        max_discount_pct=10.0,
    )


def build_buyer_config(overrides: Dict[str, Any]) -> BuyerConfig:
    """Build a BuyerConfig from caller-supplied override dict."""
    _require_api_key()
    return BuyerConfig(
        buyer_name=overrides.get("buyer_name", "Buyer Agency"),
        client_name=overrides.get("client_name", "Client"),
        max_budget_per_day=float(overrides.get("max_budget_per_unit", 50.0)),
        preferred_formats=overrides.get("preferred_formats", ["digital_screen"]),
        min_duration_days=int(overrides.get("min_duration_days", 14)),
        max_duration_days=int(overrides.get("preferred_duration_days", 30)),
        desired_start_date=overrides.get("start_date", "2026-04-07"),
    )

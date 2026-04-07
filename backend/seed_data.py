"""
Seed data for NegotiAI platform.
Populates companies, service listings, negotiations, messages, and contracts
with realistic pre-completed scenarios so the UI works immediately.
"""

import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from database import (
    Company,
    Contract,
    Negotiation,
    NegotiationMessage,
    ServiceListing,
)


# ---------------------------------------------------------------------------
# Timestamp helpers
# ---------------------------------------------------------------------------

def _base_dt() -> datetime:
    """Two days ago — base time for negotiation creation."""
    return datetime.utcnow() - timedelta(days=2)


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

def seed_if_empty(db: Session) -> None:
    """Only seed if tables are empty."""
    if db.query(Company).count() > 0:
        return
    _do_seed(db)


def _do_seed(db: Session) -> None:
    base = _base_dt()

    # -----------------------------------------------------------------------
    # COMPANIES (8 total — fixed IDs so listings/negotiations can reference them)
    # -----------------------------------------------------------------------
    companies_data = [
        {
            "id": "co-001",
            "name": "The Daily Grind Café",
            "type": "seller",
            "industry": "Food & Beverage",
            "description": "A cozy neighborhood café serving specialty coffee and pastries since 2018.",
            "avatar_color": "#f59e0b",
            "logo_initials": "DG",
        },
        {
            "id": "co-002",
            "name": "BrightReach Media",
            "type": "buyer",
            "industry": "Marketing & Advertising",
            "description": "Full-service digital and physical advertising agency helping brands reach local audiences.",
            "avatar_color": "#6366f1",
            "logo_initials": "BR",
        },
        {
            "id": "co-003",
            "name": "TempForce Staffing",
            "type": "seller",
            "industry": "HR & Staffing",
            "description": "Premium event staffing solutions: trained staff for conferences, product launches, and festivals.",
            "avatar_color": "#10b981",
            "logo_initials": "TF",
        },
        {
            "id": "co-004",
            "name": "TechVenture Summit",
            "type": "buyer",
            "industry": "Events & Conferences",
            "description": "Annual technology conference connecting 500+ startup founders with investors and industry leaders.",
            "avatar_color": "#3b82f6",
            "logo_initials": "TV",
        },
        {
            "id": "co-005",
            "name": "LocalBoost Fund",
            "type": "seller",
            "industry": "Finance & Investment",
            "description": "Community investment fund providing sponsorship capital to local events and businesses.",
            "avatar_color": "#8b5cf6",
            "logo_initials": "LB",
        },
        {
            "id": "co-006",
            "name": "Saveur Food Festival",
            "type": "buyer",
            "industry": "Events & Entertainment",
            "description": "Award-winning 3-day outdoor food and wine festival attracting 10,000+ attendees annually.",
            "avatar_color": "#ef4444",
            "logo_initials": "SF",
        },
        {
            "id": "co-007",
            "name": "Urban Roast Coffee",
            "type": "seller",
            "industry": "Food & Beverage",
            "description": "Artisan coffee roastery with 3 high-traffic downtown locations looking to monetize in-store space.",
            "avatar_color": "#f97316",
            "logo_initials": "UR",
        },
        {
            "id": "co-008",
            "name": "Momentum Agency",
            "type": "buyer",
            "industry": "Marketing & Advertising",
            "description": "Growth marketing agency specializing in experiential and out-of-home advertising campaigns.",
            "avatar_color": "#06b6d4",
            "logo_initials": "MA",
        },
    ]

    for cd in companies_data:
        db.add(Company(
            id=cd["id"],
            name=cd["name"],
            type=cd["type"],
            industry=cd["industry"],
            description=cd["description"],
            avatar_color=cd["avatar_color"],
            logo_initials=cd["logo_initials"],
            created_at=base - timedelta(days=30),
        ))

    # -----------------------------------------------------------------------
    # SERVICE LISTINGS (8 total — fixed IDs)
    # -----------------------------------------------------------------------
    listings_data = [
        {
            "id": "lst-001",
            "company_id": "co-001",
            "service_type": "advertising",
            "title": "Window Display — Prime Corner Spot",
            "description": (
                "Our most visible advertising location: a large front window facing a busy intersection. "
                "Seen by 500+ daily passersby. Perfect for digital screens or backlit posters."
            ),
            "terms_json": json.dumps({
                "available_formats": ["static_poster", "digital_screen"],
                "min_price_per_day": 45.0,
                "max_duration_days": 90,
                "available_from": "2026-04-07",
                "notes": "Content must be family-friendly and locally relevant",
            }),
            "min_price": 45.0,
            "max_price": 80.0,
            "location": "123 Main St, Front Window",
            "status": "active",
        },
        {
            "id": "lst-002",
            "company_id": "co-001",
            "service_type": "advertising",
            "title": "Counter Banner — Order Point",
            "description": "Eye-level banner placement at the main ordering counter. Every customer reads it while waiting.",
            "terms_json": json.dumps({
                "available_formats": ["static_poster"],
                "min_price_per_day": 20.0,
                "max_duration_days": 60,
                "available_from": "2026-04-07",
                "notes": "Static posters only, no flashing imagery",
            }),
            "min_price": 20.0,
            "max_price": 35.0,
            "location": "123 Main St, Counter",
            "status": "active",
        },
        {
            "id": "lst-003",
            "company_id": "co-003",
            "service_type": "staffing",
            "title": "Conference & Event Staff Package",
            "description": (
                "Trained event professionals: registration hosts, floor assistants, A/V support, and brand ambassadors. "
                "Available for multi-day engagements."
            ),
            "terms_json": json.dumps({
                "staff_roles": ["registration_host", "floor_assistant", "av_support", "brand_ambassador"],
                "min_daily_rate_per_person": 150.0,
                "min_staff_count": 5,
                "max_staff_count": 50,
                "min_duration_days": 1,
                "max_duration_days": 7,
                "advance_booking_days": 14,
            }),
            "min_price": 750.0,
            "max_price": 7500.0,
            "location": "On-site (your venue)",
            "status": "active",
        },
        {
            "id": "lst-004",
            "company_id": "co-003",
            "service_type": "staffing",
            "title": "Festival Ground Crew",
            "description": (
                "Energetic, trained ground crew for outdoor festivals: setup teams, crowd management, "
                "vendor liaison, and information staff."
            ),
            "terms_json": json.dumps({
                "staff_roles": ["setup_crew", "crowd_management", "vendor_liaison", "info_staff"],
                "min_daily_rate_per_person": 120.0,
                "min_staff_count": 10,
                "max_duration_days": 5,
            }),
            "min_price": 1200.0,
            "max_price": 6000.0,
            "location": "On-site (your venue)",
            "status": "active",
        },
        {
            "id": "lst-005",
            "company_id": "co-005",
            "service_type": "sponsorship",
            "title": "Community Event Sponsorship Fund",
            "description": (
                "Investment capital for local community events: co-branding opportunities, promotional rights, "
                "and social media exposure for your fund in exchange for event support."
            ),
            "terms_json": json.dumps({
                "min_sponsorship": 5000.0,
                "max_sponsorship": 25000.0,
                "deliverables": ["logo_placement", "social_media_posts", "stage_mention", "banner_rights"],
                "event_types": ["food_festival", "cultural_fair", "music_event", "sports_event"],
            }),
            "min_price": 5000.0,
            "max_price": 25000.0,
            "location": "Any local event",
            "status": "active",
        },
        {
            "id": "lst-006",
            "company_id": "co-005",
            "service_type": "sponsorship",
            "title": "Startup Pitch Event Sponsorship",
            "description": (
                "Sponsorship for tech meetups and startup pitch nights. "
                "Get brand visibility with the local tech and innovation community."
            ),
            "terms_json": json.dumps({
                "min_sponsorship": 2000.0,
                "max_sponsorship": 10000.0,
                "deliverables": ["banner_placement", "logo_on_materials", "speaking_slot_optional"],
            }),
            "min_price": 2000.0,
            "max_price": 10000.0,
            "location": "Downtown tech hubs",
            "status": "active",
        },
        {
            "id": "lst-007",
            "company_id": "co-007",
            "service_type": "advertising",
            "title": "Urban Roast — Loyalty App Banner",
            "description": (
                "Prime placement in our loyalty app used by 8,000 active members. "
                "Digital banner shown on home screen and order confirmation."
            ),
            "terms_json": json.dumps({
                "available_formats": ["digital_banner"],
                "min_price_per_day": 35.0,
                "max_duration_days": 60,
            }),
            "min_price": 35.0,
            "max_price": 60.0,
            "location": "Urban Roast Mobile App",
            "status": "active",
        },
        {
            "id": "lst-008",
            "company_id": "co-007",
            "service_type": "advertising",
            "title": "Urban Roast — In-Store Digital Screen Network",
            "description": (
                "Rotating digital ads on 6 screens across 3 locations. "
                "15-second slots in a 5-ad rotation. High-income urban professional audience."
            ),
            "terms_json": json.dumps({
                "available_formats": ["digital_screen"],
                "screens": 6,
                "locations": 3,
                "slot_duration_seconds": 15,
                "min_price_per_day": 55.0,
                "max_duration_days": 90,
            }),
            "min_price": 55.0,
            "max_price": 120.0,
            "location": "3 Downtown Locations",
            "status": "active",
        },
    ]

    for ld in listings_data:
        db.add(ServiceListing(
            id=ld["id"],
            company_id=ld["company_id"],
            service_type=ld["service_type"],
            title=ld["title"],
            description=ld["description"],
            terms_json=ld["terms_json"],
            min_price=ld.get("min_price"),
            max_price=ld.get("max_price"),
            location=ld.get("location"),
            status=ld["status"],
            created_at=base - timedelta(days=25),
        ))

    # -----------------------------------------------------------------------
    # SCENARIO 1 — Advertising, AGREEMENT
    # neg-001: The Daily Grind Café ↔ BrightReach Media
    # $42/day × 21 days = $882
    # -----------------------------------------------------------------------
    neg1_created = base  # 2 days ago
    msg_offset = timedelta(minutes=10)

    neg1 = Negotiation(
        id="neg-001",
        seller_company_id="co-001",
        buyer_company_id="co-002",
        listing_id="lst-001",
        service_type="advertising",
        title="Window Display Ad — FitZone Gym Campaign",
        status="completed",
        outcome="agreement",
        round_count=4,
        final_value=882.0,
        created_at=neg1_created,
        completed_at=neg1_created + 4 * msg_offset,
    )
    db.add(neg1)

    neg1_messages = [
        NegotiationMessage(
            id="nm-001-1",
            negotiation_id="neg-001",
            round_number=1,
            from_party="buyer",
            action="proposal",
            price_per_unit=35.0,
            duration_days=14,
            format_type="digital_screen",
            message=(
                "We'd like to propose a 14-day digital screen campaign for our client FitZone Gym starting April 7th. "
                "Our opening offer is $35/day — we see strong alignment between FitZone's health-conscious audience "
                "and your café's daily foot traffic."
            ),
            terms_json=json.dumps({
                "price_per_day": 35.0,
                "duration_days": 14,
                "format": "digital_screen",
                "start_date": "2026-04-07",
            }),
            created_at=neg1_created + msg_offset * 0,
        ),
        NegotiationMessage(
            id="nm-001-2",
            negotiation_id="neg-001",
            round_number=2,
            from_party="seller",
            action="counter",
            price_per_unit=45.0,
            duration_days=21,
            format_type="digital_screen",
            message=(
                "Thank you for the proposal — FitZone Gym is a great fit for our family-friendly brand. "
                "Our window display has a minimum price of $45/day given the high-traffic location. "
                "We'd also prefer a 21-day campaign to ensure full impact. Proposing $45/day × 21 days."
            ),
            terms_json=json.dumps({
                "price_per_day": 45.0,
                "duration_days": 21,
                "format": "digital_screen",
                "start_date": "2026-04-07",
            }),
            created_at=neg1_created + msg_offset * 1,
        ),
        NegotiationMessage(
            id="nm-001-3",
            negotiation_id="neg-001",
            round_number=3,
            from_party="buyer",
            action="counter",
            price_per_unit=40.0,
            duration_days=21,
            format_type="digital_screen",
            message=(
                "We appreciate the flexibility on duration — 21 days works well for our campaign timeline. "
                "However, $45/day slightly exceeds our approved budget. "
                "We can meet you at $40/day, which reflects our strong commitment to a longer engagement."
            ),
            terms_json=json.dumps({
                "price_per_day": 40.0,
                "duration_days": 21,
                "format": "digital_screen",
                "start_date": "2026-04-07",
            }),
            created_at=neg1_created + msg_offset * 2,
        ),
        NegotiationMessage(
            id="nm-001-4",
            negotiation_id="neg-001",
            round_number=4,
            from_party="seller",
            action="accept",
            price_per_unit=42.0,
            duration_days=21,
            format_type="digital_screen",
            message=(
                "After reviewing our pricing structure, we're prepared to meet at $42/day for the 21-day "
                "digital screen campaign. This represents a fair split and we're confident FitZone's content "
                "will resonate with our morning commuter and fitness-minded regulars. Deal accepted."
            ),
            terms_json=json.dumps({
                "price_per_day": 42.0,
                "duration_days": 21,
                "format": "digital_screen",
                "start_date": "2026-04-07",
            }),
            created_at=neg1_created + msg_offset * 3,
        ),
    ]
    for m in neg1_messages:
        db.add(m)

    db.add(Contract(
        id="ct-001",
        negotiation_id="neg-001",
        seller_company_id="co-001",
        buyer_company_id="co-002",
        listing_title="Window Display — Prime Corner Spot",
        terms_json=json.dumps({
            "format": "digital_screen",
            "duration_days": 21,
            "price_per_day": 42.0,
            "start_date": "2026-04-07",
            "total_value": 882.0,
        }),
        total_value=882.0,
        created_at=neg1_created + msg_offset * 4,
    ))

    # -----------------------------------------------------------------------
    # SCENARIO 2 — Staffing, AGREEMENT
    # neg-002: TempForce Staffing ↔ TechVenture Summit
    # $180/person/day × 10 people × 3 days = $5,400
    # -----------------------------------------------------------------------
    neg2_created = base - timedelta(hours=6)

    neg2 = Negotiation(
        id="neg-002",
        seller_company_id="co-003",
        buyer_company_id="co-004",
        listing_id="lst-003",
        service_type="staffing",
        title="TechVenture Summit 2026 — Event Staff Hire",
        status="completed",
        outcome="agreement",
        round_count=3,
        final_value=5400.0,
        created_at=neg2_created,
        completed_at=neg2_created + 3 * msg_offset,
    )
    db.add(neg2)

    neg2_messages = [
        NegotiationMessage(
            id="nm-002-1",
            negotiation_id="neg-002",
            round_number=1,
            from_party="buyer",
            action="proposal",
            price_per_unit=140.0,
            duration_days=3,
            format_type=None,
            message=(
                "TechVenture Summit 2026 runs April 7-9 and we need 10 professional event staff. "
                "We're looking for registration hosts and floor assistants primarily. "
                "Our initial offer is $140/person/day — we have 3 events annually and value ongoing partnerships."
            ),
            terms_json=json.dumps({
                "staff_count": 10,
                "daily_rate_per_person": 140.0,
                "duration_days": 3,
                "roles": ["registration_host", "floor_assistant"],
                "start_date": "2026-04-07",
            }),
            created_at=neg2_created + msg_offset * 0,
        ),
        NegotiationMessage(
            id="nm-002-2",
            negotiation_id="neg-002",
            round_number=2,
            from_party="seller",
            action="counter",
            price_per_unit=200.0,
            duration_days=3,
            format_type=None,
            message=(
                "We're excited about TechVenture Summit — it's exactly the kind of high-profile event we staff. "
                "Our trained professionals require a minimum of $200/person/day to ensure quality service including "
                "pre-event briefings and professional attire. At 10 staff × 3 days, that's $6,000 total."
            ),
            terms_json=json.dumps({
                "staff_count": 10,
                "daily_rate_per_person": 200.0,
                "duration_days": 3,
                "roles": ["registration_host", "floor_assistant", "brand_ambassador"],
                "start_date": "2026-04-07",
            }),
            created_at=neg2_created + msg_offset * 1,
        ),
        NegotiationMessage(
            id="nm-002-3",
            negotiation_id="neg-002",
            round_number=3,
            from_party="buyer",
            action="accept",
            price_per_unit=180.0,
            duration_days=3,
            format_type=None,
            message=(
                "We understand the value of trained professionals and recognize that quality staff reflects "
                "directly on our event's reputation. We can approve $180/person/day — that gives us the quality "
                "team we need within our budget. Looking forward to a great partnership for Summit 2026 and future events."
            ),
            terms_json=json.dumps({
                "staff_count": 10,
                "daily_rate_per_person": 180.0,
                "duration_days": 3,
                "roles": ["registration_host", "floor_assistant", "brand_ambassador"],
                "start_date": "2026-04-07",
            }),
            created_at=neg2_created + msg_offset * 2,
        ),
    ]
    for m in neg2_messages:
        db.add(m)

    db.add(Contract(
        id="ct-002",
        negotiation_id="neg-002",
        seller_company_id="co-003",
        buyer_company_id="co-004",
        listing_title="Conference & Event Staff Package",
        terms_json=json.dumps({
            "staff_count": 10,
            "daily_rate_per_person": 180.0,
            "duration_days": 3,
            "total_staff_days": 30,
            "total_value": 5400.0,
            "start_date": "2026-04-07",
        }),
        total_value=5400.0,
        created_at=neg2_created + msg_offset * 3,
    ))

    # -----------------------------------------------------------------------
    # SCENARIO 3 — Sponsorship, NO DEAL
    # neg-003: LocalBoost Fund ↔ Saveur Food Festival
    # -----------------------------------------------------------------------
    neg3_created = base - timedelta(hours=12)

    neg3 = Negotiation(
        id="neg-003",
        seller_company_id="co-005",
        buyer_company_id="co-006",
        listing_id="lst-005",
        service_type="sponsorship",
        title="Saveur Food Festival 2026 — Sponsorship Funding",
        status="completed",
        outcome="no_deal",
        round_count=5,
        final_value=None,
        created_at=neg3_created,
        completed_at=neg3_created + 5 * msg_offset,
    )
    db.add(neg3)

    neg3_messages = [
        NegotiationMessage(
            id="nm-003-1",
            negotiation_id="neg-003",
            round_number=1,
            from_party="buyer",
            action="proposal",
            price_per_unit=15000.0,
            duration_days=3,
            format_type=None,
            message=(
                "The Saveur Food Festival is entering its 5th year with projected attendance of 12,000. "
                "We're seeking a $15,000 sponsorship package with LocalBoost branding on the main stage, "
                "digital promotion to 25k followers, and featured placement in our event program."
            ),
            terms_json=json.dumps({
                "sponsorship_amount": 15000.0,
                "event_duration_days": 3,
                "deliverables": ["main_stage_branding", "social_media_30_posts", "program_feature", "banner_rights"],
            }),
            created_at=neg3_created + msg_offset * 0,
        ),
        NegotiationMessage(
            id="nm-003-2",
            negotiation_id="neg-003",
            round_number=2,
            from_party="seller",
            action="counter",
            price_per_unit=8000.0,
            duration_days=3,
            format_type=None,
            message=(
                "The Saveur Food Festival aligns well with our community mission. However, our current allocation "
                "for food & beverage events caps at $8,000. We can offer $8,000 with logo placement, "
                "10 social media mentions, and a banner at the main entrance — solid visibility for our fund."
            ),
            terms_json=json.dumps({
                "sponsorship_amount": 8000.0,
                "deliverables": ["logo_placement", "social_media_10_posts", "entrance_banner"],
            }),
            created_at=neg3_created + msg_offset * 1,
        ),
        NegotiationMessage(
            id="nm-003-3",
            negotiation_id="neg-003",
            round_number=3,
            from_party="buyer",
            action="counter",
            price_per_unit=12000.0,
            duration_days=3,
            format_type=None,
            message=(
                "We appreciate the interest but $8,000 is substantially below what's needed to cover our production "
                "costs for sponsor activations. We can come down to $12,000 — this includes the main stage branding "
                "you'd receive which alone has $5,000 in market value for your fund's visibility."
            ),
            terms_json=json.dumps({
                "sponsorship_amount": 12000.0,
                "deliverables": ["main_stage_branding", "social_media_20_posts", "program_feature"],
            }),
            created_at=neg3_created + msg_offset * 2,
        ),
        NegotiationMessage(
            id="nm-003-4",
            negotiation_id="neg-003",
            round_number=4,
            from_party="seller",
            action="counter",
            price_per_unit=10000.0,
            duration_days=3,
            format_type=None,
            message=(
                "We've reviewed the revised package and can stretch to $10,000 — that is the absolute ceiling "
                "for this investment category. This final offer includes main stage co-branding plus 15 social posts. "
                "We believe this is a fair value exchange given our fund's focus on community events."
            ),
            terms_json=json.dumps({
                "sponsorship_amount": 10000.0,
                "deliverables": ["main_stage_branding", "social_media_15_posts", "banner_rights"],
            }),
            created_at=neg3_created + msg_offset * 3,
        ),
        NegotiationMessage(
            id="nm-003-5",
            negotiation_id="neg-003",
            round_number=5,
            from_party="buyer",
            action="reject",
            price_per_unit=10000.0,
            duration_days=3,
            format_type=None,
            message=(
                "We have great respect for LocalBoost Fund's community mission, but $10,000 doesn't cover "
                "the minimum activation costs for our main stage branding package. We'll need to seek sponsorship "
                "partners who can match the level of exposure we're offering. We hope to revisit this relationship "
                "for our next event."
            ),
            terms_json=json.dumps({
                "sponsorship_amount": 10000.0,
                "status": "rejected",
            }),
            created_at=neg3_created + msg_offset * 4,
        ),
    ]
    for m in neg3_messages:
        db.add(m)

    db.commit()
    print(
        "Database seeded successfully with 8 companies, 8 listings, and 3 negotiation scenarios."
    )

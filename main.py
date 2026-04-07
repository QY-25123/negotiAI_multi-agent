"""
Demo: The Daily Grind Café vs BrightReach Media – AI-powered ad space negotiation.

Run:
    ANTHROPIC_API_KEY=<your_key> python main.py
"""

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Load .env file if present
# ---------------------------------------------------------------------------
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# ---------------------------------------------------------------------------
# Guard: ensure API key is present before loading agents (which import anthropic)
# ---------------------------------------------------------------------------
if not os.environ.get("ANTHROPIC_API_KEY"):
    print(
        "\033[91mError: ANTHROPIC_API_KEY environment variable is not set.\033[0m\n"
        "Export it before running:\n"
        "  export ANTHROPIC_API_KEY=sk-ant-...\n"
    )
    sys.exit(1)

from models import AdSpace
from negotiation_platform import NegotiationPlatform
from agents import SellerAgent, SellerConfig, BuyerAgent, BuyerConfig

# ---------------------------------------------------------------------------
# ANSI colours
# ---------------------------------------------------------------------------
BLUE   = "\033[94m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# ---------------------------------------------------------------------------
# Scenario setup
# ---------------------------------------------------------------------------

SELLER_NAME = "The Daily Grind Café"
BUYER_NAME  = "BrightReach Media"

# --- Ad inventory ---
ad_spaces = [
    AdSpace(
        id="space-001",
        name="Window Display",
        location="Prime street-facing front window, high foot-traffic corner",
        available_formats=["static_poster", "digital_screen"],
        min_price_per_day=45.0,
        max_duration_days=90,
        available_from="2026-04-07",
        seller_notes=(
            "Our most visible spot – seen by 500+ passersby daily. "
            "Content must be family-friendly and locally relevant."
        ),
    ),
    AdSpace(
        id="space-002",
        name="Counter Banner",
        location="Eye-level banner at the main order counter",
        available_formats=["static_poster"],
        min_price_per_day=20.0,
        max_duration_days=60,
        available_from="2026-04-07",
        seller_notes=(
            "Seen by every customer who places an order. "
            "Static posters only – no flashing imagery please."
        ),
    ),
    AdSpace(
        id="space-003",
        name="Menu Board Slot",
        location="Digital menu board integration above the counter",
        available_formats=["digital_screen", "sponsored_item"],
        min_price_per_day=30.0,
        max_duration_days=30,
        available_from="2026-04-07",
        seller_notes=(
            "A 15-second rotating slot on our digital menu board. "
            "Perfect for local businesses that want to pair with our brand."
        ),
    ),
]

# --- Agent configs ---
seller_config = SellerConfig(
    seller_name=SELLER_NAME,
    absolute_min_price_per_day=20.0,
    preferred_min_duration_days=14,
    brand_keywords=["family-friendly", "local", "community"],
    max_discount_pct=10.0,
)

buyer_config = BuyerConfig(
    buyer_name=BUYER_NAME,
    client_name="FitZone Gym",
    max_budget_per_day=50.0,
    preferred_formats=["digital_screen"],
    min_duration_days=14,
    max_duration_days=30,
    desired_start_date="2026-04-07",
)

# ---------------------------------------------------------------------------
# Initialise platform and agents
# ---------------------------------------------------------------------------

platform = NegotiationPlatform(
    seller_name=SELLER_NAME,
    buyer_name=BUYER_NAME,
    max_rounds=10,
)
platform.register_ad_spaces(ad_spaces)

seller_agent = SellerAgent(platform=platform, config=seller_config)
buyer_agent  = BuyerAgent(platform=platform,  config=buyer_config)

# ---------------------------------------------------------------------------
# Negotiation loop
# ---------------------------------------------------------------------------

print(f"\n{BOLD}{CYAN}{'=' * 60}{RESET}")
print(f"{BOLD}{CYAN}        ADVERTISING SPACE NEGOTIATION SYSTEM{RESET}")
print(f"{BOLD}{CYAN}{'=' * 60}{RESET}")
print(f"\n{BOLD}Seller :{RESET} {BLUE}{SELLER_NAME}{RESET}")
print(f"{BOLD}Buyer  :{RESET} {GREEN}{BUYER_NAME}{RESET} (representing FitZone Gym)")
print(f"\n{YELLOW}Available inventory:{RESET}")
print(platform.get_inventory_summary())
print()

round_num = 0

while True:
    done, reason = platform.is_negotiation_over()
    if done:
        print(f"\n{BOLD}{YELLOW}--- Negotiation Over ---{RESET}")
        print(f"Reason: {reason}")
        break

    round_num += 1
    print(f"\n{BOLD}{CYAN}--- Round {round_num} ---{RESET}")

    latest = platform.get_latest_proposal()

    if latest is None or latest.from_party == "seller":
        # Buyer's turn
        print(f"{GREEN}{BOLD}[{BUYER_NAME} Agent thinking...]{RESET}")
        context = (
            f"Round {round_num}. "
            + (
                "There is no proposal yet – make your opening proposal for a digital screen ad space."
                if latest is None
                else f"The seller just countered (proposal ID: {latest.id}, price: ${latest.terms.price_per_day:.2f}/day). "
                     "Review the history and either accept or counter."
            )
        )
        result = buyer_agent.take_turn(context)
        print(f"{GREEN}{BUYER_NAME} Agent:{RESET} {result}")

    else:
        # Seller's turn
        print(f"{BLUE}{BOLD}[{SELLER_NAME} Agent thinking...]{RESET}")
        context = (
            f"Round {round_num}. "
            f"The buyer submitted a proposal (ID: {latest.id}, price: ${latest.terms.price_per_day:.2f}/day, "
            f"duration: {latest.terms.duration_days} days). "
            "Review the history and respond: accept if it meets your minimums, otherwise counter."
        )
        result = seller_agent.take_turn(context)
        print(f"{BLUE}{SELLER_NAME} Agent:{RESET} {result}")

# ---------------------------------------------------------------------------
# Post-negotiation: contract or summary
# ---------------------------------------------------------------------------

print(f"\n{BOLD}{CYAN}{'=' * 60}{RESET}")
print(f"{BOLD}{CYAN}           NEGOTIATION RESULT{RESET}")
print(f"{BOLD}{CYAN}{'=' * 60}{RESET}")

accepted_proposal = None
for p in platform.negotiation_history:
    if p.status == "accepted":
        accepted_proposal = p
        break

if accepted_proposal:
    print(f"\n{GREEN}{BOLD}Agreement reached!{RESET}")
    try:
        contract = platform.generate_contract(accepted_proposal.id)
        print(f"\n{BOLD}CONTRACT DOCUMENT:{RESET}")
        print(contract.to_text())
    except Exception as exc:
        print(f"{RED}Could not generate contract: {exc}{RESET}")
else:
    print(f"\n{RED}{BOLD}No agreement was reached.{RESET}")

# ---------------------------------------------------------------------------
# Full transcript
# ---------------------------------------------------------------------------

print(f"\n{BOLD}{CYAN}{'=' * 60}{RESET}")
print(f"{BOLD}{CYAN}           FULL NEGOTIATION TRANSCRIPT{RESET}")
print(f"{BOLD}{CYAN}{'=' * 60}{RESET}")
print(platform.get_negotiation_history())

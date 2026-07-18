"""
AI agents for the event sponsorship deal platform.

OrganizerAgent represents the event host protecting their funding floor.
SponsorAgent represents the company seeking sponsorship at the best price.

Both agents use the Anthropic SDK with adaptive thinking and a manual tool-use loop.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import anthropic

from models import NegotiationTerm
from negotiation_platform import NegotiationPlatform
from validators import validate_organizer_terms, validate_sponsor_terms

BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

MODEL = "claude-opus-4-6"


# ---------------------------------------------------------------------------
# Configuration dataclasses
# ---------------------------------------------------------------------------

@dataclass
class OrganizerConfig:
    """Constraints and preferences for the Organizer (event host) agent."""
    organizer_name: str
    absolute_min_price_per_day: float = 500.0
    asking_price_per_day: Optional[float] = None   # defaults to 120% of min
    preferred_min_duration_days: int = 1
    audience_size: int = 0
    max_discount_pct: float = 10.0

    def __post_init__(self):
        if self.asking_price_per_day is None:
            self.asking_price_per_day = round(self.absolute_min_price_per_day * 1.20, 2)


@dataclass
class SponsorConfig:
    """Constraints and preferences for the Sponsor agent."""
    sponsor_name: str
    company_name: str
    max_budget_per_day: float = 1000.0
    target_price_per_day: Optional[float] = None   # defaults to 70% of max
    preferred_tiers: List[str] = None
    min_duration_days: int = 1
    max_duration_days: int = 7
    desired_start_date: str = "2026-09-01"

    def __post_init__(self):
        if self.preferred_tiers is None:
            self.preferred_tiers = ["Sponsorship Package"]
        if self.target_price_per_day is None:
            self.target_price_per_day = round(self.max_budget_per_day * 0.70, 2)


# Backwards-compat aliases used by agent_bridge.py aliases
SellerConfig = OrganizerConfig
BuyerConfig = SponsorConfig


# ---------------------------------------------------------------------------
# Organizer Agent (event host / "seller")
# ---------------------------------------------------------------------------

class OrganizerAgent:
    def __init__(self, platform: NegotiationPlatform, config: OrganizerConfig) -> None:
        self.platform = platform
        self.config = config
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        audience_note = (
            f" The event has an audience of {config.audience_size:,} people."
            if config.audience_size > 0 else ""
        )

        self.system_prompt = f"""You are an AI agent representing {config.organizer_name}, an event organizer seeking sponsorship.

Your goal is to close a sponsorship deal that secures the funding your event needs while offering fair value to sponsors.{audience_note}

CONSTRAINTS & GUIDELINES:
- Absolute minimum price: ${config.absolute_min_price_per_day:,.2f}/day (NEVER go below — hard floor)
- Opening / asking price: ${config.asking_price_per_day:,.2f}/day (start here on your first proposal or counter)
- Maximum discount from asking price: {config.max_discount_pct}%
- Preferred minimum sponsorship duration: {config.preferred_min_duration_days} day(s)
- Be professional and firm on your pricing floor — it reflects real event costs
- If a sponsor's counter-offer is within 15% of your floor, seriously consider accepting
- If a proposal meets your minimum, ACCEPT it rather than keep negotiating
- Always check the package details and deal history before responding
- When responding to a proposal, you MUST call respond_to_proposal with the proposal ID

Deal strategy:
1. Check the deal history to understand the current state
2. If there is a pending proposal from the sponsor, respond to it (accept, reject, or counter)
3. Open at your asking price (${config.asking_price_per_day:,.2f}/day); concede toward your floor gradually
4. When countering, move incrementally — show good faith but protect your absolute minimum
5. Be concise — keep messages under 3 sentences

IMPORTANT: End your response with a brief plain-text summary of the action you took."""

        self.tools: List[Dict] = [
            {
                "name": "view_packages",
                "description": "View all available sponsorship packages with their details and pricing.",
                "input_schema": {"type": "object", "properties": {}, "required": []},
            },
            {
                "name": "view_deal_history",
                "description": "View the full history of all proposals made so far in this deal session.",
                "input_schema": {"type": "object", "properties": {}, "required": []},
            },
            {
                "name": "respond_to_proposal",
                "description": (
                    "Respond to an existing proposal. "
                    "Use action='accept' to accept, 'reject' to reject outright, "
                    "or 'counter' to make a counter-offer (counter_terms required)."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "proposal_id": {"type": "string", "description": "The ID of the proposal to respond to."},
                        "action": {"type": "string", "enum": ["accept", "reject", "counter"], "description": "The action to take."},
                        "message": {"type": "string", "description": "A brief message explaining your decision."},
                        "counter_terms": {
                            "type": "object",
                            "description": "Required when action='counter'. New proposed terms.",
                            "properties": {
                                "package_id": {"type": "string"},
                                "tier": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": ["package_id", "tier", "duration_days", "price_per_day", "start_date"],
                        },
                    },
                    "required": ["proposal_id", "action", "message"],
                },
            },
            {
                "name": "make_initial_proposal",
                "description": "Submit the very first proposal if the organizer goes first.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "terms_dict": {
                            "type": "object",
                            "description": "Proposed sponsorship terms.",
                            "properties": {
                                "package_id": {"type": "string"},
                                "tier": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": ["package_id", "tier", "duration_days", "price_per_day", "start_date"],
                        },
                        "message": {"type": "string"},
                    },
                    "required": ["terms_dict", "message"],
                },
            },
        ]

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        try:
            if name == "view_packages":
                return self.platform.get_inventory_summary()

            if name == "view_deal_history":
                return self.platform.get_negotiation_history()

            if name == "respond_to_proposal":
                proposal_id: str = inputs["proposal_id"]
                action: str = inputs["action"]
                message: str = inputs.get("message", "")
                counter_terms_dict: Optional[Dict] = inputs.get("counter_terms")

                if action == "counter" and counter_terms_dict:
                    available_tiers = []
                    for pkg in self.platform.packages:
                        available_tiers.extend(pkg.available_tiers)
                    ok, err = validate_organizer_terms(
                        counter_terms_dict,
                        absolute_min_price=self.config.absolute_min_price_per_day,
                        available_tiers=available_tiers or None,
                    )
                    if not ok:
                        return err

                counter_terms: Optional[NegotiationTerm] = None
                if counter_terms_dict:
                    counter_terms = NegotiationTerm(
                        package_id=counter_terms_dict["package_id"],
                        tier=counter_terms_dict["tier"],
                        duration_days=int(counter_terms_dict["duration_days"]),
                        price_per_day=float(counter_terms_dict["price_per_day"]),
                        start_date=counter_terms_dict["start_date"],
                        special_conditions=counter_terms_dict.get("special_conditions"),
                    )

                result = self.platform.respond_to_proposal(
                    proposal_id=proposal_id,
                    action=action,
                    counter_terms=counter_terms,
                    message=message,
                )
                return f"Action '{action}' applied. Proposal ID: {result.id}, Status: {result.status}"

            if name == "make_initial_proposal":
                td = inputs["terms_dict"]
                available_tiers = []
                for pkg in self.platform.packages:
                    available_tiers.extend(pkg.available_tiers)
                ok, err = validate_organizer_terms(
                    td,
                    absolute_min_price=self.config.absolute_min_price_per_day,
                    available_tiers=available_tiers or None,
                )
                if not ok:
                    return err
                terms = NegotiationTerm(
                    package_id=td["package_id"],
                    tier=td["tier"],
                    duration_days=int(td["duration_days"]),
                    price_per_day=float(td["price_per_day"]),
                    start_date=td["start_date"],
                    special_conditions=td.get("special_conditions"),
                )
                proposal = self.platform.submit_proposal(
                    from_party="seller",
                    terms=terms,
                    message=inputs.get("message", ""),
                )
                return f"Initial proposal submitted. ID: {proposal.id}"

            return f"Unknown tool: {name}"

        except Exception as exc:
            return f"Error executing tool {name!r}: {exc}"

    def take_turn(self, context: str) -> str:
        messages: List[Dict] = [{"role": "user", "content": context}]

        while True:
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=4096,
                thinking={"type": "adaptive"},
                system=self.system_prompt,
                tools=self.tools,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Organizer agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        print(f"  {BLUE}[organizer tool] {block.name}({json.dumps(block.input, indent=None)}){RESET}")
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        })
                messages.append({"role": "user", "content": tool_results})
            else:
                return f"Unexpected stop reason: {response.stop_reason}"


# ---------------------------------------------------------------------------
# Sponsor Agent ("buyer")
# ---------------------------------------------------------------------------

class SponsorAgent:
    def __init__(self, platform: NegotiationPlatform, config: SponsorConfig) -> None:
        self.platform = platform
        self.config = config
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        self.system_prompt = f"""You are an AI agent representing {config.sponsor_name}, a company looking to sponsor events.

You are negotiating on behalf of: {config.company_name}.

Your goal is to secure the best sponsorship package at the lowest cost within your budget.

CONSTRAINTS & GUIDELINES:
- Opening / target offer: ${config.target_price_per_day:,.2f}/day (start here on your first proposal)
- Maximum budget: ${config.max_budget_per_day:,.2f}/day (NEVER exceed — hard ceiling)
- Acceptable price range: ${config.target_price_per_day:,.2f}–${config.max_budget_per_day:,.2f}/day
- Preferred sponsorship tiers: {', '.join(config.preferred_tiers)}
- Required event duration: {config.min_duration_days}–{config.max_duration_days} day(s)
- Desired start date: {config.desired_start_date}
- Open with your target price; only increase toward your ceiling gradually
- If the organizer's counter is within 10% of your ceiling, consider accepting
- Always check available packages and history before making or countering a proposal
- Be concise — keep messages under 3 sentences

Deal strategy:
1. Check the available packages to find a suitable sponsorship opportunity
2. Check history to understand where the deal stands
3. If there is a pending proposal from the organizer, respond (accept or counter)
4. If it's your first move, submit an opening proposal at your target price (${config.target_price_per_day:,.2f}/day)
5. Increase your offer incrementally when countering — show good faith but stay within your ceiling

IMPORTANT: End your response with a plain-text summary of the action you took."""

        self.tools: List[Dict] = [
            {
                "name": "view_packages",
                "description": "View all available sponsorship packages with details and pricing.",
                "input_schema": {"type": "object", "properties": {}, "required": []},
            },
            {
                "name": "view_deal_history",
                "description": "View the full history of proposals exchanged so far.",
                "input_schema": {"type": "object", "properties": {}, "required": []},
            },
            {
                "name": "submit_proposal",
                "description": "Submit a new sponsorship proposal to the organizer.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "terms_dict": {
                            "type": "object",
                            "description": "Proposed sponsorship terms.",
                            "properties": {
                                "package_id": {"type": "string", "description": "ID of the sponsorship package."},
                                "tier": {"type": "string", "description": "Sponsorship tier (e.g. 'Title Sponsor', 'Gold Sponsor')."},
                                "duration_days": {"type": "integer", "description": "Number of event days covered."},
                                "price_per_day": {"type": "number", "description": "Offered price per day in USD."},
                                "start_date": {"type": "string", "description": "Desired start date (YYYY-MM-DD)."},
                                "special_conditions": {"type": "string", "description": "Any special conditions or notes."},
                            },
                            "required": ["package_id", "tier", "duration_days", "price_per_day", "start_date"],
                        },
                        "message": {"type": "string", "description": "Message to the organizer explaining your offer."},
                    },
                    "required": ["terms_dict", "message"],
                },
            },
            {
                "name": "accept_proposal",
                "description": "Accept the organizer's current pending proposal.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "proposal_id": {"type": "string", "description": "ID of the proposal to accept."},
                        "message": {"type": "string", "description": "Acceptance message."},
                    },
                    "required": ["proposal_id", "message"],
                },
            },
            {
                "name": "counter_proposal",
                "description": "Counter the organizer's proposal with new terms.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "proposal_id": {"type": "string", "description": "ID of the proposal being countered."},
                        "counter_terms_dict": {
                            "type": "object",
                            "description": "New proposed terms.",
                            "properties": {
                                "package_id": {"type": "string"},
                                "tier": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": ["package_id", "tier", "duration_days", "price_per_day", "start_date"],
                        },
                        "message": {"type": "string", "description": "Message explaining your counter-offer."},
                    },
                    "required": ["proposal_id", "counter_terms_dict", "message"],
                },
            },
        ]

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        try:
            if name == "view_packages":
                return self.platform.get_inventory_summary()

            if name == "view_deal_history":
                return self.platform.get_negotiation_history()

            if name == "submit_proposal":
                td = inputs["terms_dict"]
                ok, err = validate_sponsor_terms(
                    td,
                    max_budget_per_day=self.config.max_budget_per_day,
                    min_duration_days=self.config.min_duration_days,
                    max_duration_days=self.config.max_duration_days,
                )
                if not ok:
                    return err
                terms = NegotiationTerm(
                    package_id=td["package_id"],
                    tier=td["tier"],
                    duration_days=int(td["duration_days"]),
                    price_per_day=float(td["price_per_day"]),
                    start_date=td["start_date"],
                    special_conditions=td.get("special_conditions"),
                )
                proposal = self.platform.submit_proposal(
                    from_party="buyer",
                    terms=terms,
                    message=inputs.get("message", ""),
                )
                return f"Proposal submitted. ID: {proposal.id}"

            if name == "accept_proposal":
                result = self.platform.respond_to_proposal(
                    proposal_id=inputs["proposal_id"],
                    action="accept",
                    message=inputs.get("message", ""),
                )
                return f"Proposal accepted. ID: {result.id}, Status: {result.status}"

            if name == "counter_proposal":
                ctd = inputs["counter_terms_dict"]
                ok, err = validate_sponsor_terms(
                    ctd,
                    max_budget_per_day=self.config.max_budget_per_day,
                    min_duration_days=self.config.min_duration_days,
                    max_duration_days=self.config.max_duration_days,
                )
                if not ok:
                    return err
                counter_terms = NegotiationTerm(
                    package_id=ctd["package_id"],
                    tier=ctd["tier"],
                    duration_days=int(ctd["duration_days"]),
                    price_per_day=float(ctd["price_per_day"]),
                    start_date=ctd["start_date"],
                    special_conditions=ctd.get("special_conditions"),
                )
                result = self.platform.respond_to_proposal(
                    proposal_id=inputs["proposal_id"],
                    action="counter",
                    counter_terms=counter_terms,
                    message=inputs.get("message", ""),
                )
                return f"Counter-proposal submitted. ID: {result.id}"

            return f"Unknown tool: {name}"

        except Exception as exc:
            return f"Error executing tool {name!r}: {exc}"

    def take_turn(self, context: str) -> str:
        messages: List[Dict] = [{"role": "user", "content": context}]

        while True:
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=4096,
                thinking={"type": "adaptive"},
                system=self.system_prompt,
                tools=self.tools,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Sponsor agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        print(f"  {GREEN}[sponsor tool] {block.name}({json.dumps(block.input, indent=None)}){RESET}")
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        })
                messages.append({"role": "user", "content": tool_results})
            else:
                return f"Unexpected stop reason: {response.stop_reason}"


# Backwards-compat aliases
SellerAgent = OrganizerAgent
BuyerAgent = SponsorAgent

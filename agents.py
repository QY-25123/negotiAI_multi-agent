"""
AI agents for the advertising-space negotiation system.

Both agents are powered by the Anthropic Python SDK using claude-opus-4-6
with adaptive thinking and a manual tool-use loop.
"""

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import anthropic

from models import NegotiationTerm
from negotiation_platform import NegotiationPlatform

# ---------------------------------------------------------------------------
# ANSI colour helpers
# ---------------------------------------------------------------------------
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
class SellerConfig:
    """Constraints and preferences for the seller agent."""
    seller_name: str
    absolute_min_price_per_day: float = 20.0   # never go below this
    preferred_min_duration_days: int = 7        # prefer longer campaigns
    brand_keywords: List[str] = None            # keywords buyer must respect
    max_discount_pct: float = 10.0              # max % discount from listed min

    def __post_init__(self):
        if self.brand_keywords is None:
            self.brand_keywords = ["family-friendly", "local", "community"]


@dataclass
class BuyerConfig:
    """Constraints and preferences for the buyer agent."""
    buyer_name: str
    client_name: str
    max_budget_per_day: float = 50.0
    preferred_formats: List[str] = None
    min_duration_days: int = 14
    max_duration_days: int = 30
    desired_start_date: str = "2026-04-07"      # next Monday

    def __post_init__(self):
        if self.preferred_formats is None:
            self.preferred_formats = ["digital_screen"]


# ---------------------------------------------------------------------------
# Seller Agent
# ---------------------------------------------------------------------------

class SellerAgent:
    def __init__(self, platform: NegotiationPlatform, config: SellerConfig) -> None:
        self.platform = platform
        self.config = config
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        self.system_prompt = f"""You are an AI agent representing {config.seller_name}, a coffee shop owner.

Your goal is to negotiate advertising deals that maximize revenue while maintaining the coffee shop's brand image.

CONSTRAINTS & GUIDELINES:
- Absolute minimum price: ${config.absolute_min_price_per_day:.2f}/day (NEVER go below this)
- Maximum discount from listed minimum: {config.max_discount_pct}%
- Preferred minimum campaign duration: {config.preferred_min_duration_days} days
- Brand keywords buyers must respect: {', '.join(config.brand_keywords)}
- Only allow formats that are listed for each specific ad space
- Be professional and friendly but firm on pricing boundaries
- If a counter-offer is reasonable (within 15% of your min), consider accepting
- If a proposal meets your minimums, ACCEPT it rather than keep negotiating
- Always use the tools to check inventory and history before responding
- When you respond to a proposal, you MUST call respond_to_proposal with the proposal ID

Negotiation strategy:
1. First check the negotiation history to understand the current state
2. If there is a pending proposal from the buyer, respond to it (accept, reject, or counter)
3. When countering, move incrementally toward the buyer but protect your minimums
4. Be concise in your messages – keep them under 3 sentences

IMPORTANT: When you are done negotiating for this turn, end your response with a brief plain-text summary of what action you took."""

        self.tools: List[Dict] = [
            {
                "name": "view_inventory",
                "description": "View all available advertising spaces with their details and pricing.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
            {
                "name": "view_negotiation_history",
                "description": "View the full history of all proposals made so far in this negotiation.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
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
                        "proposal_id": {
                            "type": "string",
                            "description": "The ID of the proposal to respond to.",
                        },
                        "action": {
                            "type": "string",
                            "enum": ["accept", "reject", "counter"],
                            "description": "The action to take.",
                        },
                        "message": {
                            "type": "string",
                            "description": "A brief message explaining your decision.",
                        },
                        "counter_terms": {
                            "type": "object",
                            "description": "Required when action='counter'. New proposed terms.",
                            "properties": {
                                "ad_space_id": {"type": "string"},
                                "format": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": [
                                "ad_space_id",
                                "format",
                                "duration_days",
                                "price_per_day",
                                "start_date",
                            ],
                        },
                    },
                    "required": ["proposal_id", "action", "message"],
                },
            },
            {
                "name": "make_initial_proposal",
                "description": "Submit the very first proposal if the seller goes first.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "terms_dict": {
                            "type": "object",
                            "description": "Proposed terms.",
                            "properties": {
                                "ad_space_id": {"type": "string"},
                                "format": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": [
                                "ad_space_id",
                                "format",
                                "duration_days",
                                "price_per_day",
                                "start_date",
                            ],
                        },
                        "message": {"type": "string"},
                    },
                    "required": ["terms_dict", "message"],
                },
            },
        ]

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        try:
            if name == "view_inventory":
                return self.platform.get_inventory_summary()

            if name == "view_negotiation_history":
                return self.platform.get_negotiation_history()

            if name == "respond_to_proposal":
                proposal_id: str = inputs["proposal_id"]
                action: str = inputs["action"]
                message: str = inputs.get("message", "")
                counter_terms_dict: Optional[Dict] = inputs.get("counter_terms")

                counter_terms: Optional[NegotiationTerm] = None
                if counter_terms_dict:
                    counter_terms = NegotiationTerm(
                        ad_space_id=counter_terms_dict["ad_space_id"],
                        format=counter_terms_dict["format"],
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
                terms = NegotiationTerm(
                    ad_space_id=td["ad_space_id"],
                    format=td["format"],
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
        """Run the full agentic loop for one turn. Returns a summary string."""
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

            # Record assistant turn
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Seller agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        print(
                            f"  {BLUE}[tool] {block.name}({json.dumps(block.input, indent=None)}){RESET}"
                        )
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": str(result),
                            }
                        )
                messages.append({"role": "user", "content": tool_results})
            else:
                # Unexpected stop reason
                return f"Unexpected stop reason: {response.stop_reason}"


# ---------------------------------------------------------------------------
# Buyer Agent
# ---------------------------------------------------------------------------

class BuyerAgent:
    def __init__(self, platform: NegotiationPlatform, config: BuyerConfig) -> None:
        self.platform = platform
        self.config = config
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        self.system_prompt = f"""You are an AI agent representing {config.buyer_name}, an advertising agency.

You are negotiating on behalf of your client: {config.client_name}.

Your goal is to secure the best possible advertising space at the lowest cost within budget.

CONSTRAINTS & GUIDELINES:
- Maximum budget: ${config.max_budget_per_day:.2f}/day (NEVER exceed this)
- Preferred formats: {', '.join(config.preferred_formats)}
- Required campaign duration: {config.min_duration_days}–{config.max_duration_days} days
- Desired start date: {config.desired_start_date}
- You are professional, data-driven, and willing to negotiate
- Start with a slightly lower offer than your max budget to leave room to negotiate
- If the seller's counter is within 10% of your max budget, consider accepting
- If no agreement after several rounds, be willing to accept a reasonable price
- Always check available spaces and history before making/countering a proposal
- Be concise – keep messages under 3 sentences

Negotiation strategy:
1. Check inventory to find suitable spaces (prefer digital_screen format)
2. Check history to understand where the negotiation stands
3. If there is a pending proposal from the seller, respond (accept or counter)
4. If it's your first move, submit an opening proposal
5. Escalate price incrementally when countering – show good faith

IMPORTANT: When you are done for this turn, end with a plain-text summary of the action you took."""

        self.tools: List[Dict] = [
            {
                "name": "view_available_spaces",
                "description": "View all available advertising spaces with details and pricing.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
            {
                "name": "view_negotiation_history",
                "description": "View the full history of proposals exchanged so far.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
            {
                "name": "submit_proposal",
                "description": "Submit a new proposal to the seller.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "terms_dict": {
                            "type": "object",
                            "description": "Proposed advertising terms.",
                            "properties": {
                                "ad_space_id": {
                                    "type": "string",
                                    "description": "ID of the desired ad space.",
                                },
                                "format": {
                                    "type": "string",
                                    "description": "Desired advertising format.",
                                },
                                "duration_days": {
                                    "type": "integer",
                                    "description": "Number of days for the campaign.",
                                },
                                "price_per_day": {
                                    "type": "number",
                                    "description": "Offered price per day in USD.",
                                },
                                "start_date": {
                                    "type": "string",
                                    "description": "Desired start date (YYYY-MM-DD).",
                                },
                                "special_conditions": {
                                    "type": "string",
                                    "description": "Any special conditions or notes.",
                                },
                            },
                            "required": [
                                "ad_space_id",
                                "format",
                                "duration_days",
                                "price_per_day",
                                "start_date",
                            ],
                        },
                        "message": {
                            "type": "string",
                            "description": "Message to the seller explaining your proposal.",
                        },
                    },
                    "required": ["terms_dict", "message"],
                },
            },
            {
                "name": "accept_current_proposal",
                "description": "Accept the seller's current pending proposal.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "proposal_id": {
                            "type": "string",
                            "description": "ID of the proposal to accept.",
                        },
                        "message": {
                            "type": "string",
                            "description": "Acceptance message.",
                        },
                    },
                    "required": ["proposal_id", "message"],
                },
            },
            {
                "name": "counter_proposal",
                "description": "Counter the seller's proposal with new terms.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "proposal_id": {
                            "type": "string",
                            "description": "ID of the proposal being countered.",
                        },
                        "counter_terms_dict": {
                            "type": "object",
                            "description": "New proposed terms.",
                            "properties": {
                                "ad_space_id": {"type": "string"},
                                "format": {"type": "string"},
                                "duration_days": {"type": "integer"},
                                "price_per_day": {"type": "number"},
                                "start_date": {"type": "string"},
                                "special_conditions": {"type": "string"},
                            },
                            "required": [
                                "ad_space_id",
                                "format",
                                "duration_days",
                                "price_per_day",
                                "start_date",
                            ],
                        },
                        "message": {
                            "type": "string",
                            "description": "Message explaining your counter-offer.",
                        },
                    },
                    "required": ["proposal_id", "counter_terms_dict", "message"],
                },
            },
        ]

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        try:
            if name == "view_available_spaces":
                return self.platform.get_inventory_summary()

            if name == "view_negotiation_history":
                return self.platform.get_negotiation_history()

            if name == "submit_proposal":
                td = inputs["terms_dict"]
                terms = NegotiationTerm(
                    ad_space_id=td["ad_space_id"],
                    format=td["format"],
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

            if name == "accept_current_proposal":
                result = self.platform.respond_to_proposal(
                    proposal_id=inputs["proposal_id"],
                    action="accept",
                    message=inputs.get("message", ""),
                )
                return f"Proposal accepted. ID: {result.id}, Status: {result.status}"

            if name == "counter_proposal":
                ctd = inputs["counter_terms_dict"]
                counter_terms = NegotiationTerm(
                    ad_space_id=ctd["ad_space_id"],
                    format=ctd["format"],
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
        """Run the full agentic loop for one turn. Returns a summary string."""
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

            # Record assistant turn
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Buyer agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        print(
                            f"  {GREEN}[tool] {block.name}({json.dumps(block.input, indent=None)}){RESET}"
                        )
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": str(result),
                            }
                        )
                messages.append({"role": "user", "content": tool_results})
            else:
                return f"Unexpected stop reason: {response.stop_reason}"

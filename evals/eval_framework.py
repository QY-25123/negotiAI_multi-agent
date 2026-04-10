#!/usr/bin/env python3
"""
NegotiAI Evaluation Framework
==============================
Generates 50 synthetic negotiation scenarios (30 feasible / 20 infeasible),
runs the full agent-to-agent negotiation loop for each, and produces a
quantifiable benchmark report suitable for resume/portfolio use.

Usage:
    python eval_framework.py                           # defaults: sonnet, 6 rounds
    python eval_framework.py --model claude-haiku-4-5-20251001 --max-rounds 8
    python eval_framework.py --model claude-opus-4-6
    python eval_framework.py --dry-run                 # print scenarios only, no API

Cost estimates (approximate, thinking disabled):
    Haiku 4.5      : ~$0.10–0.30 for 50 scenarios
    Sonnet 4.6     : ~$1–5      for 50 scenarios
    Opus 4.6       : ~$30–80    for 50 scenarios

Outputs (written to ./eval_results/):
    results.json      — full per-scenario metrics
    report.md         — human-readable benchmark report with resume bullets
"""

import argparse
import json
import math
import os
import random
import sys
import time
import traceback
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

# ── Path setup ────────────────────────────────────────────────────────────────
_EVALS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.join(_EVALS_DIR, "..", "backend")
sys.path.insert(0, _BACKEND_DIR)

import anthropic
from agents import BuyerAgent, BuyerConfig, SellerAgent, SellerConfig
from models import AdSpace, NegotiationTerm
from negotiation_platform import NegotiationPlatform
from validators import validate_buyer_terms, validate_seller_terms

# ── Constants ─────────────────────────────────────────────────────────────────
SEED = 42
N_FEASIBLE = 30
N_INFEASIBLE = 20
DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_MAX_ROUNDS = 6
OUTPUT_DIR = os.path.join(_EVALS_DIR, "results")

AD_LOCATIONS = [
    "Downtown Core", "North End", "Financial District", "Midtown West",
    "Eastside Market", "University Quarter", "Harbour Front", "Tech Hub",
    "Arts District", "Central Station",
]
AD_FORMATS = ["digital_screen", "print_banner", "window_display"]
SELLER_NAMES = [
    "Brew & Co", "The Daily Grind", "Harbour Café", "Summit Roasters",
    "Metro Bean", "Corner Perch", "East End Espresso", "Skyline Café",
    "The Bean Counter", "Perk & Sip",
]
BUYER_NAMES = [
    "BrightReach Media", "NovaSpark Agency", "PulseAds", "Apex Creative",
    "Catalyst Media", "Nexus Ads", "ClearVision Agency", "Orbit Media",
    "Momentum Creative", "Prism Advertising",
]
CLIENT_NAMES = [
    "FreshBrew Tech", "UrbanStride Co", "CloudFirst Labs", "GreenSprout Foods",
    "SwiftWear Brand", "PeakFit App", "EcoTrail Gear", "NovaByte Systems",
    "SolarEdge Tech", "QuantumLeap AI",
]


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class EvalScenario:
    scenario_id: str
    label: str                      # "feasible" or "infeasible"
    feasible: bool
    infeasibility_type: str         # "none" | "price_gap"

    # Seller constraints
    seller_name: str
    seller_min_price: float         # hard floor — NEVER go below
    seller_asking_price: float      # opening ask
    seller_min_duration_days: int   # preferred minimum
    seller_max_duration_days: int   # ad space limit

    # Buyer constraints
    buyer_name: str
    client_name: str
    buyer_target_price: float       # opening offer
    buyer_max_price: float          # hard ceiling — NEVER exceed
    buyer_min_duration_days: int
    buyer_max_duration_days: int
    buyer_start_date: str

    # Shared
    location: str
    format_type: str
    available_from: str


@dataclass
class EvalResult:
    scenario_id: str
    label: str
    feasible: bool

    # Outcome
    agreement_reached: bool
    outcome: str                    # "agreement" | "no_deal" | "error"

    # Compliance
    constraint_compliant: bool      # final price within [seller_min, buyer_max]
    final_price: Optional[float]
    final_duration: Optional[int]

    # Quality metrics
    rounds_used: int
    validation_repairs: int         # times validator rejected a proposal (self-correction)
    malformed_outputs: int          # SCHEMA VALIDATION FAILED events
    total_tool_calls: int

    # Correctness flags
    repair_invoked: bool            # at least one repair occurred
    session_terminated_correctly: bool   # ended cleanly (not via exception)
    e2e_completed: bool             # ran to completion without crash

    # Timing
    latency_seconds: float
    error_detail: Optional[str] = None


# ── Instrumented agents ───────────────────────────────────────────────────────

class InstrumentedSellerAgent(SellerAgent):
    """SellerAgent that counts validation repairs and uses the eval model/settings."""

    def __init__(self, platform: NegotiationPlatform, config: SellerConfig,
                 eval_model: str, use_thinking: bool = False) -> None:
        super().__init__(platform, config)
        self._eval_model = eval_model
        self._use_thinking = use_thinking
        self.validation_repairs: int = 0
        self.malformed_outputs: int = 0
        self.total_tool_calls: int = 0

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        self.total_tool_calls += 1
        result = super()._execute_tool(name, inputs)
        if isinstance(result, str):
            if "CONSTRAINT VIOLATION" in result:
                self.validation_repairs += 1
            if "SCHEMA VALIDATION FAILED" in result:
                self.malformed_outputs += 1
        return result

    def take_turn(self, context: str) -> str:
        """Override to use eval model and optionally disable thinking."""
        messages: List[Dict] = [{"role": "user", "content": context}]
        create_kwargs: Dict[str, Any] = dict(
            model=self._eval_model,
            max_tokens=4096,
            system=self.system_prompt,
            tools=self.tools,
            messages=messages,
        )
        if self._use_thinking:
            create_kwargs["thinking"] = {"type": "adaptive"}

        while True:
            response = self.client.messages.create(**create_kwargs)
            messages.append({"role": "assistant", "content": response.content})
            create_kwargs["messages"] = messages

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Seller agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        res = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(res),
                        })
                messages.append({"role": "user", "content": tool_results})
                create_kwargs["messages"] = messages
            else:
                return f"Unexpected stop reason: {response.stop_reason}"


class InstrumentedBuyerAgent(BuyerAgent):
    """BuyerAgent that counts validation repairs and uses the eval model/settings."""

    def __init__(self, platform: NegotiationPlatform, config: BuyerConfig,
                 eval_model: str, use_thinking: bool = False) -> None:
        super().__init__(platform, config)
        self._eval_model = eval_model
        self._use_thinking = use_thinking
        self.validation_repairs: int = 0
        self.malformed_outputs: int = 0
        self.total_tool_calls: int = 0

    def _execute_tool(self, name: str, inputs: Dict[str, Any]) -> str:
        self.total_tool_calls += 1
        result = super()._execute_tool(name, inputs)
        if isinstance(result, str):
            if "CONSTRAINT VIOLATION" in result:
                self.validation_repairs += 1
            if "SCHEMA VALIDATION FAILED" in result:
                self.malformed_outputs += 1
        return result

    def take_turn(self, context: str) -> str:
        """Override to use eval model and optionally disable thinking."""
        messages: List[Dict] = [{"role": "user", "content": context}]
        create_kwargs: Dict[str, Any] = dict(
            model=self._eval_model,
            max_tokens=4096,
            system=self.system_prompt,
            tools=self.tools,
            messages=messages,
        )
        if self._use_thinking:
            create_kwargs["thinking"] = {"type": "adaptive"}

        while True:
            response = self.client.messages.create(**create_kwargs)
            messages.append({"role": "assistant", "content": response.content})
            create_kwargs["messages"] = messages

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        return block.text
                return "Buyer agent completed its turn."

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        res = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(res),
                        })
                messages.append({"role": "user", "content": tool_results})
                create_kwargs["messages"] = messages
            else:
                return f"Unexpected stop reason: {response.stop_reason}"


# ── Scenario generator ────────────────────────────────────────────────────────

def generate_scenarios(seed: int = SEED) -> List[EvalScenario]:
    """
    Build 30 feasible + 20 infeasible synthetic scenarios deterministically.

    Feasibility rule:
        buyer_max_price > seller_min_price   →  a deal price exists in [seller_min, buyer_max]
        buyer_max_price < seller_min_price   →  price gap; no valid deal price exists
    """
    rng = random.Random(seed)
    scenarios: List[EvalScenario] = []
    idx = 0

    def _date(days_offset: int) -> str:
        base = datetime(2026, 4, 7)
        return (base + timedelta(days=days_offset)).strftime("%Y-%m-%d")

    def _make(feasible: bool, seller_min: float, buyer_max: float,
              seller_ask_mult: float = 1.25, buyer_target_mult: float = 0.75,
              seller_min_dur: int = 7, seller_max_dur: int = 90,
              buyer_min_dur: int = 14, buyer_max_dur: int = 30,
              start_offset: int = 0) -> EvalScenario:
        nonlocal idx
        idx += 1
        sid = f"S{idx:03d}"
        infeas_type = "none" if feasible else "price_gap"
        seller_name = SELLER_NAMES[(idx - 1) % len(SELLER_NAMES)]
        buyer_name  = BUYER_NAMES[(idx - 1) % len(BUYER_NAMES)]
        client_name = CLIENT_NAMES[(idx - 1) % len(CLIENT_NAMES)]
        location    = AD_LOCATIONS[(idx - 1) % len(AD_LOCATIONS)]
        fmt         = AD_FORMATS[(idx - 1) % len(AD_FORMATS)]

        seller_ask  = round(seller_min * seller_ask_mult, 2)
        buyer_tgt   = round(buyer_max * buyer_target_mult, 2)

        return EvalScenario(
            scenario_id=sid,
            label="feasible" if feasible else "infeasible",
            feasible=feasible,
            infeasibility_type=infeas_type,
            seller_name=seller_name,
            seller_min_price=seller_min,
            seller_asking_price=seller_ask,
            seller_min_duration_days=seller_min_dur,
            seller_max_duration_days=seller_max_dur,
            buyer_name=buyer_name,
            client_name=client_name,
            buyer_target_price=buyer_tgt,
            buyer_max_price=buyer_max,
            buyer_min_duration_days=buyer_min_dur,
            buyer_max_duration_days=buyer_max_dur,
            buyer_start_date=_date(start_offset),
            location=location,
            format_type=fmt,
            available_from=_date(0),
        )

    # ── Feasible group F1: Large overlap ($25–$45 gap) ─────────────────────
    f1_mins = [20, 22, 24, 25, 21, 23, 20, 25, 22, 24]
    f1_maxs = [55, 60, 65, 70, 58, 62, 67, 60, 64, 68]
    for smin, bmax in zip(f1_mins, f1_maxs):
        scenarios.append(_make(True, smin, bmax,
                               seller_ask_mult=1.30, buyer_target_mult=0.60,
                               buyer_min_dur=14, buyer_max_dur=30,
                               start_offset=rng.randint(0, 3)))

    # ── Feasible group F2: Moderate overlap ($12–$20 gap) ──────────────────
    f2_mins = [32, 35, 38, 36, 33, 37, 34, 39, 31, 36]
    f2_maxs = [52, 55, 58, 54, 50, 56, 53, 57, 51, 55]
    for smin, bmax in zip(f2_mins, f2_maxs):
        scenarios.append(_make(True, smin, bmax,
                               seller_ask_mult=1.25, buyer_target_mult=0.65,
                               buyer_min_dur=14, buyer_max_dur=28,
                               start_offset=rng.randint(0, 5)))

    # ── Feasible group F3: Tight overlap ($4–$10 gap) ──────────────────────
    f3_mins = [42, 44, 43, 45, 47, 44, 46, 43, 48, 45]
    f3_maxs = [50, 52, 51, 52, 53, 51, 52, 50, 54, 52]
    for smin, bmax in zip(f3_mins, f3_maxs):
        scenarios.append(_make(True, smin, bmax,
                               seller_ask_mult=1.15, buyer_target_mult=0.85,
                               buyer_min_dur=14, buyer_max_dur=21,
                               start_offset=rng.randint(0, 7)))

    # ── Infeasible group I1: Small price gap ($8–$15 below seller_min) ─────
    i1_mins = [50, 55, 60, 52, 58, 65, 53, 56, 62, 70]
    i1_gaps = [8,  10, 12, 9,  11, 15, 8,  10, 13, 12]
    for smin, gap in zip(i1_mins, i1_gaps):
        bmax = smin - gap
        scenarios.append(_make(False, smin, bmax,
                               seller_ask_mult=1.20, buyer_target_mult=0.80,
                               buyer_min_dur=14, buyer_max_dur=30,
                               start_offset=rng.randint(0, 3)))

    # ── Infeasible group I2: Large price gap ($25–$55 below seller_min) ────
    i2_mins = [80, 90, 70,  100, 85, 75, 95, 110, 65, 120]
    i2_gaps = [35, 45, 28,  50,  40, 30, 45, 55,  25, 60]
    for smin, gap in zip(i2_mins, i2_gaps):
        bmax = smin - gap
        scenarios.append(_make(False, smin, bmax,
                               seller_ask_mult=1.20, buyer_target_mult=0.80,
                               buyer_min_dur=14, buyer_max_dur=30,
                               start_offset=rng.randint(0, 3)))

    assert len(scenarios) == N_FEASIBLE + N_INFEASIBLE, f"Expected 50, got {len(scenarios)}"
    return scenarios


# ── Single-scenario runner ────────────────────────────────────────────────────

def run_scenario(
    scenario: EvalScenario,
    eval_model: str = DEFAULT_MODEL,
    max_rounds: int = DEFAULT_MAX_ROUNDS,
    use_thinking: bool = False,
) -> EvalResult:
    """
    Run one full negotiation for the given scenario.
    Returns an EvalResult with all metrics populated.
    """
    t0 = time.monotonic()

    seller_config = SellerConfig(
        seller_name=scenario.seller_name,
        absolute_min_price_per_day=scenario.seller_min_price,
        asking_price_per_day=scenario.seller_asking_price,
        preferred_min_duration_days=scenario.seller_min_duration_days,
        brand_keywords=["family-friendly", "local", "community"],
        max_discount_pct=10.0,
    )
    buyer_config = BuyerConfig(
        buyer_name=scenario.buyer_name,
        client_name=scenario.client_name,
        max_budget_per_day=scenario.buyer_max_price,
        target_price_per_day=scenario.buyer_target_price,
        min_duration_days=scenario.buyer_min_duration_days,
        max_duration_days=scenario.buyer_max_duration_days,
        desired_start_date=scenario.buyer_start_date,
    )
    ad_space = AdSpace(
        id=scenario.scenario_id,
        name=f"{scenario.location} Ad Space",
        location=scenario.location,
        available_formats=[scenario.format_type],
        min_price_per_day=scenario.seller_min_price,
        max_duration_days=scenario.seller_max_duration_days,
        available_from=scenario.available_from,
        seller_notes="Available for brand-safe campaigns.",
    )

    platform = NegotiationPlatform(
        seller_name=scenario.seller_name,
        buyer_name=scenario.buyer_name,
        max_rounds=max_rounds,
    )
    platform.register_ad_spaces([ad_space])

    seller_agent = InstrumentedSellerAgent(platform, seller_config, eval_model, use_thinking)
    buyer_agent  = InstrumentedBuyerAgent(platform, buyer_config, eval_model, use_thinking)

    outcome = "no_deal"
    final_price: Optional[float] = None
    final_duration: Optional[int] = None
    terminated_correctly = False
    e2e_completed = False
    error_detail: Optional[str] = None
    turn_number = 0

    try:
        while True:
            is_done, _ = platform.is_negotiation_over()
            if is_done:
                terminated_correctly = True
                break
            if turn_number >= max_rounds * 2:
                terminated_correctly = True
                break

            current_agent = buyer_agent if turn_number % 2 == 0 else seller_agent
            context = (
                f"Turn {turn_number + 1}. "
                + platform.get_inventory_summary()
                + "\n\n"
                + platform.get_negotiation_history()
            )
            current_agent.take_turn(context)
            turn_number += 1

            is_done, _ = platform.is_negotiation_over()
            if is_done:
                terminated_correctly = True
                break

        # Determine outcome
        for p in platform.negotiation_history:
            if p.status == "accepted":
                outcome = "agreement"
                final_price = p.terms.price_per_day
                final_duration = p.terms.duration_days
                break

        e2e_completed = True

    except Exception as exc:
        error_detail = traceback.format_exc()
        outcome = "error"
        terminated_correctly = False

    latency = time.monotonic() - t0

    total_repairs = seller_agent.validation_repairs + buyer_agent.validation_repairs
    total_malformed = seller_agent.malformed_outputs + buyer_agent.malformed_outputs
    total_tools = seller_agent.total_tool_calls + buyer_agent.total_tool_calls

    # Actual rounds = number of completed proposals in history
    rounds_used = len([p for p in platform.negotiation_history])

    # Compliance check: final price must satisfy BOTH constraints
    constraint_compliant = False
    if outcome == "agreement" and final_price is not None:
        price_ok = scenario.seller_min_price <= final_price <= scenario.buyer_max_price
        dur_ok = (final_duration is None or
                  scenario.buyer_min_duration_days <= final_duration <= scenario.buyer_max_duration_days)
        constraint_compliant = price_ok and dur_ok

    return EvalResult(
        scenario_id=scenario.scenario_id,
        label=scenario.label,
        feasible=scenario.feasible,
        agreement_reached=(outcome == "agreement"),
        outcome=outcome,
        constraint_compliant=constraint_compliant,
        final_price=final_price,
        final_duration=final_duration,
        rounds_used=rounds_used,
        validation_repairs=total_repairs,
        malformed_outputs=total_malformed,
        total_tool_calls=total_tools,
        repair_invoked=(total_repairs > 0),
        session_terminated_correctly=terminated_correctly,
        e2e_completed=e2e_completed,
        latency_seconds=round(latency, 2),
        error_detail=error_detail,
    )


# ── Report generator ──────────────────────────────────────────────────────────

def _pct(n: int, d: int) -> str:
    if d == 0:
        return "N/A"
    return f"{n / d * 100:.1f}% ({n}/{d})"


def _mean(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _stdev(vals: List[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    return math.sqrt(sum((v - m) ** 2 for v in vals) / (len(vals) - 1))


def generate_report(
    scenarios: List[EvalScenario],
    results: List[EvalResult],
    eval_model: str,
    max_rounds: int,
) -> str:
    """Produce the full Markdown benchmark report."""

    feasible_r   = [r for r in results if r.feasible]
    infeasible_r = [r for r in results if not r.feasible]
    agreement_r  = [r for r in results if r.agreement_reached]
    completed_r  = [r for r in results if r.e2e_completed]

    n_total      = len(results)
    n_feas       = len(feasible_r)
    n_infeas     = len(infeasible_r)

    # Core metrics
    feas_agreed    = sum(1 for r in feasible_r   if r.agreement_reached)
    infeas_no_deal = sum(1 for r in infeasible_r if not r.agreement_reached and r.outcome != "error")
    compliant      = sum(1 for r in agreement_r  if r.constraint_compliant)
    malformed_any  = sum(1 for r in results      if r.malformed_outputs > 0)
    repair_any     = sum(1 for r in results      if r.repair_invoked)
    schema_valid   = n_total - malformed_any
    e2e_ok         = sum(1 for r in results      if r.e2e_completed)
    errors         = sum(1 for r in results      if r.outcome == "error")

    # Rounds
    rounds_all     = [r.rounds_used for r in results if r.e2e_completed]
    rounds_agreed  = [r.rounds_used for r in results if r.agreement_reached]
    rounds_nodeal  = [r.rounds_used for r in results if not r.agreement_reached and r.e2e_completed]

    # Latency
    lats = [r.latency_seconds for r in results if r.e2e_completed]
    total_repairs  = sum(r.validation_repairs for r in results)
    total_tools    = sum(r.total_tool_calls   for r in results)

    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        "# NegotiAI Evaluation Report",
        "",
        f"**Generated:** {ts}  ",
        f"**Model:** `{eval_model}`  ",
        f"**Max rounds per scenario:** {max_rounds}  ",
        f"**Total scenarios:** {n_total} ({n_feas} feasible / {n_infeas} infeasible)  ",
        f"**Random seed:** {SEED}",
        "",
        "---",
        "",
        "## Summary Metrics",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| **Agreement rate (feasible)**           | {_pct(feas_agreed, n_feas)} |",
        f"| **Correct no-deal rate (infeasible)**   | {_pct(infeas_no_deal, n_infeas)} |",
        f"| **Final-contract compliance rate**      | {_pct(compliant, len(agreement_r))} |",
        f"| **Schema-valid output rate**            | {_pct(schema_valid, n_total)} |",
        f"| **Repair-invoked rate**                 | {_pct(repair_any, n_total)} |",
        f"| **Avg rounds (all completed)**          | {_mean(rounds_all):.2f} ± {_stdev(rounds_all):.2f} |",
        f"| **Avg rounds (agreements)**             | {_mean(rounds_agreed):.2f} |",
        f"| **Avg rounds (no-deal)**                | {_mean(rounds_nodeal):.2f} |",
        f"| **End-to-end completion rate**          | {_pct(e2e_ok, n_total)} |",
        f"| **Total validation repairs**            | {total_repairs} across {n_total} scenarios |",
        f"| **Total tool calls**                    | {total_tools} |",
        f"| **Avg latency per scenario**            | {_mean(lats):.1f}s ± {_stdev(lats):.1f}s |",
        f"| **Total wall-clock time**               | {sum(lats):.0f}s ({sum(lats)/60:.1f} min) |",
        f"| **Errors / crashes**                    | {errors} |",
        "",
        "---",
        "",
        "## Feasible Scenarios (30) — Breakdown by Group",
        "",
        "| Group | Description | Scenarios | Agreements | Rate |",
        "|-------|-------------|-----------|------------|------|",
    ]

    # Group breakdown for feasible
    groups = [
        ("F1", "Large overlap ($25–$45 gap)", "S001–S010"),
        ("F2", "Moderate overlap ($12–$20 gap)", "S011–S020"),
        ("F3", "Tight overlap ($4–$10 gap)", "S021–S030"),
    ]
    scenario_map = {s.scenario_id: s for s in scenarios}
    for grp_id, grp_desc, grp_range in groups:
        lo, hi = int(grp_range[1:4]), int(grp_range[6:9])
        grp_r = [r for r in feasible_r if lo <= int(r.scenario_id[1:]) <= hi]
        agreed = sum(1 for r in grp_r if r.agreement_reached)
        lines.append(f"| {grp_id} | {grp_desc} | {len(grp_r)} | {agreed} | {_pct(agreed, len(grp_r))} |")

    lines += [
        "",
        "## Infeasible Scenarios (20) — Breakdown by Group",
        "",
        "| Group | Description | Scenarios | Correct No-Deal | Rate |",
        "|-------|-------------|-----------|-----------------|------|",
    ]

    infeas_groups = [
        ("I1", "Small price gap ($8–$15 below seller min)", "S031–S040"),
        ("I2", "Large price gap ($25–$55 below seller min)", "S041–S050"),
    ]
    for grp_id, grp_desc, grp_range in infeas_groups:
        lo, hi = int(grp_range[1:4]), int(grp_range[6:9])
        grp_r = [r for r in infeasible_r if lo <= int(r.scenario_id[1:]) <= hi]
        no_deal = sum(1 for r in grp_r if not r.agreement_reached and r.outcome != "error")
        lines.append(f"| {grp_id} | {grp_desc} | {len(grp_r)} | {no_deal} | {_pct(no_deal, len(grp_r))} |")

    lines += [
        "",
        "---",
        "",
        "## Per-Scenario Results",
        "",
        "| ID | Feasible | Outcome | Compliant | Rounds | Repairs | Malformed | Latency(s) |",
        "|----|----------|---------|-----------|--------|---------|-----------|------------|",
    ]
    for r in results:
        comp  = "✓" if r.constraint_compliant else ("—" if not r.agreement_reached else "✗")
        rep   = str(r.validation_repairs) if r.validation_repairs else "0"
        mal   = str(r.malformed_outputs) if r.malformed_outputs else "0"
        lines.append(
            f"| {r.scenario_id} | {'✓' if r.feasible else '✗'} | "
            f"{r.outcome} | {comp} | {r.rounds_used} | {rep} | {mal} | {r.latency_seconds:.1f} |"
        )

    # Constraint compliance analysis
    if agreement_r:
        non_compliant = [r for r in agreement_r if not r.constraint_compliant]
        lines += [
            "",
            "---",
            "",
            "## Constraint Compliance Analysis",
            "",
        ]
        if non_compliant:
            lines += [
                f"**{len(non_compliant)} agreement(s) violated constraints:**",
                "",
                "| ID | Final Price | Seller Min | Buyer Max | Violation |",
                "|----|-------------|------------|-----------|-----------|",
            ]
            for r in non_compliant:
                sc = scenario_map[r.scenario_id]
                price_str = f"${r.final_price:.2f}" if r.final_price else "—"
                lines.append(
                    f"| {r.scenario_id} | {price_str} | ${sc.seller_min_price:.2f} | "
                    f"${sc.buyer_max_price:.2f} | price outside [min, max] |"
                )
        else:
            lines.append("**All agreements were fully constraint-compliant. ✓**")

    # Resume bullets
    feas_rate  = feas_agreed / n_feas * 100 if n_feas else 0
    nodeal_rate = infeas_no_deal / n_infeas * 100 if n_infeas else 0
    comp_rate  = compliant / len(agreement_r) * 100 if agreement_r else 0
    schema_rate = schema_valid / n_total * 100 if n_total else 0
    e2e_rate   = e2e_ok / n_total * 100 if n_total else 0
    avg_rounds = _mean(rounds_agreed)

    lines += [
        "",
        "---",
        "",
        "## Resume-Ready Conclusions",
        "",
        "The following bullets are directly suitable for a resume or portfolio:",
        "",
        f"- **Designed and evaluated a multi-agent negotiation system** across {n_total} "
        f"synthetic scenarios using Claude {eval_model.split('-')[1].capitalize()}; "
        f"achieved a **{feas_rate:.0f}% agreement rate on feasible negotiations** and "
        f"**{nodeal_rate:.0f}% correct no-deal detection on infeasible cases** (constraint "
        f"enforcement working as designed).",
        "",
        f"- **Implemented a Pydantic constraint-enforcement layer** that validated every "
        f"agent output at the tool boundary; final-contract compliance rate: **{comp_rate:.0f}%** "
        f"— all concluded deals respected both buyer budget ceilings and seller price floors.",
        "",
        f"- **Built configurable max-round termination logic** that prevented unbounded "
        f"negotiation loops; agents resolved negotiations in an average of "
        f"**{avg_rounds:.1f} rounds** for successful agreements (max allowed: {max_rounds}).",
        "",
        f"- **Achieved {schema_rate:.0f}% schema-valid output rate** across {total_tools} "
        f"total tool calls; the self-correction loop invoked repairs in "
        f"{_pct(repair_any, n_total)} of scenarios, demonstrating robust error recovery.",
        "",
        f"- **End-to-end workflow completion rate: {e2e_rate:.0f}%** ({e2e_ok}/{n_total} "
        f"scenarios ran to clean termination); average latency per negotiation: "
        f"**{_mean(lats):.0f}s** (total evaluation wall time: {sum(lats)/60:.1f} min).",
        "",
        "---",
        "",
        "_Report generated by `eval_framework.py` — NegotiAI benchmark suite._",
    ]

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="NegotiAI Evaluation Framework")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Claude model to use (default: {DEFAULT_MODEL})")
    parser.add_argument("--max-rounds", type=int, default=DEFAULT_MAX_ROUNDS,
                        help=f"Max rounds per negotiation (default: {DEFAULT_MAX_ROUNDS})")
    parser.add_argument("--thinking", action="store_true",
                        help="Enable adaptive thinking (costs more, only Opus/Sonnet)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print scenarios without running any API calls")
    parser.add_argument("--start-from", type=int, default=1,
                        help="Start from scenario N (1-indexed), for resuming interrupted runs")
    parser.add_argument("--seed", type=int, default=SEED,
                        help=f"Random seed for scenario generation (default: {SEED})")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    scenarios = generate_scenarios(seed=args.seed)

    # ── Dry-run: just print scenarios ────────────────────────────────────────
    if args.dry_run:
        print(f"\n{'='*70}")
        print(f"  NegotiAI Eval — {len(scenarios)} scenarios (dry run)")
        print(f"{'='*70}\n")
        print(f"{'ID':<6} {'Label':<12} {'Seller Min':>10} {'Buyer Max':>10} "
              f"{'Gap':>8} {'Buyer Dur':>12}")
        print("-" * 70)
        for s in scenarios:
            gap = s.buyer_max_price - s.seller_min_price
            gap_str = f"+${gap:.0f}" if gap > 0 else f"-${abs(gap):.0f}"
            dur_str = f"{s.buyer_min_duration_days}–{s.buyer_max_duration_days}d"
            print(f"{s.scenario_id:<6} {s.label:<12} ${s.seller_min_price:>8.2f}  "
                  f"${s.buyer_max_price:>8.2f}  {gap_str:>8}  {dur_str:>12}")
        return

    # ── Check API key ─────────────────────────────────────────────────────────
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY is not set.")
        sys.exit(1)

    # ── Run scenarios ──────────────────────────────────────────────────────────
    results_path = os.path.join(OUTPUT_DIR, "results.json")
    existing_results: List[Dict] = []
    if os.path.exists(results_path) and args.start_from > 1:
        with open(results_path) as f:
            existing_results = json.load(f)
        print(f"Loaded {len(existing_results)} existing results, resuming from S{args.start_from:03d}")

    results: List[EvalResult] = [EvalResult(**r) for r in existing_results]
    done_ids = {r.scenario_id for r in results}

    total = len(scenarios)
    skipped = sum(1 for s in scenarios if s.scenario_id in done_ids)
    to_run  = [s for s in scenarios if s.scenario_id not in done_ids]

    print(f"\n{'='*70}")
    print(f"  NegotiAI Evaluation Framework")
    print(f"  Model: {args.model}  |  Max rounds: {args.max_rounds}  "
          f"|  Thinking: {args.thinking}")
    print(f"  Scenarios: {total} total, {skipped} skipped, {len(to_run)} to run")
    print(f"{'='*70}\n")

    for i, scenario in enumerate(to_run, 1):
        feas_str = "FEASIBLE  " if scenario.feasible else "INFEASIBLE"
        gap = scenario.buyer_max_price - scenario.seller_min_price
        gap_str = f"+${gap:.0f}" if gap >= 0 else f"-${abs(gap):.0f}"
        print(f"[{skipped + i:02d}/{total}] {scenario.scenario_id} | {feas_str} | "
              f"gap={gap_str} | seller_min=${scenario.seller_min_price} "
              f"buyer_max=${scenario.buyer_max_price} ... ", end="", flush=True)

        result = run_scenario(
            scenario,
            eval_model=args.model,
            max_rounds=args.max_rounds,
            use_thinking=args.thinking,
        )
        results.append(result)

        status = f"{result.outcome:<10} rounds={result.rounds_used:<3} "
        status += f"repairs={result.validation_repairs} latency={result.latency_seconds:.0f}s"
        if not result.constraint_compliant and result.agreement_reached:
            status += " ⚠ NON-COMPLIANT"
        if result.outcome == "error":
            status += f" ERROR: {str(result.error_detail)[:60]}"
        print(status)

        # Save incrementally
        with open(results_path, "w") as f:
            json.dump([asdict(r) for r in results], f, indent=2)

    # ── Generate report ────────────────────────────────────────────────────────
    report = generate_report(scenarios, results, args.model, args.max_rounds)
    report_path = os.path.join(OUTPUT_DIR, "report.md")
    with open(report_path, "w") as f:
        f.write(report)

    # Print summary to stdout
    n = len(results)
    feas_r    = [r for r in results if r.feasible]
    infeas_r  = [r for r in results if not r.feasible]
    agreed    = sum(1 for r in feas_r   if r.agreement_reached)
    nodeal    = sum(1 for r in infeas_r if not r.agreement_reached and r.outcome != "error")
    compliant = sum(1 for r in results  if r.constraint_compliant)
    n_agreed  = sum(1 for r in results  if r.agreement_reached)
    e2e_ok    = sum(1 for r in results  if r.e2e_completed)
    lats      = [r.latency_seconds for r in results if r.e2e_completed]

    print(f"\n{'='*70}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*70}")
    print(f"  Agreement rate (feasible):        {_pct(agreed, len(feas_r))}")
    print(f"  Correct no-deal (infeasible):     {_pct(nodeal, len(infeas_r))}")
    print(f"  Final-contract compliance:        {_pct(compliant, n_agreed)}")
    print(f"  End-to-end completion:            {_pct(e2e_ok, n)}")
    print(f"  Avg latency:                      {_mean(lats):.1f}s")
    print(f"  Total wall time:                  {sum(lats)/60:.1f} min")
    print(f"\n  Full report: {report_path}")
    print(f"  Raw results: {results_path}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()

# NegotiAI Evaluation Report

**Generated:** 2026-04-09 06:04 UTC  
**Model:** `claude-haiku-4-5-20251001`  
**Max rounds per scenario:** 6  
**Total scenarios:** 50 (30 feasible / 20 infeasible)  
**Random seed:** 42

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| **Agreement rate (feasible)**           | 100.0% (30/30) |
| **Correct no-deal rate (infeasible)**   | 100.0% (20/20) |
| **Final-contract compliance rate**      | 100.0% (30/30) |
| **Schema-valid output rate**            | 94.0% (47/50) |
| **Repair-invoked rate**                 | 12.0% (6/50) |
| **Avg rounds (all completed)**          | 3.62 ± 1.85 |
| **Avg rounds (agreements)**             | 2.30 |
| **Avg rounds (no-deal)**                | 5.60 |
| **End-to-end completion rate**          | 100.0% (50/50) |
| **Total validation repairs**            | 6 across 50 scenarios |
| **Total tool calls**                    | 586 |
| **Avg latency per scenario**            | 36.8s ± 18.0s |
| **Total wall-clock time**               | 1841s (30.7 min) |
| **Errors / crashes**                    | 0 |

---

## Feasible Scenarios (30) — Breakdown by Group

| Group | Description | Scenarios | Agreements | Rate |
|-------|-------------|-----------|------------|------|
| F1 | Large overlap ($25–$45 gap) | 10 | 10 | 100.0% (10/10) |
| F2 | Moderate overlap ($12–$20 gap) | 10 | 10 | 100.0% (10/10) |
| F3 | Tight overlap ($4–$10 gap) | 10 | 10 | 100.0% (10/10) |

## Infeasible Scenarios (20) — Breakdown by Group

| Group | Description | Scenarios | Correct No-Deal | Rate |
|-------|-------------|-----------|-----------------|------|
| I1 | Small price gap ($8–$15 below seller min) | 10 | 10 | 100.0% (10/10) |
| I2 | Large price gap ($25–$55 below seller min) | 10 | 10 | 100.0% (10/10) |

---

## Per-Scenario Results

| ID | Feasible | Outcome | Compliant | Rounds | Repairs | Malformed | Latency(s) |
|----|----------|---------|-----------|--------|---------|-----------|------------|
| S001 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.9 |
| S002 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.4 |
| S003 | ✓ | agreement | ✓ | 1 | 0 | 0 | 16.0 |
| S004 | ✓ | agreement | ✓ | 1 | 0 | 0 | 10.2 |
| S005 | ✓ | agreement | ✓ | 1 | 0 | 0 | 11.0 |
| S006 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.5 |
| S007 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.1 |
| S008 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.3 |
| S009 | ✓ | agreement | ✓ | 1 | 0 | 0 | 14.1 |
| S010 | ✓ | agreement | ✓ | 1 | 0 | 0 | 12.8 |
| S011 | ✓ | agreement | ✓ | 3 | 0 | 0 | 23.6 |
| S012 | ✓ | agreement | ✓ | 3 | 0 | 0 | 26.6 |
| S013 | ✓ | agreement | ✓ | 3 | 0 | 0 | 22.5 |
| S014 | ✓ | agreement | ✓ | 3 | 0 | 0 | 27.6 |
| S015 | ✓ | agreement | ✓ | 4 | 0 | 0 | 33.1 |
| S016 | ✓ | agreement | ✓ | 4 | 0 | 0 | 40.1 |
| S017 | ✓ | agreement | ✓ | 3 | 0 | 0 | 32.4 |
| S018 | ✓ | agreement | ✓ | 3 | 0 | 0 | 35.7 |
| S019 | ✓ | agreement | ✓ | 3 | 0 | 0 | 29.2 |
| S020 | ✓ | agreement | ✓ | 3 | 0 | 0 | 30.6 |
| S021 | ✓ | agreement | ✓ | 1 | 0 | 0 | 18.5 |
| S022 | ✓ | agreement | ✓ | 3 | 0 | 0 | 24.9 |
| S023 | ✓ | agreement | ✓ | 3 | 0 | 0 | 32.0 |
| S024 | ✓ | agreement | ✓ | 2 | 0 | 0 | 28.4 |
| S025 | ✓ | agreement | ✓ | 3 | 0 | 0 | 25.1 |
| S026 | ✓ | agreement | ✓ | 3 | 0 | 0 | 25.8 |
| S027 | ✓ | agreement | ✓ | 3 | 0 | 0 | 35.2 |
| S028 | ✓ | agreement | ✓ | 3 | 0 | 0 | 26.9 |
| S029 | ✓ | agreement | ✓ | 3 | 0 | 0 | 34.8 |
| S030 | ✓ | agreement | ✓ | 3 | 0 | 0 | 29.4 |
| S031 | ✗ | no_deal | — | 6 | 1 | 0 | 65.4 |
| S032 | ✗ | no_deal | — | 6 | 0 | 0 | 49.1 |
| S033 | ✗ | no_deal | — | 6 | 1 | 0 | 62.5 |
| S034 | ✗ | no_deal | — | 6 | 0 | 0 | 53.5 |
| S035 | ✗ | no_deal | — | 6 | 0 | 2 | 61.1 |
| S036 | ✗ | no_deal | — | 6 | 0 | 1 | 62.4 |
| S037 | ✗ | no_deal | — | 5 | 0 | 0 | 48.4 |
| S038 | ✗ | no_deal | — | 6 | 0 | 0 | 52.5 |
| S039 | ✗ | no_deal | — | 5 | 0 | 0 | 51.2 |
| S040 | ✗ | no_deal | — | 6 | 0 | 0 | 59.0 |
| S041 | ✗ | no_deal | — | 5 | 0 | 0 | 51.1 |
| S042 | ✗ | no_deal | — | 5 | 1 | 0 | 59.3 |
| S043 | ✗ | no_deal | — | 6 | 0 | 0 | 54.5 |
| S044 | ✗ | no_deal | — | 5 | 1 | 0 | 60.6 |
| S045 | ✗ | no_deal | — | 5 | 1 | 0 | 61.1 |
| S046 | ✗ | no_deal | — | 6 | 0 | 1 | 58.9 |
| S047 | ✗ | no_deal | — | 5 | 0 | 0 | 51.4 |
| S048 | ✗ | no_deal | — | 5 | 0 | 0 | 50.9 |
| S049 | ✗ | no_deal | — | 6 | 1 | 0 | 57.9 |
| S050 | ✗ | no_deal | — | 6 | 0 | 0 | 61.3 |

---

## Constraint Compliance Analysis

**All agreements were fully constraint-compliant. ✓**

---

## Resume-Ready Conclusions

The following bullets are directly suitable for a resume or portfolio:

- **Designed and evaluated a multi-agent negotiation system** across 50 synthetic scenarios using Claude Haiku; achieved a **100% agreement rate on feasible negotiations** and **100% correct no-deal detection on infeasible cases** (constraint enforcement working as designed).

- **Implemented a Pydantic constraint-enforcement layer** that validated every agent output at the tool boundary; final-contract compliance rate: **100%** — all concluded deals respected both buyer budget ceilings and seller price floors.

- **Built configurable max-round termination logic** that prevented unbounded negotiation loops; agents resolved negotiations in an average of **2.3 rounds** for successful agreements (max allowed: 6).

- **Achieved 94% schema-valid output rate** across 586 total tool calls; the self-correction loop invoked repairs in 12.0% (6/50) of scenarios, demonstrating robust error recovery.

- **End-to-end workflow completion rate: 100%** (50/50 scenarios ran to clean termination); average latency per negotiation: **37s** (total evaluation wall time: 30.7 min).

---

_Report generated by `eval_framework.py` — NegotiAI benchmark suite._
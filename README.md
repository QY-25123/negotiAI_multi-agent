# NegotiAI — AI-Powered Event Sponsorship Deal Platform

NegotiAI is a full-stack multi-agent system where two autonomous Claude-powered AI agents negotiate event sponsorship deals in real time. An **Organizer agent** (event host) and a **Sponsor agent** (company buyer) exchange proposals, counter-offers, and acceptances on a shared negotiation platform — while a human reviewer can approve, override, or restart any deal before it is finalized.

---

## How It Works

```
Sponsor browses marketplace
        ↓
Sponsor initiates deal (sets budget + duration)
        ↓
SponsorAgent & OrganizerAgent run in alternating turns
   ├── Each agent calls tools: view_packages, view_deal_history,
   │   submit_proposal / respond_to_proposal
   ├── ZOPA pre-check: if budgets can't overlap → instant no_deal
   ├── Dynamic pressure: round warnings + price-gap hints injected each turn
   └── Agents converge until one accepts or max rounds hit
        ↓
Deal pauses for Human-in-the-Loop review
   ├── Approve  → contract created, PDF available
   └── Renegotiate → override constraints, restart agents
        ↓
Signed contract stored; frontend shows final terms
```

Live negotiation turns stream to the browser via **Server-Sent Events (SSE)** — every proposal, counter, and accept appears in real time.

---

## Architecture

```
agent_to_agent/
├── backend/                    # FastAPI application (Python)
│   ├── main.py                 # App entry point, CORS, lifespan
│   ├── agents.py               # OrganizerAgent & SponsorAgent (Claude claude-opus-4-6)
│   ├── negotiation_platform.py # Shared message-board: proposals, history, contract gen
│   ├── models.py               # Pure-Python dataclasses: Package, Term, Proposal, Contract
│   ├── database.py             # SQLAlchemy ORM: Company, Listing, Negotiation, Contract
│   ├── validators.py           # Input guards for both agent tool calls
│   ├── seed_data.py            # Realistic seed: companies, listings, completed deals
│   ├── routers/
│   │   ├── auth.py             # JWT register / login
│   │   ├── companies.py        # Company CRUD
│   │   ├── listings.py         # Sponsorship listing CRUD
│   │   ├── negotiations.py     # Start, stream (SSE), review, list, detail
│   │   ├── contracts.py        # Contract fetch + PDF download
│   │   └── stats.py            # Dashboard aggregates
│   └── services/
│       ├── negotiation_runner.py  # Async driver: runs agent turns, flushes DB, pushes SSE
│       ├── agent_bridge.py        # Builds agent configs from DB listing terms
│       └── pdf_generator.py       # ReportLab PDF contract generator
├── frontend/                   # Next.js 14 application (TypeScript)
│   ├── app/
│   │   ├── dashboard/          # Stats overview
│   │   ├── marketplace/        # Browse & filter sponsorship listings
│   │   ├── negotiations/       # List + live detail with SSE replay
│   │   ├── companies/          # Company profiles
│   │   ├── admin/              # Seed & admin utilities
│   │   ├── login/ register/    # Auth flows
│   │   └── settings/           # Account settings
│   ├── components/             # Shared UI components (shadcn/ui + Tailwind)
│   ├── context/                # Auth context provider
│   └── hooks/                  # React Query data hooks
├── docker-compose.yml          # Backend (8000) + Frontend (3000) + db_data volume
├── .env.example                # Environment variable template
└── README.md
```

---

## AI Agents

Both agents are implemented in `backend/agents.py` using the **Anthropic Python SDK** with `claude-opus-4-6` and **adaptive thinking** (`thinking: {type: "adaptive"}`). Each runs a manual tool-use loop: it calls tools, receives results, and continues until `stop_reason == "end_turn"`.

### OrganizerAgent (event host / seller)

Represents the event organizer protecting their funding floor.

| Config field | Description |
|---|---|
| `absolute_min_price_per_day` | Hard floor — agent will never go below this |
| `asking_price_per_day` | Opening price (defaults to 120% of floor) |
| `max_discount_pct` | Max discount the organizer will offer (default 10%) |
| `preferred_min_duration_days` | Minimum sponsorship length |
| `audience_size` | Injected into system prompt for context |

**Tools available to the Organizer:**
- `view_packages` — see all sponsorship packages and their details
- `view_deal_history` — inspect every proposal exchanged so far
- `respond_to_proposal` — accept, reject, or counter an incoming proposal
- `make_initial_proposal` — submit the opening offer if organizer goes first

### SponsorAgent (company buyer)

Represents the sponsoring company seeking the best deal within budget.

| Config field | Description |
|---|---|
| `max_budget_per_day` | Hard ceiling — agent never exceeds this |
| `target_price_per_day` | Opening offer (defaults to 70% of ceiling) |
| `preferred_tiers` | Desired sponsorship tiers (e.g. "Gold Sponsor") |
| `min/max_duration_days` | Acceptable duration range |
| `desired_start_date` | Preferred event start |

**Tools available to the Sponsor:**
- `view_packages` — browse available sponsorship opportunities
- `view_deal_history` — review negotiation history
- `submit_proposal` — make an opening bid
- `accept_proposal` — accept the organizer's pending offer
- `counter_proposal` — counter with revised terms

### Negotiation dynamics

Each agent turn receives a **context string** that includes:
- Round number and max rounds
- A **pressure message** that escalates as rounds run out ("FINAL ROUND — make a concession now")
- A **price-gap summary** showing the distance between the two sides' latest offers
- Full package inventory and deal history

A **ZOPA pre-check** runs before agents start: if the sponsor's ceiling is below the organizer's floor, the negotiation ends immediately with `no_deal` and an explanatory message — no API calls wasted.

---

## Human-in-the-Loop Review

When agents reach an agreement, the negotiation pauses in `pending_review` state rather than immediately finalizing. A human reviewer can:

- **Approve** — creates a signed contract and calculates total deal value
- **Renegotiate** — override constraints (new price bounds, extra rounds) and restart the agent loop from scratch with the same listing

This flow is driven by `POST /api/v1/negotiations/{id}/review` with `action: "approve"` or `action: "renegotiate"`.

---

## API Reference

Base URL: `http://localhost:8000`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create user + company |
| POST | `/api/v1/auth/login` | Returns JWT token |

### Companies
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/companies` | List all companies |
| GET | `/api/v1/companies/{id}` | Company detail |
| POST | `/api/v1/companies` | Create company |

### Listings (Sponsorship Packages)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/listings` | Browse listings (filter by `service_type`, `company_id`, `status`) |
| GET | `/api/v1/listings/{id}` | Listing detail |
| POST | `/api/v1/listings` | Create listing |

### Negotiations
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/negotiations` | Start a new AI negotiation |
| GET | `/api/v1/negotiations` | List negotiations (filter by `status`, `service_type`) |
| GET | `/api/v1/negotiations/{id}` | Full negotiation detail with messages |
| GET | `/api/v1/negotiations/{id}/stream` | **SSE stream** — live events or replay |
| POST | `/api/v1/negotiations/{id}/review` | Human approve or renegotiate |

### Contracts
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/contracts` | List all contracts |
| GET | `/api/v1/contracts/{id}` | Contract detail |
| GET | `/api/v1/contracts/{id}/pdf` | Download signed contract as PDF |

### Starting a Negotiation

```json
POST /api/v1/negotiations
{
  "listing_id": "abc-123",
  "buyer_company_id": "co-002",
  "max_budget_per_unit": 1200.0,
  "target_price_per_unit": 800.0,
  "preferred_duration_days": 3,
  "start_date": "2026-09-01",
  "max_rounds": 10
}
```

The system automatically detects whether the listing belongs to an organizer or sponsor and swaps roles accordingly (a sponsor listing means the organizer initiates against it).

### SSE Event Types

Connect to `GET /api/v1/negotiations/{id}/stream` to receive:

| Event type | Payload |
|---|---|
| `thinking` | `{ party: "buyer" | "seller" }` — agent is computing |
| `message` | `{ round, from_party, action, message, price_per_unit, duration_days, terms_json }` |
| `pending_review` | `{ terms, proposed_value }` — deal agreed, awaiting human |
| `complete` | `{ outcome, contract_id }` — deal done or no_deal |
| `error` | `{ detail }` — negotiation failed |

---

## Database Schema

| Table | Key columns |
|---|---|
| `users` | id, email, hashed_password, company_id |
| `companies` | id, name, type (`organizer`/`sponsor`/`both`), industry |
| `service_listings` | id, company_id, service_type, title, terms_json, min/max_price, location |
| `negotiations` | id, seller/buyer company ids, listing_id, status, outcome, round_count, pending_terms_json |
| `negotiation_messages` | id, negotiation_id, round_number, from_party, action, price_per_unit, terms_json |
| `contracts` | id, negotiation_id, listing_title, terms_json, total_value |

The `terms_json` column on `service_listings` is the primary config source for agent constraints. Recognized fields:

```json
{
  "min_price_per_day": 500,
  "max_price_per_day": 1500,
  "min_duration_days": 1,
  "max_duration_days": 5,
  "available_from": "2026-09-01",
  "audience_size": 5000,
  "available_tiers": ["Gold Sponsor", "Title Sponsor"],
  "perks": ["logo placement", "booth space", "social media mentions"],
  "notes": "Annual tech conference in downtown SF"
}
```

---

## Setup & Running

### Prerequisites

- Docker & Docker Compose
- An [Anthropic API key](https://console.anthropic.com)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DATABASE_URL=...   (optional — defaults to local SQLite)
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

The backend seeds the database with sample companies, listings, and completed negotiations on first boot.

### 3. Local development (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Deployment

### Backend (Docker / AWS / any container host)

Set these environment variables on your host:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `DATABASE_URL` | No | PostgreSQL connection string (defaults to SQLite) |
| `CORS_ORIGINS` | No | Comma-separated allowed frontend origins |
| `LOCAL_JWT_SECRET` | No | Secret for signing JWTs (generate with `openssl rand -hex 32`) |

For Supabase PostgreSQL, use the **Transaction Pooler** URL (port 6543, host `*.pooler.supabase.com`) — not the direct connection URL.

### Frontend (Vercel)

Set in the Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

The backend is pre-configured to allow any `*.vercel.app` origin via `allow_origin_regex`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI agents | Anthropic Claude claude-opus-4-6 (adaptive thinking + tool use) |
| Backend | FastAPI, SQLAlchemy 2.x, SSE-Starlette, Pydantic v2 |
| Database | SQLite (dev) / PostgreSQL via Supabase (prod) |
| Auth | JWT (python-jose + bcrypt) |
| PDF generation | ReportLab |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Data fetching | TanStack Query (React Query v5) |
| Animations | Framer Motion |
| Charts | Recharts |
| Deployment | Docker Compose, Vercel (frontend), any container host (backend) |

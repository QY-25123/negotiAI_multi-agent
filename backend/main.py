"""
NegotiAI FastAPI application entry point.
"""

import os
import time
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load project-level .env before anything else imports env vars
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import create_tables, migrate_db, get_session  # noqa: E402
from routers import auth, companies, contracts, listings, negotiations, stats  # noqa: E402

log = logging.getLogger("negotiai")


def _init_db(retries: int = 5, delay: float = 3.0) -> None:
    """
    Attempt to connect, create tables, and seed — with retries.
    Gives a clear error message if using the wrong Supabase URL type.
    """
    for attempt in range(1, retries + 1):
        try:
            create_tables()
            migrate_db()
            return
        except Exception as exc:
            msg = str(exc)
            if attempt == retries:
                # Surface a helpful hint for the most common Supabase mistake
                if "Network is unreachable" in msg or "could not connect" in msg.lower():
                    raise RuntimeError(
                        "Cannot reach the database.\n"
                        "If using Supabase, make sure DATABASE_URL uses the "
                        "Transaction Pooler URL (port 6543, host *.pooler.supabase.com), "
                        "NOT the direct connection URL (port 5432, host db.*.supabase.co).\n"
                        f"Original error: {exc}"
                    ) from exc
                raise
            log.warning("DB init attempt %d/%d failed: %s — retrying in %.0fs…", attempt, retries, exc, delay)
            time.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    yield

app = FastAPI(
    title="NegotiAI API",
    version="1.0.0",
    lifespan=lifespan,
)

# Local dev origins
_cors_origins = [
    "http://localhost:3000",
    "http://frontend:3000",
]

# Production origins from env, comma-separated
_extra = os.environ.get("CORS_ORIGINS", "")
if _extra:
    _cors_origins.extend(
        o.strip() for o in _extra.split(",") if o.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Include all routers
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(contracts.router)
app.include_router(listings.router)
app.include_router(negotiations.router)
app.include_router(stats.router)

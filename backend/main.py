"""
NegotiAI FastAPI application entry point.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load project-level .env before anything else imports env vars
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import create_tables, get_session  # noqa: E402
from seed_data import seed_if_empty  # noqa: E402
from routers import companies, contracts, listings, negotiations, stats  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    with get_session() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="NegotiAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Include all routers
app.include_router(companies.router)
app.include_router(contracts.router)
app.include_router(listings.router)
app.include_router(negotiations.router)
app.include_router(stats.router)

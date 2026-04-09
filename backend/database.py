"""
SQLAlchemy 2.x database setup for the NegotiAI platform.
Uses DeclarativeBase with mapped_column / Mapped typed annotations.
"""

import os
from contextlib import contextmanager
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse
from uuid import uuid4

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.engine import URL as SAUrl
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)


def _build_engine():
    raw = os.environ.get("DATABASE_URL", "sqlite:///./negotiations.db")

    # SQLite — simple path, no pool needed
    if raw.startswith("sqlite"):
        return create_engine(raw, connect_args={"check_same_thread": False})

    # PostgreSQL — normalise the scheme first (Supabase ships "postgres://")
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)

    # Parse with Python's urlparse which correctly handles "@" inside passwords
    # by splitting on the LAST "@" (rpartition behaviour).
    parsed = urlparse(raw)

    # Reconstruct via SQLAlchemy URL.create() so special characters in the
    # password (e.g. "@", "#", "%") are properly encoded — this avoids the
    # "could not translate host name" crash when passwords contain "@".
    sa_url = SAUrl.create(
        drivername="postgresql+psycopg2",
        username=parsed.username,
        password=parsed.password,   # plain string; SQLAlchemy encodes it
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path.lstrip("/"),
    )

    return create_engine(
        sa_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,   # drop stale connections automatically
        pool_recycle=300,     # recycle every 5 min (avoids Supabase idle timeout)
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # "seller", "buyer", "both"
    industry: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    avatar_color: Mapped[str] = mapped_column(String, default="#6366f1")
    logo_initials: Mapped[str] = mapped_column(String, default="")
    website: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    listings: Mapped[List["ServiceListing"]] = relationship(back_populates="company")
    seller_negotiations: Mapped[List["Negotiation"]] = relationship(
        foreign_keys="Negotiation.seller_company_id",
        back_populates="seller_company",
    )
    buyer_negotiations: Mapped[List["Negotiation"]] = relationship(
        foreign_keys="Negotiation.buyer_company_id",
        back_populates="buyer_company",
    )


class ServiceListing(Base):
    __tablename__ = "service_listings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    service_type: Mapped[str] = mapped_column(String, nullable=False)  # "advertising", "staffing", "sponsorship"
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    terms_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    min_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")  # "active", "closed"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="listings")
    negotiations: Mapped[List["Negotiation"]] = relationship(back_populates="listing")


class Negotiation(Base):
    __tablename__ = "negotiations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    seller_company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    buyer_company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    listing_id: Mapped[str] = mapped_column(String, ForeignKey("service_listings.id"), nullable=False)
    service_type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")  # "active", "pending_review", "completed", "failed"
    outcome: Mapped[str] = mapped_column(String, default="in_progress")  # "agreement", "no_deal", "pending_review", "in_progress"
    failure_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # why no deal was reached
    max_rounds: Mapped[int] = mapped_column(Integer, default=10)  # configurable limit per negotiation
    round_count: Mapped[int] = mapped_column(Integer, default=0)
    final_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # Human-in-the-loop fields
    buyer_config_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)          # original buyer constraints
    pending_terms_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)         # agreed terms awaiting review
    override_constraints_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # human-supplied overrides

    # Relationships
    seller_company: Mapped["Company"] = relationship(
        foreign_keys=[seller_company_id],
        back_populates="seller_negotiations",
    )
    buyer_company: Mapped["Company"] = relationship(
        foreign_keys=[buyer_company_id],
        back_populates="buyer_negotiations",
    )
    listing: Mapped["ServiceListing"] = relationship(back_populates="negotiations")
    messages: Mapped[List["NegotiationMessage"]] = relationship(
        back_populates="negotiation",
        order_by="NegotiationMessage.round_number",
    )
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="negotiation",
        uselist=False,
    )


class NegotiationMessage(Base):
    __tablename__ = "negotiation_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    negotiation_id: Mapped[str] = mapped_column(String, ForeignKey("negotiations.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    from_party: Mapped[str] = mapped_column(String, nullable=False)  # "buyer" or "seller"
    action: Mapped[str] = mapped_column(String, nullable=False)  # "proposal", "counter", "accept", "reject"
    price_per_unit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    format_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    terms_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    negotiation: Mapped["Negotiation"] = relationship(back_populates="messages")


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    negotiation_id: Mapped[str] = mapped_column(String, ForeignKey("negotiations.id"), nullable=False, unique=True)
    seller_company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    buyer_company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    listing_title: Mapped[str] = mapped_column(String, nullable=False)
    terms_json: Mapped[str] = mapped_column(Text, nullable=False)
    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    negotiation: Mapped["Negotiation"] = relationship(back_populates="contract")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_db():
    """FastAPI dependency that yields a SQLAlchemy Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_session():
    """Context-manager version used in lifespan / scripts."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables (idempotent)."""
    Base.metadata.create_all(bind=engine)


def migrate_db():
    """Add any missing columns for new features (idempotent, SQLite + PostgreSQL safe)."""
    from sqlalchemy import inspect as sa_inspect, text

    try:
        inspector = sa_inspect(engine)
        existing = {c["name"] for c in inspector.get_columns("negotiations")}
    except Exception:
        return  # Table doesn't exist yet; create_tables() will build it fresh

    new_columns = {
        "buyer_config_json": "TEXT",
        "pending_terms_json": "TEXT",
        "override_constraints_json": "TEXT",
    }
    with engine.connect() as conn:
        for col, col_type in new_columns.items():
            if col not in existing:
                try:
                    conn.execute(text(f"ALTER TABLE negotiations ADD COLUMN {col} {col_type}"))
                    conn.commit()
                except Exception:
                    conn.rollback()  # column already exists in concurrent scenario

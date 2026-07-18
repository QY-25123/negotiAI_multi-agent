"""
Auth router — register, login, me.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt as _bcrypt_lib
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Company, User, get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_SECRET = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
_ALGO = "HS256"
_EXPIRE_HOURS = 24 * 7
_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: str
    password: str
    company_name: str
    company_type: str  # "organizer" | "sponsor" | "both"
    industry: str
    description: str = ""
    avatar_color: str = "#6366f1"
    website: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class CompanyOut(BaseModel):
    id: str
    name: str
    type: str
    industry: str
    avatar_color: str
    logo_initials: str


class UserOut(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    company: CompanyOut


class MeResponse(BaseModel):
    user: UserOut
    company: CompanyOut


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def _make_token(user_id: str, company_id: Optional[str]) -> str:
    payload = {
        "sub": user_id,
        "company_id": company_id,
        "exp": datetime.utcnow() + timedelta(hours=_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGO)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, _SECRET, algorithms=[_ALGO])
        user_id: str = payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    company = Company(
        name=body.company_name,
        type=body.company_type,
        industry=body.industry,
        description=body.description,
        avatar_color=body.avatar_color,
        logo_initials=_initials(body.company_name),
        website=body.website,
        contact_email=body.email,
    )
    db.add(company)
    db.flush()

    user = User(
        email=body.email,
        hashed_password=_bcrypt_lib.hashpw(body.password.encode(), _bcrypt_lib.gensalt()).decode(),
        company_id=company.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(company)

    return AuthResponse(
        access_token=_make_token(user.id, company.id),
        user=UserOut(id=user.id, email=user.email),
        company=CompanyOut(
            id=company.id, name=company.name, type=company.type,
            industry=company.industry, avatar_color=company.avatar_color,
            logo_initials=company.logo_initials,
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _bcrypt_lib.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    company = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    if not company:
        raise HTTPException(status_code=400, detail="Account has no linked company")

    return AuthResponse(
        access_token=_make_token(user.id, company.id),
        user=UserOut(id=user.id, email=user.email),
        company=CompanyOut(
            id=company.id, name=company.name, type=company.type,
            industry=company.industry, avatar_color=company.avatar_color,
            logo_initials=company.logo_initials,
        ),
    )


@router.post("/demo", response_model=AuthResponse)
def demo_login(db: Session = Depends(get_db)):
    demo_email = "demo@negotiai.com"
    user = db.query(User).filter(User.email == demo_email).first()

    if user:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    else:
        company = Company(
            name="Demo Visitor",
            type="sponsor",
            industry="Technology",
            description="Demo account — exploring AI-powered B2B negotiation",
            avatar_color="#3b82f6",
            logo_initials="DV",
            contact_email=demo_email,
        )
        db.add(company)
        db.flush()
        user = User(
            email=demo_email,
            hashed_password=_bcrypt_lib.hashpw(b"demo-no-direct-login", _bcrypt_lib.gensalt()).decode(),
            company_id=company.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.refresh(company)

    if not company:
        raise HTTPException(status_code=500, detail="Demo setup failed")

    return AuthResponse(
        access_token=_make_token(user.id, company.id),
        user=UserOut(id=user.id, email=user.email),
        company=CompanyOut(
            id=company.id, name=company.name, type=company.type,
            industry=company.industry, avatar_color=company.avatar_color,
            logo_initials=company.logo_initials,
        ),
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first() if current_user.company_id else None
    if not company:
        raise HTTPException(status_code=400, detail="Account has no linked company")

    return MeResponse(
        user=UserOut(id=current_user.id, email=current_user.email),
        company=CompanyOut(
            id=company.id, name=company.name, type=company.type,
            industry=company.industry, avatar_color=company.avatar_color,
            logo_initials=company.logo_initials,
        ),
    )

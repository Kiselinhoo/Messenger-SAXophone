from datetime import UTC, datetime
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth_service import login_user
from app.db import get_db
from app.models import AuthSession, User
from app.secure import decode_token
from app.users.schemas import RegisterRequest, UserPublic
from app.users.service import create_user


router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])
bearer = HTTPBearer(auto_error=False)


def unauthorized():
    return HTTPException(
        401,
        "Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise unauthorized()

    try:
        payload = decode_token(credentials.credentials)
        session_id = UUID(payload["jti"])
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise unauthorized() from None

    session = db.get(AuthSession, session_id)
    if session is None:
        raise unauthorized()
    if session.user_id != user_id:
        raise unauthorized()

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        raise unauthorized()

    return session


def current_user(
    session: AuthSession = Depends(current_session),
    db: Session = Depends(get_db),
):
    user = db.get(User, session.user_id)
    if user is None:
        raise unauthorized()
    return user


@users_router.get("/me", response_model=UserPublic)
def me(response: Response, user=Depends(current_user)):
    response.headers["Cache-Control"] = "no-store"
    return user


class LoginRequest(BaseModel):
    identity: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128, repr=False)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


@router.post("/register", response_model=UserPublic, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return create_user(db, data)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user, token, expires_in = login_user(db, data.identity, data.password)
    response.headers["Cache-Control"] = "no-store"
    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserPublic.model_validate(user),
    )


@router.post("/logout", status_code=204)
def logout(session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return Response(status_code=204)
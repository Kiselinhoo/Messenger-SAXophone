from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AuthSession, User
from app.secure import create_token, hash_password, verify_password
from app.users.repository import find_identity


# Для неизвестного пользователя тоже выполняем проверку пароля
DUMMY_PASSWORD_HASH = hash_password("unused-dummy-password")


def login_user(
    db: Session,
    identity: str,
    password: str,
) -> tuple[User, str, int]:
    user = find_identity(db, identity)

    if user is None:
        password_hash = DUMMY_PASSWORD_HASH
    else:
        password_hash = user.password_hash

    password_matches = verify_password(password, password_hash)
    if user is None or not password_matches:
        raise HTTPException(
            401,
            "Invalid login or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_id = uuid4()
    token, expires_at = create_token(user.id, session_id)
    session = AuthSession(
        id=session_id,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()

    expires_in = get_settings().access_token_minutes * 60
    return user, token, expires_in
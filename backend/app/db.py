from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3},
)

SessionLocal = sessionmaker(bind=engine)


def get_db() -> Iterator[Session]:
    # Сессия принадлежит одному запросу, после него соединение возвращается в пул.
    with SessionLocal() as db:
        yield db

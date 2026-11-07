from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.models import Chat, ChatMember, Message, User
from app.users.schemas import UserSummary

router = APIRouter(prefix="/chats", tags=["chats"])
Database = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class MessageInput(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class MessageView(BaseModel):
    id: UUID
    sender_id: UUID
    body: str
    created_at: datetime


class ChatHistory(BaseModel):
    peer: UserSummary
    messages: list[MessageView]


@router.get("", response_model=list[UserSummary])
def contacts(user: CurrentUser, db: Database):
    return db.scalars(select(User).where(User.id != user.id).order_by(User.username)).all()


def get_peer(peer_id: UUID, user: User, db: Session) -> User:
    peer = db.get(User, peer_id) if peer_id != user.id else None
    if peer is None:
        raise HTTPException(404, "Contact not found")
    return peer


def chat_for(first: UUID, second: UUID):
    low, high = sorted((first, second))
    return select(Chat).where(Chat.user_low_id == low, Chat.user_high_id == high)


@router.get("/{peer_id}", response_model=ChatHistory)
def history(peer_id: UUID, user: CurrentUser, db: Database):
    peer = get_peer(peer_id, user, db)
    chat = db.scalar(chat_for(user.id, peer.id))
    messages = [] if chat is None else db.scalars(
        select(Message).where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc(), Message.id.desc()).limit(100)
    ).all()
    return {"peer": peer, "messages": list(reversed(messages))}


@router.post("/{peer_id}", status_code=204)
def send_message(peer_id: UUID, data: MessageInput, user: CurrentUser, db: Database):
    peer = get_peer(peer_id, user, db)
    pair = chat_for(user.id, peer.id)
    chat = db.scalar(pair)
    if chat is None:
        low, high = sorted((user.id, peer.id))
        try:
            with db.begin_nested():
                chat = Chat(user_low_id=low, user_high_id=high)
                db.add(chat)
                db.flush()
                db.add_all([ChatMember(chat_id=chat.id, user_id=member) for member in (low, high)])
        except IntegrityError:
            # Собеседник мог создать тот же диалог первым.
            chat = db.scalar(pair)
            if chat is None:
                raise
    db.add(Message(chat_id=chat.id, sender_id=user.id, body=data.body))
    db.commit()

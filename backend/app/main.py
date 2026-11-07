import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app.config import get_settings
from app.db import get_db
from app.auth import router as auth_router, users_router
from app.chats import router as chats_router


app = FastAPI(title="Messenger SAXophone", version="0.1.0")
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(chats_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


def error_body(code: str, message: str) -> dict[str, dict[str, str]]:
    return {
        "error": {
            "code": code,
            "message": message,
        }
    }


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(f"http_{exc.status_code}", str(exc.detail)),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    status = 400 if request.url.path.startswith(("/auth/", "/users", "/chats/")) else 422

    return JSONResponse(
        status_code=status,
        content=error_body("validation_error", "Invalid request"),
    )


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    # Данные запроса не пишем: позже в них будут пароли и токены.
    logging.getLogger(__name__).error(
        "Unhandled error: %s",
        type(exc).__name__,
    )

    return JSONResponse(
        status_code=500,
        content=error_body("internal_error", "Internal server error"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "saxophone-api"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    # Проверяем настоящий запрос к БД, а не только наличие настроек. но это странно бля
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable"},
        )

    return {"status": "ok", "database": "ok"}

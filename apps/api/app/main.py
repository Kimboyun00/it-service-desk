from fastapi import FastAPI
from .routers import auth, health, tickets, comments, uploads, attachments, me
from .models.user import Base
from .db import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware

import app.models.ticket  # noqa: F401
import app.models.comment  # noqa: F401
import app.models.event  # noqa

from .core.seed import seed_users


app = FastAPI(title="IT Service Desk API")

@app.on_event("startup")
def on_startup():
    # 1) 테이블 생성(DEV 편의)
    Base.metadata.create_all(bind=engine)

    # 2) 시드 유저 생성
    with SessionLocal() as session:
        seed_users(session)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(comments.router)
app.include_router(uploads.router)
app.include_router(attachments.router)
app.include_router(me.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
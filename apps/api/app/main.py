from fastapi import FastAPI
from .routers import auth, health, tickets
from .models.user import Base
from .db import engine

app = FastAPI(title="IT Service Desk API")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tickets.router)

from fastapi import FastAPI
from .routers import auth, health, tickets

app = FastAPI(title="IT Service Desk API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tickets.router)

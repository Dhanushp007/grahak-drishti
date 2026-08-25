from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


app = FastAPI(
    title="GRAHAK-DRISHTI API",
    description="Consumer intelligence and escalation platform API.",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="api", version=app.version)
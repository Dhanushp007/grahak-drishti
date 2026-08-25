from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.api.app.complaints import ComplaintNotFoundError
from services.api.app.routes import router as complaint_router


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


app = FastAPI(
    title="GRAHAK-DRISHTI API",
    description="Consumer intelligence and escalation platform API.",
    version="0.1.0",
)
app.include_router(complaint_router)


@app.exception_handler(ComplaintNotFoundError)
async def complaint_not_found_handler(
    request: Request, exc: ComplaintNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "COMPLAINT_NOT_FOUND",
                "message": "Complaint could not be found",
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request could not be accepted",
                "details": [
                    {"location": error["loc"], "message": error["msg"]}
                    for error in exc.errors()
                ],
            }
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="api", version=app.version)

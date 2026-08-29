from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.api.app.complaints import (
    ComplaintEditWindowExpiredError,
    ComplaintNotFoundError,
)
from services.api.app.dashboard_routes import router as dashboard_router
from services.api.app.demo_routes import router as demo_router
from services.api.app.intelligence import CorroborationNotFoundError
from services.api.app.issue_routes import router as issue_router
from services.api.app.issues import IssueNotFoundError
from services.api.app.routes import router as complaint_router
from services.api.app.storage import EvidenceStorageError


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
app.include_router(issue_router)
app.include_router(dashboard_router)
app.include_router(demo_router)


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


@app.exception_handler(ComplaintEditWindowExpiredError)
async def complaint_edit_window_expired_handler(
    request: Request, exc: ComplaintEditWindowExpiredError
) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "COMPLAINT_EDIT_WINDOW_EXPIRED",
                "message": (
                    "This report is now read-only because its 48-hour edit window "
                    "has ended."
                ),
            }
        },
    )


@app.exception_handler(IssueNotFoundError)
async def issue_not_found_handler(
    request: Request, exc: IssueNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "ISSUE_NOT_FOUND",
                "message": "Issue could not be found",
            }
        },
    )


@app.exception_handler(CorroborationNotFoundError)
async def corroboration_not_found_handler(
    request: Request, exc: CorroborationNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "CORROBORATION_NOT_FOUND",
                "message": "Corroboration could not be found",
            }
        },
    )


@app.exception_handler(EvidenceStorageError)
async def evidence_storage_error_handler(
    request: Request, exc: EvidenceStorageError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "INVALID_EVIDENCE_FILE",
                "message": str(exc),
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

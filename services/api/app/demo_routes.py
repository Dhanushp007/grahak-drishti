from fastapi import APIRouter

from services.api.app.demo_schemas import DemoLoginRequest, DemoLoginResponse

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])


@router.post("/login", response_model=DemoLoginResponse)
def demo_login(payload: DemoLoginRequest) -> DemoLoginResponse:
    if payload.role == "government":
        return DemoLoginResponse(
            role=payload.role,
            display_name="Demo Government Official",
            session_label="Synthetic analyst session",
        )
    return DemoLoginResponse(
        role=payload.role,
        display_name="Demo Citizen",
        session_label="Synthetic citizen session",
    )
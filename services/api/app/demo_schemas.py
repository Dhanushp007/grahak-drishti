from typing import Literal

from pydantic import BaseModel, ConfigDict

DemoRole = Literal["citizen", "government"]


class DemoLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: DemoRole


class DemoLoginResponse(BaseModel):
    role: DemoRole
    display_name: str
    session_label: str
    synthetic: bool = True
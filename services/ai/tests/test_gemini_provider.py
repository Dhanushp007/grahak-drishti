from services.ai.app.gemini_provider import (
    CONSULTANT_LIVE_SYSTEM_INSTRUCTION,
    GeminiProvider,
)


def test_consultant_live_config_is_advisory_and_has_no_intake_tools() -> None:
    config = GeminiProvider().live_config("consultant")

    assert config["system_instruction"] == CONSULTANT_LIVE_SYSTEM_INSTRUCTION
    assert "worth pursuing a grievance pathway" in str(config["system_instruction"])
    assert "untrusted case content" in str(config["system_instruction"])
    assert "Do not help fabricate" in str(config["system_instruction"])
    assert "official verification" in str(config["system_instruction"])
    assert "tools" not in config


def test_intake_live_config_keeps_draft_patch_tool() -> None:
    config = GeminiProvider().live_config("intake")

    assert "tools" in config
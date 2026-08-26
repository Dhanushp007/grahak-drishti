import hashlib
import os
from pathlib import Path
from uuid import uuid4

MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
ALLOWED_EVIDENCE_TYPES = frozenset(
    {"application/pdf", "image/jpeg", "image/png", "image/webp"}
)


class EvidenceStorageError(ValueError):
    pass


def _storage_root() -> Path:
    return Path(
        os.getenv("EVIDENCE_STORAGE_DIR", ".demo-storage/evidence")
    ).resolve()


def store_evidence(
    filename: str | None, content_type: str | None, data: bytes
) -> tuple[str, str, int, str]:
    if content_type not in ALLOWED_EVIDENCE_TYPES:
        raise EvidenceStorageError("unsupported evidence file type")
    if not data:
        raise EvidenceStorageError("evidence file must not be empty")
    if len(data) > MAX_EVIDENCE_BYTES:
        raise EvidenceStorageError("evidence file exceeds the 5 MB limit")
    safe_name = Path(filename or "evidence").name
    if safe_name in {"", ".", ".."}:
        safe_name = "evidence"
    storage_key = f"{uuid4().hex}-{safe_name}"
    root = _storage_root()
    root.mkdir(parents=True, exist_ok=True)
    destination = (root / storage_key).resolve()
    if root not in destination.parents:
        raise EvidenceStorageError("invalid evidence storage path")
    destination.write_bytes(data)
    return storage_key, safe_name, len(data), hashlib.sha256(data).hexdigest()
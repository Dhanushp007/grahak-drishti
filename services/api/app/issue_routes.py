from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from services.api.app.db import get_db
from services.api.app.intelligence import (
    CorroborationNotFoundError,
    create_corroboration,
    submit_evidence,
)
from services.api.app.issue_schemas import (
    CorroborationCreate,
    CorroborationResponse,
    EvidenceCreate,
    EvidenceResponse,
    PublicIssueResponse,
)
from services.api.app.issues import (
    IssueNotFoundError,
    get_issue_cluster,
    list_issue_clusters,
)
from services.api.app.storage import (
    MAX_EVIDENCE_BYTES,
    EvidenceStorageError,
    store_evidence,
)

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


@router.get("", response_model=list[PublicIssueResponse])
def read_public_issues(
    session: Annotated[Session, Depends(get_db)],
) -> list[PublicIssueResponse]:
    return [
        PublicIssueResponse.model_validate(cluster)
        for cluster in list_issue_clusters(session)
    ]


@router.get("/{cluster_key}", response_model=PublicIssueResponse)
def read_public_issue(
    cluster_key: str, session: Annotated[Session, Depends(get_db)]
) -> PublicIssueResponse:
    return PublicIssueResponse.model_validate(get_issue_cluster(session, cluster_key))


@router.post("/{cluster_key}/confirm")
def confirm_public_issue(
    cluster_key: str,
    session: Annotated[Session, Depends(get_db)],
    confirmation_key: Annotated[
        str, Header(alias="X-Confirmation-Key", min_length=16, max_length=128)
    ],
) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "CORROBORATION_REQUIRED",
                "message": (
                    "Submit supporting evidence before adding a consumer signal."
                ),
            }
        },
    )


@router.post("/{cluster_key}/corroborations", response_model=CorroborationResponse)
def start_corroboration(
    cluster_key: str,
    payload: CorroborationCreate,
    session: Annotated[Session, Depends(get_db)],
) -> CorroborationResponse:
    try:
        corroboration, _ = create_corroboration(session, cluster_key, payload)
    except ValueError as error:
        if str(error) == "issue not found":
            raise IssueNotFoundError from error
        raise
    return CorroborationResponse(
        corroboration_id=corroboration.id,
        cluster_key=cluster_key,
        status=corroboration.status,
        evidence_required=True,
    )


@router.post(
    "/corroborations/{corroboration_id}/evidence", response_model=EvidenceResponse
)
def add_corroboration_evidence(
    corroboration_id: str,
    payload: EvidenceCreate,
    session: Annotated[Session, Depends(get_db)],
) -> EvidenceResponse:
    try:
        evidence, corroboration, cluster, recorded = submit_evidence(
            session, corroboration_id, payload
        )
    except ValueError as error:
        if str(error) in {"corroboration not found", "issue not found"}:
            raise CorroborationNotFoundError from error
        raise
    return EvidenceResponse(
        corroboration_id=corroboration.id,
        cluster_key=cluster.cluster_key,
        status=corroboration.status,
        validation_status=evidence.validation_status,
        confirmations=cluster.confirmations,
        evidence_backed_count=cluster.evidence_backed_count,
        recorded=recorded,
        synthetic_flag=evidence.synthetic_flag,
        filename=evidence.filename,
        file_size_bytes=evidence.file_size_bytes,
    )


@router.post(
    "/corroborations/{corroboration_id}/evidence/upload",
    response_model=EvidenceResponse,
)
async def upload_corroboration_evidence(
    corroboration_id: str,
    session: Annotated[Session, Depends(get_db)],
    evidence_type: str = Form(..., min_length=3, max_length=64),
    upload: UploadFile = File(...),
) -> EvidenceResponse:
    data = await upload.read(MAX_EVIDENCE_BYTES + 1)
    try:
        storage_key, filename, size, digest = store_evidence(
            upload.filename, upload.content_type, data
        )
    except EvidenceStorageError:
        raise
    try:
        evidence, corroboration, cluster, recorded = submit_evidence(
            session,
            corroboration_id,
            EvidenceCreate(evidence_type=evidence_type, filename=filename),
            storage_key=storage_key,
            content_type=upload.content_type,
            file_size_bytes=size,
            sha256_digest=digest,
        )
    except ValueError as error:
        if str(error) in {"corroboration not found", "issue not found"}:
            raise CorroborationNotFoundError from error
        raise
    return EvidenceResponse(
        corroboration_id=corroboration.id,
        cluster_key=cluster.cluster_key,
        status=corroboration.status,
        validation_status=evidence.validation_status,
        confirmations=cluster.confirmations,
        evidence_backed_count=cluster.evidence_backed_count,
        recorded=recorded,
        synthetic_flag=evidence.synthetic_flag,
        filename=evidence.filename,
        file_size_bytes=evidence.file_size_bytes,
    )

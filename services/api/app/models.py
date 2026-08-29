from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from services.api.app.db import Base


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        CheckConstraint(
            "amount_involved IS NULL OR amount_involved >= 0",
            name="ck_complaints_amount_non_negative",
        ),
        CheckConstraint("currency = 'INR'", name="ck_complaints_currency_inr"),
        Index("ix_complaints_status", "status"),
        Index("ix_complaints_submitted_at", "submitted_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    docket_number: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200))
    amount_involved: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default="INR"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="submitted", server_default="submitted"
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class ComplaintContact(Base):
    __tablename__ = "complaint_contacts"
    __table_args__ = (
        CheckConstraint(
            "contact_type IN ('email', 'phone')", name="ck_complaint_contacts_type"
        ),
        Index("ix_complaint_contacts_digest", "contact_digest"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    contact_type: Mapped[str] = mapped_column(String(16), nullable=False)
    contact_digest: Mapped[str] = mapped_column(String(64), nullable=False)


class ComplaintStatusEvent(Base):
    __tablename__ = "complaint_status_events"
    __table_args__ = (
        Index("ix_complaint_status_events_complaint", "complaint_id", "occurred_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(String(300), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = (Index("ix_outbox_events_unpublished", "published_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(36), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(36), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True)
    payload: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False)
    attempts: Mapped[int] = mapped_column(nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class IssueClusterRecord(Base):
    __tablename__ = "issue_clusters"
    __table_args__ = (
        CheckConstraint("reported_count >= 1", name="ck_issue_clusters_reported_count"),
        CheckConstraint("confirmations >= 0", name="ck_issue_clusters_confirmations"),
        CheckConstraint(
            "total_reported_amount IS NULL OR total_reported_amount >= 0",
            name="ck_issue_clusters_amount_non_negative",
        ),
        Index("ix_issue_clusters_sector_issue", "sector", "issue"),
    )

    cluster_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    cluster_key: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200))
    sector: Mapped[str] = mapped_column(String(80), nullable=False)
    issue: Mapped[str] = mapped_column(String(80), nullable=False)
    reported_count: Mapped[int] = mapped_column(nullable=False)
    confirmations: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    evidence_backed_count: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    reviewed_count: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    potential_dark_pattern_count: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    total_reported_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    states_affected: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    growth_rate: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), nullable=False, default=0, server_default="0"
    )
    severity: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False, default=0, server_default="0"
    )
    unresolved_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False, default=0, server_default="0"
    )
    first_reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    trend: Mapped[list[dict[str, object]] | None] = mapped_column(JSON)
    geography: Mapped[list[dict[str, object]] | None] = mapped_column(JSON)
    routing: Mapped[dict[str, object] | None] = mapped_column(JSON)


class ConsumerConfirmation(Base):
    __tablename__ = "consumer_confirmations"
    __table_args__ = (
        UniqueConstraint(
            "cluster_id",
            "confirmation_digest",
            name="uq_consumer_confirmations_cluster_digest",
        ),
        Index("ix_consumer_confirmations_cluster", "cluster_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    cluster_id: Mapped[str] = mapped_column(
        ForeignKey("issue_clusters.cluster_id", ondelete="CASCADE"), nullable=False
    )
    confirmation_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class ComplaintAnalysisRecord(Base):
    __tablename__ = "complaint_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    cluster_key: Mapped[str | None] = mapped_column(String(160))
    analysis: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class CorroborationRecord(Base):
    __tablename__ = "corroborations"
    __table_args__ = (
        UniqueConstraint(
            "cluster_id",
            "confirmation_digest",
            name="uq_corroborations_cluster_digest",
        ),
        Index("ix_corroborations_cluster", "cluster_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    cluster_id: Mapped[str] = mapped_column(
        ForeignKey("issue_clusters.cluster_id", ondelete="CASCADE"), nullable=False
    )
    confirmation_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    explanation: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending_evidence",
        server_default="pending_evidence",
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    corroboration_id: Mapped[str] = mapped_column(
        ForeignKey("corroborations.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)
    filename: Mapped[str | None] = mapped_column(String(200))
    storage_key: Mapped[str | None] = mapped_column(String(300))
    content_type: Mapped[str | None] = mapped_column(String(120))
    file_size_bytes: Mapped[int | None] = mapped_column()
    sha256_digest: Mapped[str | None] = mapped_column(String(64))
    synthetic_flag: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default="1"
    )
    validation_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending-review",
        server_default="pending-review",
    )
    review_note: Mapped[str | None] = mapped_column(String(300))
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class SyntheticConsumer(Base):
    __tablename__ = "synthetic_consumers"

    consumer_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False)
    synthetic_flag: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default="1"
    )


class SyntheticSignal(Base):
    __tablename__ = "synthetic_signals"
    __table_args__ = (Index("ix_synthetic_signals_cluster", "cluster_key"),)

    signal_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    cluster_key: Mapped[str] = mapped_column(String(160), nullable=False)
    consumer_id: Mapped[str] = mapped_column(
        ForeignKey("synthetic_consumers.consumer_id", ondelete="CASCADE"),
        nullable=False,
    )
    signal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    synthetic_flag: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

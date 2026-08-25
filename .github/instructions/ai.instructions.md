---
name: GRAHAK-DRISHTI AI Instructions
description: "Use when editing AI extraction, classification, OCR, embeddings, clustering, duplicate detection, RAG, evaluation, or regulatory recommendation code."
applyTo: "services/ai/**/*.py,services/clustering-worker/**/*.py,services/routing-engine/**/*.py,data/regulatory-kb/**/*"
---
# AI Guidelines

- Keep AI processing asynchronous and prevent it from blocking complaint acknowledgement.
- Return structured facts with confidence, evidence, provenance, and explicit failure states.
- Combine semantic similarity with relevant metadata for duplicate and systemic issue detection.
- Ground regulatory recommendations in verified official sources and identify those sources.
- Treat AI output as advisory; deterministic routing rules and authorized workflows remain authoritative.
- Never expose individual consumer PII or present allegations as established facts.
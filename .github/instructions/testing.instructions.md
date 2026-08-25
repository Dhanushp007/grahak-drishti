---
name: GRAHAK-DRISHTI Testing Instructions
description: "Use when adding or updating unit, integration, API, frontend, AI evaluation, event-processing, load, security, or regression tests."
applyTo: "**/*test*.py,**/tests/**/*,**/*.test.js,**/*.test.jsx,**/*.spec.js,**/*.spec.jsx"
---
# Testing Guidelines

- Test acceptance criteria and user-visible behavior rather than implementation details alone.
- Cover complaint acknowledgement, asynchronous processing, retries, idempotency, privacy, authorization, and validation.
- Keep synthetic and demo fixtures clearly labeled.
- Add evaluation cases for extraction, duplicate detection, clustering, routing, and RAG grounding when those behaviors change.
- Run focused tests first, then the repository's broader lint, formatting, type, and integration checks.
- Do not weaken or remove tests to make CI pass.
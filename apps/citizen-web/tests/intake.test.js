import assert from "node:assert/strict";
import test from "node:test";

import {
  applyIntakePatch,
  buildComplaintPayloadFromDraft,
  createInitialIntakeDraft,
  getMissingRequiredIntakeFields,
  validateIntakeReview,
} from "../lib/intake.js";

test("applies safe nested draft patches without mutating the original", () => {
  const draft = createInitialIntakeDraft();
  const updated = applyIntakePatch(draft, {
    path: "business.company_name",
    value: "Example Seller",
  });

  assert.equal(draft.business.company_name, "");
  assert.equal(updated.business.company_name, "Example Seller");
});

test("keeps system fields outside the assistant patch surface", () => {
  assert.throws(() => applyIntakePatch(createInitialIntakeDraft(), {
    path: "complaint.docket_number",
    value: "GD-ATTACK",
  }));
});

test("maps a reviewed rich draft to the complaint API contract", () => {
  const draft = createInitialIntakeDraft();
  draft.complaint.description = "Refund is delayed.";
  draft.consumer.contact = {
    email: "consumer@example.test",
    phone: "+919876543210",
    preferred_method: "email",
  };
  draft.business.company_name = "Example Seller";
  draft.transaction.amount_disputed = "1499.00";
  draft.consumer.address.state = "Maharashtra";
  draft.consents.case_processing = true;

  const payload = buildComplaintPayloadFromDraft(draft);
  assert.equal(payload.description, "Refund is delayed.");
  assert.equal(payload.company_name, "Example Seller");
  assert.equal(payload.amount_involved, "1499.00");
  assert.equal(payload.state, "Maharashtra");
  assert.deepEqual(payload.contact, { email: "consumer@example.test" });
  assert.equal(payload.intake.synthetic_flag, false);
  assert.ok(Date.parse(payload.intake.consents.accepted_at));
});

test("requires review consent and a tracking contact", () => {
  const draft = createInitialIntakeDraft();
  draft.complaint.description = "A report";
  assert.deepEqual(getMissingRequiredIntakeFields(draft), ["consumer.contact", "consents.case_processing"]);
  assert.deepEqual(validateIntakeReview(draft), {
    contact: "Add an email or phone number to track this report.",
    caseProcessing: "Confirm that we may process this complaint.",
  });
});
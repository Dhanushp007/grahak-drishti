import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsultantContinuationPrompt,
  consumeConsultantHandoff,
  createConsultantHandoff,
  getConsultantTextFields,
  isConsultantHandoff,
  saveConsultantHandoff,
  seedDraftFromConsultantHandoff,
} from "../lib/consultant-handoff.js";
import { createInitialIntakeDraft } from "../lib/intake.js";

function makeDraft() {
  const draft = createInitialIntakeDraft();
  draft.complaint.description = "The refund has not arrived after my cancellation.";
  draft.consumer.contact.email = "private@example.test";
  draft.consumer.address.state = "Maharashtra";
  draft.incident.what_happened = "The seller stopped responding after cancellation.";
  draft.business.company_name = "Example Seller";
  draft.transaction.amount_disputed = "1499.00";
  draft.transaction.payment_reference_last_four = "1234";
  draft.evidence.push({ filename: "private-invoice.png" });
  return draft;
}

test("creates a bounded handoff without contact, evidence, or payment identifiers", () => {
  const handoff = createConsultantHandoff(makeDraft(), 1_800_000_000_000);
  const serialized = JSON.stringify(handoff);

  assert.equal(handoff.context.complaint.description, "The refund has not arrived after my cancellation.");
  assert.equal(handoff.context.consumer.address.state, "Maharashtra");
  assert.equal(handoff.context.transaction.amount_disputed, "1499.00");
  assert.equal(handoff.context.consumer.contact, undefined);
  assert.equal(handoff.context.evidence, undefined);
  assert.equal(handoff.context.transaction.payment_reference_last_four, undefined);
  assert.equal(serialized.includes("private@example.test"), false);
  assert.equal(serialized.includes("private-invoice.png"), false);
  assert.equal(serialized.includes("1234"), false);
});

test("rejects an empty or expired handoff", () => {
  assert.throws(() => createConsultantHandoff(createInitialIntakeDraft(), 1_800_000_000_000));
  const handoff = createConsultantHandoff(makeDraft(), 1_800_000_000_000);

  assert.equal(isConsultantHandoff(handoff, Date.parse(handoff.expiresAt) + 1), false);
});

test("seeds an editable draft and marks carried fields for review", () => {
  const handoff = createConsultantHandoff(makeDraft());
  const seeded = seedDraftFromConsultantHandoff(createInitialIntakeDraft(), handoff);

  assert.equal(seeded.complaint.description, "The refund has not arrived after my cancellation.");
  assert.equal(seeded.business.company_name, "Example Seller");
  assert.equal(seeded.consumer.address.state, "Maharashtra");
  assert.equal(seeded.consumer.contact.email, "");
  assert.equal(seeded.provenance["complaint.description"].needs_review, true);
  assert.equal(seeded.provenance["consumer.address.state"].needs_review, true);
});

test("builds a guarded continuation prompt and text fallback fields", () => {
  const handoff = createConsultantHandoff(makeDraft());
  const prompt = buildConsultantContinuationPrompt(handoff);
  const fields = getConsultantTextFields(handoff);

  assert.match(prompt, /unverified case content/);
  assert.match(prompt, /Do not request passwords/);
  assert.equal(fields.description, "The refund has not arrived after my cancellation.");
  assert.equal(fields.companyName, "Example Seller");
  assert.equal(fields.amountInvolved, "1499.00");
  assert.equal(fields.state, "Maharashtra");
});

test("consumes a valid handoff once from session storage", () => {
  const originalWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };

  try {
    const handoff = createConsultantHandoff(makeDraft());
    saveConsultantHandoff(handoff);
    assert.deepEqual(consumeConsultantHandoff(), handoff);
    assert.equal(consumeConsultantHandoff(), null);
  } finally {
    globalThis.window = originalWindow;
  }
});

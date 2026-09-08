import assert from "node:assert/strict";
import test from "node:test";

import {
  applyIntakePatch,
  buildComplaintPayloadFromDraft,
  createInitialIntakeDraft,
  getMissingRequiredIntakeFields,
  mergeNormalizedIntakeDraft,
  validateIntakeReview,
} from "../lib/intake.js";
import {
  buildLiveConfig,
  getLiveFunctionCalls,
  parseLiveFunctionArgs,
  sendOpeningPrompt,
} from "../lib/gemini-live.js";

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

test("normalizes spoken language labels to the API language values", () => {
  const draft = createInitialIntakeDraft();
  const english = applyIntakePatch(draft, {
    path: "complaint.language",
    value: "English",
  });
  const hindi = applyIntakePatch(english, {
    path: "complaint.language",
    value: "Hindi",
  });
  const hinglish = applyIntakePatch(hindi, {
    path: "complaint.language",
    value: "Hinglish",
  });

  assert.equal(english.complaint.language, "en");
  assert.equal(hindi.complaint.language, "hi");
  assert.equal(hinglish.complaint.language, "hinglish");
  assert.throws(() => applyIntakePatch(draft, {
    path: "complaint.language",
    value: "Tamil",
  }), /Choose English, Hindi, or Hinglish/);
});

test("recognizes Gemini live tool calls in both SDK message shapes", () => {
  const call = { id: "call-1", name: "patch_intake_draft", args: "{\"path\":\"business.company_name\",\"value\":\"Example Seller\"}" };
  assert.deepEqual(getLiveFunctionCalls({ toolCall: { functionCalls: [call] } }), [call]);
  assert.deepEqual(getLiveFunctionCalls({ server_content: { tool_call: { function_calls: [call] } } }), [call]);
  assert.deepEqual(parseLiveFunctionArgs(call), {
    path: "business.company_name",
    value: "Example Seller",
  });
});

test("requires explicit values and exposes draft paths to the live tool", () => {
  const declaration = buildLiveConfig().tools[0].functionDeclarations[0];
  assert.ok(declaration.parameters.properties.path.enum.includes("business.company_name"));
  assert.deepEqual(declaration.parameters.required, ["path", "value"]);
});

test("starts the voice intake with an English language-choice question", () => {
  let openingMessage;
  sendOpeningPrompt({
    sendClientContent(message) {
      openingMessage = message;
    },
  });

  const openingText = openingMessage.turns[0].parts[0].text;
  assert.match(openingText, /^Begin in English only\./);
  assert.match(openingText, /Which language would you prefer/);
  assert.match(openingText, /Wait for the answer before asking what happened/);
});

test("does not let an incomplete normalization response erase live draft values", () => {
  const draft = createInitialIntakeDraft();
  draft.business.company_name = "Example Seller";
  draft.transaction.amount_disputed = "1499";
  draft.resolution_attempts.push({ channel: "seller", response_summary: "No response" });
  draft.consents.case_processing = true;

  const normalized = createInitialIntakeDraft();
  normalized.business.company_name = "";
  normalized.transaction.amount_disputed = null;
  normalized.resolution_attempts = [];
  normalized.consents.case_processing = false;
  normalized.incident.category = "refund";

  const merged = mergeNormalizedIntakeDraft(draft, normalized);
  assert.equal(merged.business.company_name, "Example Seller");
  assert.equal(merged.transaction.amount_disputed, "1499");
  assert.deepEqual(merged.resolution_attempts, draft.resolution_attempts);
  assert.equal(merged.consents.case_processing, true);
  assert.equal(merged.incident.category, "refund");
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
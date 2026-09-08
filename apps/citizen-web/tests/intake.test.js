import assert from "node:assert/strict";
import test from "node:test";

import {
  applyIntakePatch,
  buildComplaintPayloadFromDraft,
  createInitialIntakeDraft,
  getMissingRequiredIntakeFields,
  getGuidedIntakeProgress,
  getIntakeNormalizationError,
  hasIntakeStory,
  mergeNormalizedIntakeDraft,
  parseVoiceIntakeSession,
  serializeVoiceIntakeSession,
  validateIntakeReview,
} from "../lib/intake.js";
import {
  buildLiveToolResponse,
  getLiveInputTranscription,
  getLiveOutputTranscription,
  getLiveFunctionCalls,
  getLiveToolCalls,
  parseLiveToolCallArgs,
  parseLiveFunctionArgs,
  buildLiveConfig,
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

test("tracks guided intake progress without treating defaults as captured", () => {
  const draft = createInitialIntakeDraft();
  let progress = getGuidedIntakeProgress(draft);
  assert.equal(progress.activeSection.id, "story");
  assert.equal(progress.capturedCount, 0);

  draft.complaint.description = "The refund has not arrived.";
  draft.business.company_name = "Example Seller";
  draft.consumer.contact.email = "consumer@example.test";
  progress = getGuidedIntakeProgress(draft);

  assert.equal(progress.sections.find((section) => section.id === "story").complete, true);
  assert.equal(progress.sections.find((section) => section.id === "business").complete, true);
  assert.equal(progress.activeSection.id, "timing");
  assert.equal(progress.capturedCount, 3);
});

test("ends guided progress with a review prompt when every section is complete", () => {
  const draft = createInitialIntakeDraft();
  draft.complaint.description = "The refund has not arrived.";
  draft.business.company_name = "Example Seller";
  draft.incident.occurred_on = "2026-09-01";
  draft.transaction.amount_disputed = "100.00";
  draft.consumer.contact.email = "consumer@example.test";
  draft.requested_remedy.primary = "refund";
  draft.consents.case_processing = true;

  const progress = getGuidedIntakeProgress(draft);
  assert.equal(progress.activeSection.id, "consent");
  assert.equal(progress.activeSection.question, "Everything is captured. Review your details before submitting.");
});

test("reads the canonical Live tool-call envelope and applies its patch safely", () => {
  const draft = createInitialIntakeDraft();
  const call = {
    id: "call-1",
    name: "patch_intake_draft",
    args: { path: "business.company_name", value: "Example Seller" },
  };

  assert.deepEqual(getLiveToolCalls({ toolCall: { functionCalls: [call] } }), [call]);
  const updated = applyIntakePatch(draft, parseLiveToolCallArgs(call));

  assert.equal(updated.business.company_name, "Example Seller");
  assert.deepEqual(buildLiveToolResponse(call, { output: { result: "Draft field updated" } }), {
    id: "call-1",
    name: "patch_intake_draft",
    response: { output: { result: "Draft field updated" } },
  });
});

test("accepts legacy Live envelopes and JSON-encoded tool arguments", () => {
  const call = {
    id: "call-2",
    name: "patch_intake_draft",
    args: JSON.stringify({ path: "transaction.amount_disputed", value: "2499" }),
  };

  assert.deepEqual(getLiveToolCalls({ tool_call: { function_calls: [call] } }), [call]);
  assert.deepEqual(parseLiveToolCallArgs(call), {
    path: "transaction.amount_disputed",
    value: "2499",
  });
  assert.throws(() => parseLiveToolCallArgs({ args: "[]" }), /invalid draft arguments/);
});

test("reads consumer and assistant transcriptions from Live server content", () => {
  const message = {
    serverContent: {
      inputTranscription: { text: "The refund is delayed.", finished: true },
      outputTranscription: { text: "What company was involved?", finished: true },
    },
  };

  assert.deepEqual(getLiveInputTranscription(message), {
    text: "The refund is delayed.",
    finished: true,
  });
  assert.deepEqual(getLiveOutputTranscription(message), {
    text: "What company was involved?",
    finished: true,
  });
});

test("detects whether a draft has a complaint story", () => {
  const draft = createInitialIntakeDraft();
  assert.equal(hasIntakeStory(draft), false);
  draft.incident.what_happened = "The promised refund did not arrive.";
  assert.equal(hasIntakeStory(draft), true);
});

test("round-trips a browser-local voice draft and transcript", () => {
  const draft = createInitialIntakeDraft();
  draft.complaint.description = "The refund is delayed.";

  const restored = parseVoiceIntakeSession(serializeVoiceIntakeSession(
    draft,
    "The refund is delayed.",
    "I paid by card",
  ));

  assert.equal(restored.draft.complaint.description, "The refund is delayed.");
  assert.equal(restored.transcript, "The refund is delayed.");
  assert.equal(restored.interimTranscript, "I paid by card");
});

test("ignores invalid browser-local voice sessions", () => {
  assert.equal(parseVoiceIntakeSession("not-json"), null);
  assert.equal(parseVoiceIntakeSession(JSON.stringify({ version: 2, draft: {} })), null);
});

test("does not treat provider failures as successful normalization", () => {
  assert.equal(getIntakeNormalizationError({ ok: false }, {
    status: "provider_unavailable",
    draft: createInitialIntakeDraft(),
  }), "Voice review is temporarily unavailable. Your captured draft is still here.");
  assert.equal(getIntakeNormalizationError({ ok: true }, {
    status: "needs_review",
    draft: createInitialIntakeDraft(),
  }), "");
});

test("normalizes spoken language labels to the API language values", () => {
  const draft = createInitialIntakeDraft();
  const languages = [
    ["English", "en"],
    ["Hindi", "hi"],
    ["Telugu", "te"],
    ["Tamil", "ta"],
    ["Malayalam", "ml"],
    ["Kannada", "kn"],
    ["Bengali", "bn"],
  ];

  for (const [label, value] of languages) {
    const updated = applyIntakePatch(draft, {
      path: "complaint.language",
      value: label,
    });
    assert.equal(updated.complaint.language, value);
  }
  assert.throws(() => applyIntakePatch(draft, {
    path: "complaint.language",
    value: "Hinglish",
  }), /Choose English, Hindi, Telugu, Tamil, Malayalam, Kannada, or Bengali/);
});

test("supports both Live tool-call helper names and envelopes", () => {
  const call = {
    id: "call-1",
    name: "patch_intake_draft",
    args: JSON.stringify({ path: "business.company_name", value: "Example Seller" }),
  };

  assert.deepEqual(getLiveToolCalls({ server_content: { tool_call: { function_calls: [call] } } }), [call]);
  assert.deepEqual(getLiveFunctionCalls({ toolCall: { functionCalls: [call] } }), [call]);
  assert.deepEqual(parseLiveFunctionArgs(call), parseLiveToolCallArgs(call));
  assert.ok(buildLiveConfig().tools[0].functionDeclarations[0].parameters.properties.path.enum.includes("business.company_name"));
});

test("starts the Live intake with an English language-choice question", () => {
  let openingMessage;
  sendOpeningPrompt({
    sendClientContent(message) {
      openingMessage = message;
    },
  });

  const openingText = openingMessage.turns[0].parts[0].text;
  assert.match(openingText, /^Begin in English only\./);
  assert.match(openingText, /English, Hindi, Telugu, Tamil, Malayalam, Kannada, or Bengali/);
  assert.doesNotMatch(openingText, /Hinglish/);
});

test("preserves captured values when normalization returns an incomplete draft", () => {
  const draft = createInitialIntakeDraft();
  draft.business.company_name = "Example Seller";
  draft.resolution_attempts = [{ channel: "seller", response_summary: "No response" }];
  draft.consents.case_processing = true;

  const normalized = createInitialIntakeDraft();
  normalized.business.company_name = "";
  normalized.resolution_attempts = [];
  normalized.consents.case_processing = false;
  normalized.incident.category = "refund";

  const merged = mergeNormalizedIntakeDraft(draft, normalized);
  assert.equal(merged.business.company_name, "Example Seller");
  assert.deepEqual(merged.resolution_attempts, draft.resolution_attempts);
  assert.equal(merged.consents.case_processing, true);
  assert.equal(merged.incident.category, "refund");
});

test("does not let a malformed scalar replace a captured list", () => {
  const draft = createInitialIntakeDraft();
  draft.escalation.previous_authorities_contacted = ["seller support"];

  const normalized = createInitialIntakeDraft();
  normalized.escalation.previous_authorities_contacted = "consumer helpline";

  const merged = mergeNormalizedIntakeDraft(draft, normalized);
  assert.deepEqual(merged.escalation.previous_authorities_contacted, ["seller support"]);
});
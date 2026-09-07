import assert from "node:assert/strict";
import test from "node:test";

import { buildComplaintPayload, buildTrackingPayload, readApiResponse, validateComplaintForm } from "../lib/complaint.js";
import { DEMO_SCENARIOS } from "../lib/demo-scenarios.js";
import { fetchMyReports } from "../lib/reports.js";
import { fetchPublicIssues } from "../lib/issues.js";

test("builds the API payload with a single normalized contact", () => {
  const payload = buildComplaintPayload({
    description: "  Refund is delayed. ",
    companyName: "  Example Seller ",
    amountInvolved: "1499.00",
    email: " consumer@example.com ",
    phone: "",
  });

  assert.deepEqual(payload, {
    description: "Refund is delayed.",
    company_name: "Example Seller",
    amount_involved: "1499.00",
    contact: { email: "consumer@example.com" },
  });
});

test("requires exactly one tracking contact", () => {
  const baseForm = { description: "A problem", email: "", phone: "" };
  assert.equal(validateComplaintForm(baseForm).contact, "Add an email or phone number to track your report.");
  assert.equal(validateComplaintForm({ ...baseForm, email: "a@example.com", phone: "+919876543210" }).contact, "Use either email or phone, not both.");
  assert.deepEqual(validateComplaintForm({ ...baseForm, email: "a@example.com" }), {});
});

test("builds a normalized tracking payload", () => {
  assert.deepEqual(
    buildTrackingPayload({ docket: " gd-abcd1234efgh ", email: " USER@example.com ", phone: "" }),
    { docket_number: "GD-ABCD1234EFGH", contact: { email: "USER@example.com" } },
  );
});

test("contains ten complete, distinct demo complaint scenarios", () => {
  assert.equal(DEMO_SCENARIOS.length, 10);
  assert.equal(new Set(DEMO_SCENARIOS.map((scenario) => scenario.expectedCluster)).size, 10);
  for (const scenario of DEMO_SCENARIOS) {
    assert.ok(scenario.description);
    assert.ok(scenario.companyName);
    assert.ok(scenario.amountInvolved);
    assert.ok(scenario.contact);
    assert.ok(scenario.expectedIssue);
    assert.ok(scenario.evidenceType);
    assert.ok(scenario.routingHint);
  }
});

test("turns a plain-text server failure into a useful request error", async () => {
  const response = {
    status: 500,
    ok: false,
    headers: { get: () => "text/plain" },
    text: async () => "Internal Server Error",
  };

  await assert.rejects(
    readApiResponse(response),
    /reporting service is temporarily unavailable/,
  );
});

test("turns a missing report lookup into an empty result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new globalThis.Response("Complaint could not be found", { status: 404 });
  try {
    assert.deepEqual(await fetchMyReports({ email: "consumer@example.com" }), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shows a useful message when public issues return plain text", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new globalThis.Response("Internal Server Error", { status: 502 });
  try {
    await assert.rejects(fetchPublicIssues(), /reporting service is temporarily unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
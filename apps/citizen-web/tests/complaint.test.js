import assert from "node:assert/strict";
import test from "node:test";

import { buildComplaintPayload, buildTrackingPayload, validateComplaintForm } from "../lib/complaint.js";

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
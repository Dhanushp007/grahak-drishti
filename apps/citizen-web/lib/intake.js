const ALLOWED_PATH_PATTERN = /^(complaint|consumer|incident|business|transaction|resolution_attempts|requested_remedy|escalation|evidence|consents|data_quality|provenance)(?:\.[a-z][a-z0-9_]*|\[\d+\])*$/;
const SYSTEM_PATHS = new Set(["complaint.docket_number", "complaint.submitted_at"]);

export function createInitialIntakeDraft() {
  return {
    schema_version: "complaint-intake.v1",
    record_type: "complaint_intake_payload",
    synthetic_flag: false,
    environment: null,
    complaint: {
      docket_number: null,
      description: "",
      language: "auto",
      source_channel: "voice",
      submitted_at: null,
      self_assessed_priority: null,
    },
    consumer: {
      consumer_type: "individual",
      full_name: "",
      contact: { email: "", phone: "", preferred_method: null },
      address: {
        line1: "",
        line2: "",
        city: "",
        district: "",
        state: "",
        postal_code: "",
      },
    },
    incident: {
      sector: "",
      category: "",
      subcategory: "",
      occurred_on: null,
      discovered_on: null,
      date_precision: null,
      is_recurring: null,
      urgency: null,
      what_was_promised: "",
      what_happened: "",
    },
    business: {
      company_name: "",
      seller_name: "",
      marketplace_or_channel: "",
      website_or_app: "",
      business_location: "",
    },
    transaction: {
      product_or_service: "",
      product_identifier: "",
      order_reference: "",
      invoice_reference: "",
      booking_or_policy_reference: "",
      transaction_date: null,
      delivery_date: null,
      cancellation_date: null,
      order_status: "",
      delivery_status: "",
      amount_paid: null,
      amount_disputed: null,
      refund_expected: null,
      refund_received: null,
      remaining_loss: null,
      currency: "INR",
      payment_method: "",
      payment_reference_last_four: "",
      reference_verification_status: "unverified_claim",
    },
    resolution_attempts: [],
    requested_remedy: {
      primary: "",
      amount_requested: null,
      other_requests: [],
      compensation_requested: null,
    },
    escalation: {
      previous_authorities_contacted: [],
      preferred_next_step: "",
      nch_reference: null,
      regulator_reference: null,
      e_jagriti_reference: null,
      official_escalation_requested: false,
    },
    evidence: [],
    consents: {
      privacy_notice_version: "voice-intake-2026-09",
      case_processing: false,
      aggregate_intelligence: false,
      share_with_official_authority: false,
      accepted_at: null,
    },
    data_quality: {
      reported_by: "consumer",
      verification_status: "unverified",
      legal_finding: false,
      notes: "",
    },
    provenance: {},
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pathSegments(path) {
  return path.match(/[a-z][a-z0-9_]*|\[\d+\]/g)?.map((segment) => (
    segment.startsWith("[") ? Number(segment.slice(1, -1)) : segment
  )) || [];
}

export function isAllowedIntakePath(path) {
  return typeof path === "string" && ALLOWED_PATH_PATTERN.test(path) && !SYSTEM_PATHS.has(path) && path !== "provenance";
}

export function applyIntakePatch(draft, patch) {
  if (!isAllowedIntakePath(patch?.path)) {
    throw new Error("This field cannot be changed by the intake assistant.");
  }
  const operation = patch.operation || "set";
  const segments = pathSegments(patch.path);
  const next = clone(draft);
  const finalSegment = segments.pop();
  let parent = next;
  for (const segment of segments) {
    if (parent[segment] === undefined) {
      throw new Error("The requested intake field is not available.");
    }
    parent = parent[segment];
  }
  if (operation === "append") {
    if (!Array.isArray(parent[finalSegment])) {
      throw new Error("Only list fields can receive appended intake values.");
    }
    parent[finalSegment].push(patch.value);
  } else if (operation === "remove") {
    if (Array.isArray(parent)) {
      parent.splice(finalSegment, 1);
    } else {
      delete parent[finalSegment];
    }
  } else {
    parent[finalSegment] = patch.value;
  }
  return next;
}

export function applyIntakePatches(draft, patches) {
  return patches.reduce((current, patch) => applyIntakePatch(current, patch), draft);
}

export function getMissingRequiredIntakeFields(draft) {
  const missing = [];
  const description = draft?.complaint?.description?.trim() || draft?.incident?.what_happened?.trim();
  const email = draft?.consumer?.contact?.email?.trim();
  const phone = draft?.consumer?.contact?.phone?.trim();
  if (!description) missing.push("complaint.description");
  if (!email && !phone) missing.push("consumer.contact");
  if (draft?.consents?.case_processing !== true) missing.push("consents.case_processing");
  return missing;
}

export function getReviewFlags(draft) {
  return Object.entries(draft?.provenance || {})
    .filter(([, metadata]) => metadata?.needs_review)
    .map(([path]) => path);
}

export function validateIntakeReview(draft) {
  const errors = {};
  const missing = getMissingRequiredIntakeFields(draft);
  if (missing.includes("complaint.description")) errors.description = "Add a clear description of what happened.";
  if (missing.includes("consumer.contact")) errors.contact = "Add an email or phone number to track this report.";
  if (missing.includes("consents.case_processing")) errors.caseProcessing = "Confirm that we may process this complaint.";
  return errors;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

function selectedContact(contact) {
  const email = clean(contact?.email);
  const phone = clean(contact?.phone);
  if (contact?.preferred_method === "phone" && phone) return { phone };
  if (contact?.preferred_method === "email" && email) return { email };
  if (email) return { email };
  if (phone) return { phone };
  return null;
}

export function buildComplaintPayloadFromDraft(draft) {
  const description = clean(draft?.complaint?.description) || clean(draft?.incident?.what_happened);
  const contact = selectedContact(draft?.consumer?.contact);
  if (!description || !contact) {
    throw new Error("The reviewed draft needs a description and a tracking contact.");
  }
  const prepared = clone(draft);
  prepared.synthetic_flag = false;
  prepared.environment = null;
  prepared.complaint.description = description;
  prepared.complaint.docket_number = null;
  prepared.complaint.source_channel = "voice";
  prepared.complaint.submitted_at = null;
  prepared.business.company_name = clean(prepared.business.company_name) || clean(prepared.business.seller_name) || null;
  prepared.transaction.amount_disputed = prepared.transaction.amount_disputed == null
    ? (prepared.transaction.amount_paid ?? prepared.transaction.refund_expected ?? null)
    : prepared.transaction.amount_disputed;
  prepared.consents.accepted_at = prepared.consents.accepted_at || new Date().toISOString();
  return {
    description,
    company_name: prepared.business.company_name,
    amount_involved: prepared.transaction.amount_disputed == null ? null : String(prepared.transaction.amount_disputed),
    ...(clean(prepared.consumer?.address?.state) ? { state: clean(prepared.consumer.address.state) } : {}),
    contact,
    intake: prepared,
  };
}

export function formatIntakePath(path) {
  return path
    .replace(/\[\d+\]/g, "")
    .split(".")
    .slice(-1)[0]
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
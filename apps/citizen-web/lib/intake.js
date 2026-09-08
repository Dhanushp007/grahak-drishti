const ALLOWED_PATH_PATTERN = /^(complaint|consumer|incident|business|transaction|resolution_attempts|requested_remedy|escalation|evidence|consents|data_quality|provenance)(?:\.[a-z][a-z0-9_]*|\[\d+\])*$/;
const SYSTEM_PATHS = new Set(["complaint.docket_number", "complaint.submitted_at"]);

export const GUIDED_INTAKE_SECTIONS = [
  {
    id: "story",
    label: "Your story",
    question: "What happened?",
    trackedPaths: ["complaint.description", "incident.what_happened", "incident.what_was_promised"],
    completionPaths: ["complaint.description", "incident.what_happened"],
  },
  {
    id: "business",
    label: "Business and purchase",
    question: "Which company, seller, or marketplace was involved?",
    trackedPaths: ["business.company_name", "business.seller_name", "transaction.product_or_service", "transaction.order_reference", "transaction.amount_disputed"],
    completionPaths: ["business.company_name", "business.seller_name"],
  },
  {
    id: "timing",
    label: "Dates and payment",
    question: "When did this happen and what amount was involved?",
    trackedPaths: ["incident.occurred_on", "incident.discovered_on", "transaction.transaction_date", "transaction.amount_paid", "transaction.amount_disputed", "transaction.payment_method"],
    completionPaths: ["incident.occurred_on", "transaction.amount_disputed", "transaction.amount_paid"],
  },
  {
    id: "contact",
    label: "Your details",
    question: "How can you receive updates about this report?",
    trackedPaths: ["consumer.full_name", "consumer.contact.email", "consumer.contact.phone", "consumer.address.city", "consumer.address.state"],
    completionPaths: ["consumer.contact.email", "consumer.contact.phone"],
  },
  {
    id: "resolution",
    label: "Resolution",
    question: "What would you like the business to do?",
    trackedPaths: ["resolution_attempts", "requested_remedy.primary", "requested_remedy.amount_requested", "evidence"],
    completionPaths: ["requested_remedy.primary", "resolution_attempts", "evidence"],
  },
  {
    id: "consent",
    label: "Consent",
    question: "Please confirm that we may process this complaint.",
    trackedPaths: ["consents.case_processing", "consents.aggregate_intelligence"],
    completionPaths: ["consents.case_processing"],
  },
];

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

const VOICE_SESSION_VERSION = 1;

export function serializeVoiceIntakeSession(draft, transcript = "", interimTranscript = "") {
  return JSON.stringify({
    version: VOICE_SESSION_VERSION,
    draft,
    transcript,
    interimTranscript,
  });
}

export function parseVoiceIntakeSession(serialized) {
  if (typeof serialized !== "string" || !serialized.trim()) return null;
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || parsed.version !== VOICE_SESSION_VERSION || !parsed.draft || Array.isArray(parsed.draft)) return null;
    return {
      draft: parsed.draft,
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
      interimTranscript: typeof parsed.interimTranscript === "string" ? parsed.interimTranscript : "",
    };
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isMeaningful(value) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeIntakePatchValue(path, operation, value) {
  if (path !== "complaint.language" || operation !== "set") return value;
  if (typeof value !== "string") {
    throw new Error("Choose English, Hindi, Telugu, Tamil, Malayalam, Kannada, or Bengali for the intake language.");
  }
  const language = value.trim().toLowerCase();
  if (language === "english" || language === "en") return "en";
  if (language === "hindi" || language === "hi") return "hi";
  if (language === "telugu" || language === "te") return "te";
  if (language === "tamil" || language === "ta") return "ta";
  if (language === "malayalam" || language === "ml") return "ml";
  if (language === "kannada" || language === "kn") return "kn";
  if (language === "bengali" || language === "bangla" || language === "bn") return "bn";
  throw new Error("Choose English, Hindi, Telugu, Tamil, Malayalam, Kannada, or Bengali for the intake language.");
}

function mergeNormalizedValue(current, normalized) {
  if (normalized === undefined) return current;
  if (Array.isArray(current) && Array.isArray(normalized)) {
    if (!normalized.length) return current;
    return Array.from({ length: Math.max(current.length, normalized.length) }, (_, index) => (
      index < normalized.length
        ? mergeNormalizedValue(current[index], normalized[index])
        : current[index]
    ));
  }
  if (
    current
    && normalized
    && typeof current === "object"
    && typeof normalized === "object"
    && !Array.isArray(current)
    && !Array.isArray(normalized)
  ) {
    const keys = new Set([...Object.keys(current), ...Object.keys(normalized)]);
    return Object.fromEntries([...keys].map((key) => [
      key,
      mergeNormalizedValue(current[key], normalized[key]),
    ]));
  }
  return isMeaningful(normalized) || !isMeaningful(current) ? normalized : current;
}

export function mergeNormalizedIntakeDraft(current, normalized) {
  return mergeNormalizedValue(current, normalized);
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
    parent[finalSegment] = normalizeIntakePatchValue(patch.path, operation, patch.value);
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

export function hasIntakeStory(draft) {
  return Boolean(
    draft?.complaint?.description?.trim()
    || draft?.incident?.what_happened?.trim(),
  );
}

export function getIntakeNormalizationError(response, body) {
  if (response?.ok && body?.draft && ["ok", "needs_review"].includes(body.status)) {
    return "";
  }
  if (body?.error?.message) return body.error.message;
  if (body?.status === "provider_unavailable") {
    return "Voice review is temporarily unavailable. Your captured draft is still here.";
  }
  if (body?.status === "invalid_provider_output") {
    return "Voice review returned an invalid result. Your captured draft is still here.";
  }
  return "The draft could not be prepared for review.";
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

export function getIntakePathValue(draft, path) {
  return pathSegments(path).reduce((value, segment) => value?.[segment], draft);
}

function hasIntakeValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "boolean") return value;
  return value !== null && value !== undefined;
}

export function getGuidedIntakeProgress(draft) {
  const sections = GUIDED_INTAKE_SECTIONS.map((section) => {
    const capturedPaths = section.trackedPaths.filter((path) => hasIntakeValue(getIntakePathValue(draft, path)));
    const complete = section.completionPaths.some((path) => hasIntakeValue(getIntakePathValue(draft, path)));
    return {
      ...section,
      capturedCount: capturedPaths.length,
      totalCount: section.trackedPaths.length,
      complete,
    };
  });
  const currentSectionIndex = sections.findIndex((section) => !section.complete);
  const activeSectionIndex = currentSectionIndex === -1 ? sections.length - 1 : currentSectionIndex;
  const allSectionsComplete = currentSectionIndex === -1;
  return {
    sections,
    activeSection: allSectionsComplete
      ? { ...sections[activeSectionIndex], question: "Everything is captured. Review your details before submitting." }
      : sections[activeSectionIndex],
    capturedCount: sections.reduce((total, section) => total + section.capturedCount, 0),
    totalCount: sections.reduce((total, section) => total + section.totalCount, 0),
  };
}
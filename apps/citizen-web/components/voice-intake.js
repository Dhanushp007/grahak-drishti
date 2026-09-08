"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, CheckCircle2, CircleAlert, FileText, HandCoins, LoaderCircle, Mic, MicOff, RotateCcw, Send, ShieldCheck, ShoppingBag, Square, UserRound, Volume2 } from "lucide-react";

import {
  applyIntakePatch,
  buildComplaintPayloadFromDraft,
  createInitialIntakeDraft,
  formatIntakePath,
  getGuidedIntakeProgress,
  getIntakeNormalizationError,
  getIntakePathValue,
  mergeNormalizedIntakeDraft,
  getReviewFlags,
  parseVoiceIntakeSession,
  serializeVoiceIntakeSession,
  hasIntakeStory,
  validateIntakeReview,
} from "../lib/intake.js";
import {
  buildConsultantContinuationPrompt,
  discardConsultantHandoff,
  getConsultantHandoffSummary,
  seedDraftFromConsultantHandoff,
} from "../lib/consultant-handoff.js";
import {
  connectGeminiLive,
  buildLiveToolResponse,
  getLiveInputTranscription,
  getLiveInterimInputTranscription,
  getLiveOutputTranscription,
  getLiveToolCalls,
  parseLiveToolCallArgs,
  playPcmAudioChunk,
  requestLiveToken,
  sendOpeningPrompt,
  sendTextMessage,
  stopPcmAudio,
  startMicrophoneInput,
} from "../lib/gemini-live.js";

const initialPlayback = { nextStartTime: 0 };
const VOICE_SESSION_STORAGE_KEY = "gd-voice-intake-session-v1";

function readPersistedVoiceSession() {
  if (typeof window === "undefined") return null;
  try {
    return parseVoiceIntakeSession(window.sessionStorage.getItem(VOICE_SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistVoiceSession(draft, transcript, interimTranscript) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VOICE_SESSION_STORAGE_KEY, serializeVoiceIntakeSession(draft, transcript, interimTranscript));
  } catch {
    return;
  }
}

function clearPersistedVoiceSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(VOICE_SESSION_STORAGE_KEY);
  } catch {
    return;
  }
}

const LIVE_FIELD_SECTIONS = [
  {
    id: "story",
    label: "Your story",
    description: "The facts you want recorded",
    icon: FileText,
    fields: [
      { path: "complaint.description", label: "Main description", multiline: true, required: true, placeholder: "Waiting for your story" },
      { path: "incident.what_happened", label: "What happened in detail", multiline: true, placeholder: "Captured from the conversation" },
      { path: "incident.what_was_promised", label: "What was promised", multiline: true, optional: true, placeholder: "Optional" },
      { path: "incident.urgency", label: "Urgency", type: "select", optional: true, options: [["low", "Low"], ["medium", "Medium"], ["high", "High"]] },
    ],
  },
  {
    id: "business",
    label: "Business and purchase",
    description: "Who and what this concerns",
    icon: ShoppingBag,
    fields: [
      { path: "business.company_name", label: "Company or marketplace", oneOf: "business", placeholder: "Company or marketplace" },
      { path: "business.seller_name", label: "Seller or service provider", oneOf: "business", placeholder: "Seller or service provider" },
      { path: "business.marketplace_or_channel", label: "Where you bought it", optional: true, placeholder: "Optional" },
      { path: "business.website_or_app", label: "Website or app", optional: true, placeholder: "Optional" },
      { path: "transaction.product_or_service", label: "Product or service", optional: true, placeholder: "Optional" },
      { path: "transaction.product_identifier", label: "Product ID", optional: true, placeholder: "Optional" },
      { path: "transaction.order_reference", label: "Order or booking reference", optional: true, placeholder: "Optional" },
      { path: "transaction.invoice_reference", label: "Invoice reference", optional: true, placeholder: "Optional" },
    ],
  },
  {
    id: "timing",
    label: "Dates and payment",
    description: "When it happened and what was paid",
    icon: CalendarDays,
    fields: [
      { path: "incident.occurred_on", label: "Incident date", type: "date", optional: true },
      { path: "incident.discovered_on", label: "Date you noticed", type: "date", optional: true },
      { path: "transaction.transaction_date", label: "Transaction date", type: "date", optional: true },
      { path: "transaction.delivery_date", label: "Delivery date", type: "date", optional: true },
      { path: "transaction.cancellation_date", label: "Cancellation date", type: "date", optional: true },
      { path: "transaction.amount_paid", label: "Amount paid (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "transaction.amount_disputed", label: "Amount disputed (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "transaction.refund_expected", label: "Refund expected (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "transaction.refund_received", label: "Refund received (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "transaction.remaining_loss", label: "Remaining loss (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "transaction.payment_method", label: "Payment method", optional: true, placeholder: "Optional" },
      { path: "transaction.payment_reference_last_four", label: "Payment reference ending", type: "text", optional: true, placeholder: "Last four digits" },
      { path: "incident.is_recurring", label: "Has this happened before?", type: "select", valueType: "boolean", optional: true, options: [["true", "Yes"], ["false", "No"]] },
    ],
  },
  {
    id: "contact",
    label: "Your details",
    description: "A private way to follow up",
    icon: UserRound,
    fields: [
      { path: "consumer.full_name", label: "Name", optional: true, placeholder: "Optional" },
      { path: "consumer.contact.email", label: "Email", type: "email", oneOf: "contact", placeholder: "Email for updates" },
      { path: "consumer.contact.phone", label: "Phone", type: "tel", oneOf: "contact", placeholder: "Phone for updates" },
      { path: "consumer.contact.preferred_method", label: "Preferred contact", type: "select", optional: true, options: [["email", "Email"], ["phone", "Phone"]] },
      { path: "consumer.address.line1", label: "Address line 1", optional: true, placeholder: "Optional" },
      { path: "consumer.address.line2", label: "Address line 2", optional: true, placeholder: "Optional" },
      { path: "consumer.address.city", label: "City", optional: true, placeholder: "Optional" },
      { path: "consumer.address.district", label: "District", optional: true, placeholder: "Optional" },
      { path: "consumer.address.state", label: "State", optional: true, placeholder: "Optional" },
      { path: "consumer.address.postal_code", label: "Postal code", optional: true, placeholder: "Optional" },
    ],
  },
  {
    id: "resolution",
    label: "Resolution and evidence",
    description: "What you tried and what you need",
    icon: HandCoins,
    fields: [
      { path: "requested_remedy.primary", label: "Requested remedy", optional: true, placeholder: "Refund, replacement, explanation" },
      { path: "requested_remedy.amount_requested", label: "Amount requested (INR)", type: "number", optional: true, placeholder: "0.00" },
      { path: "requested_remedy.other_requests", label: "Other requests", valueType: "array", multiline: true, optional: true, placeholder: "One request per line" },
      { path: "resolution_attempts", label: "Support attempts", displayOnly: true, displayType: "count", optional: true },
      { path: "evidence", label: "Evidence described", displayOnly: true, displayType: "count", optional: true },
      { path: "escalation.previous_authorities_contacted", label: "Authorities contacted", displayOnly: true, displayType: "list", optional: true },
      { path: "escalation.preferred_next_step", label: "Preferred next step", optional: true, placeholder: "Optional" },
    ],
  },
  {
    id: "consent",
    label: "Consent",
    description: "Your choices before submission",
    icon: ShieldCheck,
    fields: [
      { path: "consents.case_processing", label: "Allow complaint processing", type: "checkbox", required: true },
      { path: "consents.aggregate_intelligence", label: "Allow an anonymized issue signal", type: "checkbox", optional: true },
    ],
  },
];

function coerceToolValue(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function hasLiveValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "boolean") return value;
  return value !== null && value !== undefined;
}

function fieldNeedsReview(path, reviewFlags) {
  return reviewFlags.some((flag) => flag === path || flag.startsWith(`${path}.`) || path.startsWith(`${flag}.`));
}

function liveFieldValue(value) {
  if (Array.isArray(value)) return value.join("\n");
  return value ?? "";
}

function listFieldValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function liveFieldSummary(value, field) {
  if (field.displayType === "count") {
    return value?.length ? `${value.length} captured` : "Nothing added yet";
  }
  if (field.displayType === "list") {
    const displayValue = listFieldValue(value);
    return displayValue || "Nothing provided";
  }
  if (value === null || value === undefined || value === "") return "Not provided yet";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function LiveDraftField({ draft, field, reviewFlags, onChange, isUpdated }) {
  const value = getIntakePathValue(draft, field.path);
  const hasValue = hasLiveValue(value);
  const needsReview = fieldNeedsReview(field.path, reviewFlags);
  const status = needsReview ? "Needs review" : hasValue ? "Captured" : field.oneOf ? "One needed" : field.optional ? "Optional" : "Waiting";
  const statusClass = needsReview ? "needs-review" : hasValue ? "captured" : "waiting";
  const fieldId = `live-${field.path.replaceAll(".", "-").replaceAll("[", "-").replaceAll("]", "")}`;

  function changeValue(event) {
    let nextValue = event.target.value;
    if (field.valueType === "boolean") nextValue = nextValue === "" ? null : nextValue === "true";
    if (field.valueType === "array") nextValue = nextValue.split("\n").map((item) => item.trim()).filter(Boolean);
    if (field.type === "number") nextValue = nextValue === "" ? null : nextValue;
    onChange(field.path, nextValue);
  }

  if (field.type === "checkbox") {
    return (
      <label className={`live-checkbox ${needsReview ? "needs-review" : ""} ${isUpdated ? "live-field-updated" : ""}`} htmlFor={fieldId}>
        <input id={fieldId} type="checkbox" checked={value === true} onChange={(event) => onChange(field.path, event.target.checked)} />
        <span className="live-checkbox-copy"><span>{field.label}</span><small>{field.optional ? "Optional" : "Required"}</small></span>
        <span className={`live-field-status ${statusClass}`}>{status}</span>
      </label>
    );
  }

  return (
    <div className={`live-field ${needsReview ? "needs-review" : ""} ${isUpdated ? "live-field-updated" : ""}`}>
      <div className="live-field-heading">
        <label htmlFor={fieldId}>{field.label}{field.required && <span> *</span>}</label>
        <span className={`live-field-status ${statusClass}`}>{status}</span>
      </div>
      {field.displayOnly ? <div className="live-field-readonly">{liveFieldSummary(value, field)}</div> : field.type === "select" ? (
        <select id={fieldId} value={liveFieldValue(value)} onChange={changeValue} aria-label={field.label}>
          <option value="">Not provided yet</option>
          {field.options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      ) : field.multiline ? (
        <textarea id={fieldId} value={liveFieldValue(value)} onChange={changeValue} placeholder={field.placeholder} rows={2} />
      ) : (
        <input id={fieldId} type={field.type || "text"} value={liveFieldValue(value)} onChange={changeValue} placeholder={field.placeholder} />
      )}
    </div>
  );
}

function LiveDraftPanel({ draft, reviewFlags, onChange, lastUpdatedPath }) {
  const progress = getGuidedIntakeProgress(draft);
  const percent = progress.totalCount ? Math.round((progress.capturedCount / progress.totalCount) * 100) : 0;

  return (
    <aside className="live-draft-panel" aria-labelledby="live-draft-title">
      <div className="live-draft-header">
        <div><p className="eyebrow">Live draft</p><h3 id="live-draft-title">Complaint details</h3></div>
        <span className="live-draft-count">{progress.capturedCount}<small>/{progress.totalCount}</small></span>
      </div>
      <div className="live-draft-progress" aria-label={`${percent}% of tracked details captured`}><span style={{ width: `${percent}%` }} /></div>
      <div className="live-next-question"><span>Next question</span><strong>{progress.activeSection.question}</strong></div>
      <ol className="guided-steps" aria-label="Intake progress">
        {progress.sections.map((section, index) => (
          <li key={section.id} className={`${section.complete ? "is-complete" : ""} ${progress.activeSection.id === section.id ? "is-active" : ""}`} aria-current={progress.activeSection.id === section.id ? "step" : undefined}>
            <span className="guided-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="guided-step-label">{section.label}</span>
            <span className="guided-step-status">{section.complete ? <CheckCircle2 size={15} /> : `${section.capturedCount}/${section.totalCount}`}</span>
          </li>
        ))}
      </ol>
      <div className="live-draft-fields">
        {LIVE_FIELD_SECTIONS.map((section) => {
          const sectionProgress = progress.sections.find((item) => item.id === section.id);
          const SectionIcon = section.icon;
          return (
            <section className={`live-field-section ${progress.activeSection.id === section.id ? "is-active" : ""}`} key={section.id}>
              <div className="live-field-section-heading">
                <span className="live-section-icon"><SectionIcon size={16} /></span>
                <div><h4>{section.label}</h4><p>{section.description}</p></div>
                <span className="live-section-count">{sectionProgress.capturedCount}/{sectionProgress.totalCount}</span>
              </div>
              <div className="live-fields-grid">
                {section.fields.map((field) => <LiveDraftField key={field.path} draft={draft} field={field} reviewFlags={reviewFlags} onChange={onChange} isUpdated={lastUpdatedPath === field.path} />)}
              </div>
            </section>
          );
        })}
      </div>
      <p className="live-draft-note"><ShieldCheck size={14} /> This is a private working draft. You will review every detail before submitting.</p>
    </aside>
  );
}

function ReviewField({ label, value, onChange, multiline = false, type = "text", reviewFlag }) {
  const Input = multiline ? "textarea" : "input";
  return (
    <div className="field-group">
      <label>{label}{reviewFlag && <span className="review-flag"> · Please verify</span>}</label>
      <Input type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export default function VoiceIntake({ onSubmitDraft, onUseText, initialHandoff = null, onDiscardHandoff }) {
  const [draft, setDraft] = useState(createInitialIntakeDraft);
  const [transcript, setTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [reviewErrors, setReviewErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [lastUpdatedPath, setLastUpdatedPath] = useState("");
  const draftRef = useRef(draft);
  const transcriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const sessionRef = useRef(null);
  const microphoneRef = useRef(null);
  const playbackContextRef = useRef(null);
  const playbackRef = useRef(initialPlayback);
  const appliedHandoffRef = useRef(null);
  const playbackResumeTimerRef = useRef(null);

  function updateDraft(nextDraft, updatedPath = "") {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    persistVoiceSession(nextDraft, transcriptRef.current, interimTranscriptRef.current);
    if (updatedPath) setLastUpdatedPath(updatedPath);
  }

  function appendTranscript(text) {
    const normalizedText = text?.trim();
    if (!normalizedText) return;
    const nextTranscript = `${transcriptRef.current} ${normalizedText}`.trim();
    transcriptRef.current = nextTranscript;
    setTranscript(nextTranscript);
    persistVoiceSession(draftRef.current, nextTranscript, interimTranscriptRef.current);
  }

  function setInterimText(text) {
    const nextText = text?.trim() || "";
    interimTranscriptRef.current = nextText;
    setInterimTranscript(nextText);
    persistVoiceSession(draftRef.current, transcriptRef.current, nextText);
  }

  function commitInterimTranscript() {
    if (!interimTranscriptRef.current) return;
    appendTranscript(interimTranscriptRef.current);
    setInterimText("");
  }

  function transcriptSnapshot() {
    return `${transcriptRef.current} ${interimTranscriptRef.current}`.trim();
  }

  function updatePath(path, value) {
    try {
      updateDraft(applyIntakePatch(draftRef.current, { path, value }), path);
      setReviewErrors((current) => ({ ...current, [path]: "" }));
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "That field could not be updated.");
    }
  }

  useEffect(() => {
    if (!initialHandoff || appliedHandoffRef.current === initialHandoff.createdAt) return;
    updateDraft(seedDraftFromConsultantHandoff(createInitialIntakeDraft(), initialHandoff));
    appliedHandoffRef.current = initialHandoff.createdAt;
  }, [initialHandoff]);

  function stopResources() {
    microphoneRef.current?.stop();
    microphoneRef.current = null;
    sessionRef.current?.close?.();
    sessionRef.current = null;
    if (playbackResumeTimerRef.current) {
      window.clearTimeout(playbackResumeTimerRef.current);
      playbackResumeTimerRef.current = null;
    }
    microphoneRef.current?.setMuted?.(false);
    if (playbackContextRef.current) {
      stopPcmAudio(playbackContextRef.current, playbackRef.current);
      void playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  }

  useEffect(() => {
    const savedSession = readPersistedVoiceSession();
    if (!savedSession) return;
    draftRef.current = savedSession.draft;
    setDraft(savedSession.draft);
    transcriptRef.current = savedSession.transcript;
    setTranscript(savedSession.transcript);
    interimTranscriptRef.current = savedSession.interimTranscript;
    setInterimTranscript(savedSession.interimTranscript);
  }, []);

  useEffect(() => () => stopResources(), []);

  function handleToolCall(message) {
    const calls = getLiveToolCalls(message);
    if (!calls.length) return;
    const functionResponses = calls.map((call) => {
      try {
        if (!call?.id) throw new Error("The voice assistant returned a tool call without an id.");
        if (call?.name && call.name !== "patch_intake_draft") throw new Error("The voice assistant requested an unsupported tool.");
        const args = parseLiveToolCallArgs(call);
        const patch = {
          ...args,
          value: coerceToolValue(args.value),
        };
        updateDraft(applyIntakePatch(draftRef.current, patch), patch.path);
        return buildLiveToolResponse(call, { output: { result: "Draft field updated", path: patch.path } });
      } catch (patchError) {
        return buildLiveToolResponse(call, { error: patchError instanceof Error ? patchError.message : "Draft field was rejected" });
      }
    });
    if (!sessionRef.current || functionResponses.some((response) => !response.id)) {
      setError("The voice assistant returned an incomplete draft update. Your conversation is still available for review.");
      return;
    }
    try {
      sessionRef.current.sendToolResponse({ functionResponses });
    } catch (toolResponseError) {
      setError(toolResponseError instanceof Error ? toolResponseError.message : "The voice assistant could not confirm the draft update.");
    }
  }

  function handleLiveMessage(message) {
    const input = getLiveInputTranscription(message);
    const interim = getLiveInterimInputTranscription(message);
    const output = getLiveOutputTranscription(message);
    if (interim?.text) setInterimText(interim.text);
    if (input?.text) {
      if (input.finished === false) setInterimText(input.text);
      else {
        appendTranscript(input.text);
        setInterimText("");
      }
    }
    if (output?.text) setAssistantTranscript((current) => `${current} ${output.text}`.trim());
    if (message?.data) {
      microphoneRef.current?.setMuted?.(true);
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ latencyHint: "interactive" });
      }
      void playbackContextRef.current.resume();
      const playbackEnd = playPcmAudioChunk(playbackContextRef.current, message.data, playbackRef.current);
      if (playbackResumeTimerRef.current) window.clearTimeout(playbackResumeTimerRef.current);
      const resumeDelay = Math.max(120, (playbackEnd - playbackContextRef.current.currentTime) * 1000 + 120);
      playbackResumeTimerRef.current = window.setTimeout(() => {
        microphoneRef.current?.setMuted?.(false);
        playbackResumeTimerRef.current = null;
      }, resumeDelay);
    }
    handleToolCall(message);
  }

  async function startVoice() {
    setStatus("connecting");
    setError("");
    try {
      const token = await requestLiveToken();
      const session = await connectGeminiLive({
        token: token.token,
        model: token.model,
        callbacks: {
          onmessage: handleLiveMessage,
          onerror: (event) => {
            const detail = event?.error?.message || event?.message;
            setError(detail ? `Voice connection error: ${detail}` : "The voice connection was interrupted. Your local draft is saved in this browser tab.");
          },
          onclose: (event) => {
            commitInterimTranscript();
            if (event?.code && event.code !== 1000) {
              setError(event.code === 1006
                ? "Voice connection could not reach Gemini (1006). Check your internet or DNS connection. Your local draft is saved in this browser tab."
                : `Voice connection closed (${event.code}). Your local draft is saved in this browser tab.`);
            }
            setStatus((current) => current === "submitting" ? current : "ready");
          },
        },
      });
      sessionRef.current = session;
      microphoneRef.current = await startMicrophoneInput(session);
      setStatus("listening");
      sendOpeningPrompt(session, buildConsultantContinuationPrompt(initialHandoff));
    } catch (startError) {
      stopResources();
      setStatus("error");
      setError(startError instanceof Error ? startError.message : "Microphone access is unavailable. You can type instead.");
    }
  }

  function stopVoice() {
    commitInterimTranscript();
    stopResources();
    setStatus("ready");
  }

  function startFresh() {
    stopResources();
    updateDraft(createInitialIntakeDraft());
    appliedHandoffRef.current = null;
    discardConsultantHandoff();
    onDiscardHandoff?.();
    setError("");
    setTranscript("");
    setAssistantTranscript("");
    setInterimTranscript("");
    setStatus("ready");
  }

  function sendTypedMessage() {
    const message = typedMessage.trim();
    if (!message || !sessionRef.current) return;
    sendTextMessage(sessionRef.current, message);
    appendTranscript(message);
    setTypedMessage("");
  }

  async function prepareReview() {
    commitInterimTranscript();
    stopResources();
    setStatus("normalizing");
    setIsNormalizing(true);
    setError("");
    try {
      const capturedTranscript = transcriptSnapshot();
      if (!capturedTranscript && !hasIntakeStory(draftRef.current)) {
        throw new Error("No spoken complaint details were captured. Please answer the voice question or use the text form.");
      }
      const response = await fetch("/api/backend/api/v1/intake/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: draftRef.current, transcript: capturedTranscript || null, language_hint: draftRef.current.complaint.language || "auto" }),
      });
      const body = await response.json().catch(() => null);
      const normalizationError = getIntakeNormalizationError(response, body);
      if (normalizationError) {
        if (body?.draft && ["provider_unavailable", "invalid_provider_output"].includes(body.status)) {
          const capturedDraft = mergeNormalizedIntakeDraft(draftRef.current, body.draft);
          updateDraft({ ...capturedDraft, provider: body.provider || null, model: body.model || null });
          setError(`${normalizationError} You can review the captured fields below.`);
          setIsReviewing(true);
          setStatus("review");
          return;
        }
        throw new Error(normalizationError);
      }
      const normalizedDraft = mergeNormalizedIntakeDraft(draftRef.current, body.draft);
      updateDraft({ ...normalizedDraft, provider: body.provider || "gemini", model: body.model || null });
      setIsReviewing(true);
      setStatus("review");
    } catch (normalizeError) {
      setStatus("ready");
      setError(normalizeError instanceof Error ? normalizeError.message : "The draft could not be prepared for review.");
    } finally {
      setIsNormalizing(false);
    }
  }

  async function submitReviewedDraft(event) {
    event.preventDefault();
    const errors = validateIntakeReview(draftRef.current);
    setReviewErrors(errors);
    setSubmissionError("");
    if (Object.keys(errors).length) return;
    try {
      setStatus("submitting");
      await onSubmitDraft(buildComplaintPayloadFromDraft(draftRef.current));
      clearPersistedVoiceSession();
    } catch (submitError) {
      setStatus("review");
      setSubmissionError(submitError instanceof Error ? submitError.message : "The report could not be submitted.");
    }
  }

  function resetDraft() {
    const nextDraft = createInitialIntakeDraft();
    draftRef.current = nextDraft;
    transcriptRef.current = "";
    interimTranscriptRef.current = "";
    clearPersistedVoiceSession();
    stopResources();
    setDraft(nextDraft);
    setTranscript("");
    setInterimTranscript("");
    setAssistantTranscript("");
    setError("");
    setReviewErrors({});
    setSubmissionError("");
    setStatus("ready");
  }

  const reviewFlags = getReviewFlags(draft);
  const isListening = status === "listening";

  if (isReviewing) {
    return (
      <section className="voice-intake" aria-labelledby="voice-review-title">
        <div className="voice-heading">
          <div><p className="eyebrow">Step 02 · Review</p><h2 id="voice-review-title">Check every detail.</h2></div>
          <button className="text-button voice-back-button" type="button" onClick={() => setIsReviewing(false)}><RotateCcw size={15} /> Back to conversation</button>
        </div>
        <p className="voice-copy">This draft is private until you submit it. Edit anything that is wrong or unknown.</p>
        {error && <div className="review-notice" role="status"><CircleAlert size={18} /><span>{error}</span></div>}
        {reviewFlags.length > 0 && <div className="review-notice" role="status"><CircleAlert size={18} /><span>Please verify: {reviewFlags.map(formatIntakePath).join(", ")}.</span></div>}
        <form className="intake-review-form" onSubmit={submitReviewedDraft} noValidate>
          <fieldset className="review-section"><legend>What happened</legend>
            <ReviewField label="Your description" value={draft.complaint.description} onChange={(value) => updatePath("complaint.description", value)} multiline reviewFlag={reviewFlags.includes("complaint.description")} />
            <div className="two-column-fields">
              <ReviewField label="What was promised" value={draft.incident.what_was_promised} onChange={(value) => updatePath("incident.what_was_promised", value)} multiline />
              <ReviewField label="What happened in detail" value={draft.incident.what_happened} onChange={(value) => updatePath("incident.what_happened", value)} multiline />
            </div>
          </fieldset>
          <fieldset className="review-section"><legend>Business and transaction</legend>
            <div className="two-column-fields">
              <ReviewField label="Company or marketplace" value={draft.business.company_name} onChange={(value) => updatePath("business.company_name", value)} reviewFlag={reviewFlags.includes("business.company_name")} />
              <ReviewField label="Seller or service provider" value={draft.business.seller_name} onChange={(value) => updatePath("business.seller_name", value)} />
              <ReviewField label="Product or service" value={draft.transaction.product_or_service} onChange={(value) => updatePath("transaction.product_or_service", value)} />
              <ReviewField label="Order or booking reference" value={draft.transaction.order_reference} onChange={(value) => updatePath("transaction.order_reference", value)} />
              <ReviewField label="Amount disputed (INR)" value={draft.transaction.amount_disputed} onChange={(value) => updatePath("transaction.amount_disputed", value)} type="number" />
              <ReviewField label="Payment method" value={draft.transaction.payment_method} onChange={(value) => updatePath("transaction.payment_method", value)} />
            </div>
          </fieldset>
          <fieldset className="review-section"><legend>Consumer and contact</legend>
            <div className="two-column-fields">
              <ReviewField label="Name" value={draft.consumer.full_name} onChange={(value) => updatePath("consumer.full_name", value)} />
              <ReviewField label="State" value={draft.consumer.address.state} onChange={(value) => updatePath("consumer.address.state", value)} />
              <ReviewField label="Email" value={draft.consumer.contact.email} onChange={(value) => updatePath("consumer.contact.email", value)} type="email" reviewFlag={reviewFlags.includes("consumer.contact")} />
              <ReviewField label="Phone" value={draft.consumer.contact.phone} onChange={(value) => updatePath("consumer.contact.phone", value)} type="tel" reviewFlag={reviewFlags.includes("consumer.contact")} />
            </div>
            <div className="field-group"><label htmlFor="preferredTrackingContact">Preferred tracking contact</label><select id="preferredTrackingContact" value={draft.consumer.contact.preferred_method || ""} onChange={(event) => updatePath("consumer.contact.preferred_method", event.target.value || null)}><option value="">Choose automatically</option><option value="email">Email</option><option value="phone">Phone</option></select></div>
            {reviewErrors.contact && <p className="field-error">{reviewErrors.contact}</p>}
          </fieldset>
          <fieldset className="review-section"><legend>Resolution and remedy</legend>
            <div className="two-column-fields">
              <ReviewField label="Requested remedy" value={draft.requested_remedy.primary} onChange={(value) => updatePath("requested_remedy.primary", value)} />
              <ReviewField label="Amount requested (INR)" value={draft.requested_remedy.amount_requested} onChange={(value) => updatePath("requested_remedy.amount_requested", value)} type="number" />
            </div>
            <ReviewField label="Other requests, one per line" value={liveFieldValue(draft.requested_remedy.other_requests)} onChange={(value) => updatePath("requested_remedy.other_requests", value.split("\n").map((item) => item.trim()).filter(Boolean))} multiline />
            <p className="review-meta">{draft.resolution_attempts.length} resolution attempt{draft.resolution_attempts.length === 1 ? "" : "s"} captured · {draft.evidence.length} evidence item{draft.evidence.length === 1 ? "" : "s"} described</p>
          </fieldset>
          <fieldset className="review-section consent-section"><legend>Before you submit</legend>
            <label className="check-row"><input type="checkbox" checked={draft.consents.case_processing} onChange={(event) => updatePath("consents.case_processing", event.target.checked)} /> <span>I confirm this information is mine and allow GRAHAK-DRISHTI to process this complaint.</span></label>
            {reviewErrors.caseProcessing && <p className="field-error">{reviewErrors.caseProcessing}</p>}
            <label className="check-row"><input type="checkbox" checked={draft.consents.aggregate_intelligence} onChange={(event) => updatePath("consents.aggregate_intelligence", event.target.checked)} /> <span>Allow an anonymized aggregate signal to help identify similar consumer issues.</span></label>
            <p className="review-meta">Official authority sharing is not automatic. This first version records your complaint privately and does not contact a seller, regulator, NCH, e-Jagriti, or consumer commission.</p>
            <p className="privacy-note"><ShieldCheck size={16} /> Audio is not retained by this application. This unfinished draft stays only in this browser tab and is cleared after submission.</p>
          </fieldset>
          {submissionError && <p className="submission-error" role="alert">{submissionError}</p>}
          <button className="submit-button" type="submit" disabled={status === "submitting"}>{status === "submitting" ? <><LoaderCircle className="spin" size={18} /> Creating docket...</> : <>Create my docket <Send size={17} /></>}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="voice-intake" aria-labelledby="voice-intake-title">
      <div className="voice-heading"><div><p className="eyebrow">Step 01 · Speak</p><h2 id="voice-intake-title">Talk it through.</h2></div><span className="voice-language"><Volume2 size={15} /> English · Hindi · Telugu · Tamil · Malayalam · Kannada · Bengali</span></div>
      <p className="voice-copy">I will ask one question at a time and build a draft for you to review. You stay in control.</p>
      {initialHandoff && <div className="voice-handoff-notice"><div><strong>Your consultant notes are ready.</strong><p>{getConsultantHandoffSummary(initialHandoff).slice(0, 320)}</p><small>These are unverified notes. Check every detail before submitting.</small></div><button className="text-button" type="button" onClick={startFresh}>Start fresh</button></div>}
      <div className="voice-workspace">
        <div className="voice-conversation-column">
          <div className={`voice-status voice-status-${status}`} aria-live="polite">
            <span className="voice-status-icon" aria-hidden="true">{isListening ? <Mic size={21} /> : status === "connecting" || status === "normalizing" ? <LoaderCircle className="spin" size={21} /> : status === "error" ? <MicOff size={21} /> : <ShieldCheck size={21} />}</span>
            <span><strong>{isListening ? "Listening" : status === "connecting" ? "Connecting securely" : status === "normalizing" ? "Preparing your review" : status === "error" ? "Voice is unavailable" : "Ready when you are"}</strong><small>{isListening ? "You can pause whenever you need." : "Your microphone is used only for this conversation."}</small></span>
          </div>
          {error && <div className="voice-error" role="alert"><CircleAlert size={17} /> {error}</div>}
          <div className="voice-controls">
            <button className={isListening ? "voice-stop-button" : "voice-start-button"} type="button" onClick={isListening ? stopVoice : startVoice} disabled={status === "connecting" || status === "normalizing"}>
              {isListening ? <><Square size={16} fill="currentColor" /> Pause listening</> : <><Mic size={18} /> Start speaking</>}
            </button>
            <button className="text-button" type="button" onClick={onUseText}>Use the text form instead</button>
            <button className="text-button" type="button" onClick={resetDraft}>Clear local draft</button>
          </div>
          <div className="transcript-panel" aria-live="polite">
            <p className="transcript-label">Conversation notes</p>
            <p className="transcript-text">{transcript || "Your words will appear here after you speak."}{interimTranscript && <em> {interimTranscript}</em>}</p>
            {assistantTranscript && <p className="assistant-transcript"><strong>Assistant</strong> {assistantTranscript}</p>}
          </div>
          <div className="typed-follow-up">
            <label htmlFor="typedFollowUp">Type a correction or answer</label>
            <div className="typed-follow-up-row"><input id="typedFollowUp" value={typedMessage} onChange={(event) => setTypedMessage(event.target.value)} placeholder="For example: The amount was Rs. 2,499" /><button className="icon-button" type="button" onClick={sendTypedMessage} disabled={!typedMessage.trim() || !sessionRef.current} aria-label="Send correction" title="Send correction"><Send size={17} /></button></div>
          </div>
          <div className="voice-review-action"><div><strong>Ready to check the draft?</strong><p>Review every captured detail before anything is submitted.</p></div><button className="primary-button" type="button" onClick={prepareReview} disabled={isNormalizing}><Check size={17} /> Review draft</button></div>
        </div>
        <LiveDraftPanel draft={draft} reviewFlags={getReviewFlags(draft)} onChange={updatePath} lastUpdatedPath={lastUpdatedPath} />
      </div>
      <p className="voice-disclosure">Voice audio is sent to Google Gemini for this live session. The application does not retain your audio or unfinished transcript. Review the temporary consultant notes before submitting.</p>
    </section>
  );
}
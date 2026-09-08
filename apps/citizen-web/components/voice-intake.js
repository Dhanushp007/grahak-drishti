"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Mic, MicOff, RotateCcw, Send, ShieldCheck, Square, Volume2 } from "lucide-react";

import {
  applyIntakePatch,
  buildComplaintPayloadFromDraft,
  createInitialIntakeDraft,
  formatIntakePath,
  getReviewFlags,
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
  playPcmAudioChunk,
  requestLiveToken,
  sendOpeningPrompt,
  sendTextMessage,
  startMicrophoneInput,
} from "../lib/gemini-live.js";

const initialPlayback = { nextStartTime: 0 };

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
  const draftRef = useRef(draft);
  const sessionRef = useRef(null);
  const microphoneRef = useRef(null);
  const playbackContextRef = useRef(null);
  const playbackRef = useRef(initialPlayback);
  const appliedHandoffRef = useRef(null);

  function updateDraft(nextDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  function updatePath(path, value) {
    try {
      updateDraft(applyIntakePatch(draftRef.current, { path, value }));
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
    if (playbackContextRef.current) {
      void playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  }

  useEffect(() => () => stopResources(), []);

  function handleToolCall(message) {
    const calls = message?.toolCall?.functionCalls || message?.tool_call?.function_calls || [];
    if (!calls.length || !sessionRef.current) return;
    const functionResponses = calls.map((call) => {
      try {
        const args = typeof call.args === "string" ? JSON.parse(call.args) : call.args || {};
        const patch = {
          ...args,
          value: coerceToolValue(args.value),
        };
        updateDraft(applyIntakePatch(draftRef.current, patch));
        return { id: call.id, name: call.name, response: { result: "Draft field updated", path: patch.path } };
      } catch (patchError) {
        return { id: call.id, name: call.name, response: { error: patchError instanceof Error ? patchError.message : "Draft field was rejected" } };
      }
    });
    sessionRef.current.sendToolResponse({ functionResponses });
  }

  function handleLiveMessage(message) {
    const serverContent = message?.serverContent || message?.server_content;
    const input = serverContent?.inputTranscription || serverContent?.input_transcription;
    const interim = serverContent?.interimInputTranscription || serverContent?.interim_input_transcription;
    const output = serverContent?.outputTranscription || serverContent?.output_transcription;
    if (interim?.text) setInterimTranscript(interim.text);
    if (input?.text) {
      setTranscript((current) => `${current} ${input.text}`.trim());
      setInterimTranscript("");
    }
    if (output?.text) setAssistantTranscript((current) => `${current} ${output.text}`.trim());
    if (message?.data) {
      if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
      void playbackContextRef.current.resume();
      playPcmAudioChunk(playbackContextRef.current, message.data, playbackRef.current);
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
            setError(detail ? `Voice connection error: ${detail}` : "The voice connection was interrupted. Your draft is still here.");
          },
          onclose: (event) => {
            if (event?.code && event.code !== 1000) {
              setError(`Voice connection closed (${event.code}). Your draft is still here.`);
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
    setTranscript((current) => `${current} ${message}`.trim());
    setTypedMessage("");
  }

  async function prepareReview() {
    stopResources();
    setStatus("normalizing");
    setIsNormalizing(true);
    setError("");
    try {
      const response = await fetch("/api/backend/api/v1/intake/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: draftRef.current, transcript: transcript.trim() || null, language_hint: draftRef.current.complaint.language || "auto" }),
      });
      const body = await response.json().catch(() => null);
      if (body?.draft) updateDraft({ ...body.draft, provider: body.provider || "gemini", model: body.model || null });
      if (!response.ok && !body?.draft) throw new Error(body?.error?.message || "The draft could not be prepared for review.");
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
    } catch (submitError) {
      setStatus("review");
      setSubmissionError(submitError instanceof Error ? submitError.message : "The report could not be submitted.");
    }
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
            <ReviewField label="Other requests, one per line" value={(draft.requested_remedy.other_requests || []).join("\n")} onChange={(value) => updatePath("requested_remedy.other_requests", value.split("\n").map((item) => item.trim()).filter(Boolean))} multiline />
            <p className="review-meta">{draft.resolution_attempts.length} resolution attempt{draft.resolution_attempts.length === 1 ? "" : "s"} captured · {draft.evidence.length} evidence item{draft.evidence.length === 1 ? "" : "s"} described</p>
          </fieldset>
          <fieldset className="review-section consent-section"><legend>Before you submit</legend>
            <label className="check-row"><input type="checkbox" checked={draft.consents.case_processing} onChange={(event) => updatePath("consents.case_processing", event.target.checked)} /> <span>I confirm this information is mine and allow GRAHAK-DRISHTI to process this complaint.</span></label>
            {reviewErrors.caseProcessing && <p className="field-error">{reviewErrors.caseProcessing}</p>}
            <label className="check-row"><input type="checkbox" checked={draft.consents.aggregate_intelligence} onChange={(event) => updatePath("consents.aggregate_intelligence", event.target.checked)} /> <span>Allow an anonymized aggregate signal to help identify similar consumer issues.</span></label>
            <p className="review-meta">Official authority sharing is not automatic. This first version records your complaint privately and does not contact a seller, regulator, NCH, e-Jagriti, or consumer commission.</p>
            <p className="privacy-note"><ShieldCheck size={16} /> Audio and unfinished drafts are not retained by this application. Your confirmed intake remains private to your case.</p>
          </fieldset>
          {submissionError && <p className="submission-error" role="alert">{submissionError}</p>}
          <button className="submit-button" type="submit" disabled={status === "submitting"}>{status === "submitting" ? <><LoaderCircle className="spin" size={18} /> Creating docket...</> : <>Create my docket <Send size={17} /></>}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="voice-intake" aria-labelledby="voice-intake-title">
      <div className="voice-heading"><div><p className="eyebrow">Step 01 · Speak</p><h2 id="voice-intake-title">Talk it through.</h2></div><span className="voice-language"><Volume2 size={15} /> English · Hindi · Hinglish</span></div>
      <p className="voice-copy">I will ask one question at a time and build a draft for you to review. You stay in control.</p>
      {initialHandoff && <div className="voice-handoff-notice"><div><strong>Your consultant notes are ready.</strong><p>{getConsultantHandoffSummary(initialHandoff).slice(0, 320)}</p><small>These are unverified notes. Check every detail before submitting.</small></div><button className="text-button" type="button" onClick={startFresh}>Start fresh</button></div>}
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
      <p className="voice-disclosure">Voice audio is sent to Google Gemini for this live session. The application does not retain your audio or unfinished transcript. Review the temporary consultant notes before submitting.</p>
    </section>
  );
}
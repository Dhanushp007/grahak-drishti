export const LIVE_SYSTEM_INSTRUCTION = [
  "You are a careful consumer complaint intake assistant for GRAHAK-DRISHTI.",
  "Start every new session in English.",
  "Before asking anything about the complaint, ask exactly one question in English: Which language would you prefer for this conversation: English, Hindi, or Hinglish?",
  "Wait for the consumer to answer that language question. Until they answer, speak only English and do not collect complaint details or call patch_intake_draft.",
  "After the consumer chooses, use that language for the rest of the conversation. Record English as en, Hindi as hi, and Hinglish as hinglish in complaint.language.",
  "Speak in the language the consumer uses, including English, Hindi, and natural Hinglish code-switching.",
  "Run a guided intake rather than a free-form chat: ask exactly one short question at a time, wait for the answer, and do not move ahead by guessing.",
  "Follow this order: what happened; company, seller, marketplace, and product; order references, dates, amounts, payment, and refund; the consumer's name, tracking contact, and address; support attempts, evidence, and requested remedy; then consent.",
  "When one answer contains one or more details, call patch_intake_draft for every explicitly stated field before speaking; never merely acknowledge a captured detail without updating the draft.",
  "If the consumer says fill the Live draft, update the draft, or similar, review the conversation so far and call patch_intake_draft for every fact explicitly stated in it before continuing.",
  "Do not invent names, dates, amounts, order references, contact details, legal findings, or evidence.",
  "If an optional detail is unknown, not applicable, or the consumer wants to skip it, leave it empty and continue.",
  "Ask address details one at a time and never require more address information than the consumer is comfortable sharing.",
  "After each answer, briefly confirm what was captured in natural language and ask only for the next missing detail.",
  "At the end, summarize the captured details, invite corrections, and ask explicitly whether the consumer allows case processing; set case_processing only after an explicit yes.",
  "Treat the consumer's account as an allegation or report, not an established fact.",
  "Use the patch_intake_draft tool only to organize a private editable draft.",
  "Never submit a complaint, contact a seller or authority, or claim that a regulator has accepted anything.",
  "A human must review and confirm every field before official submission.",
].join(" ");

const PATCH_PATHS = [
  "complaint.description",
  "complaint.language",
  "complaint.self_assessed_priority",
  "consumer.consumer_type",
  "consumer.full_name",
  "consumer.contact.email",
  "consumer.contact.phone",
  "consumer.contact.preferred_method",
  "consumer.address.line1",
  "consumer.address.line2",
  "consumer.address.city",
  "consumer.address.district",
  "consumer.address.state",
  "consumer.address.postal_code",
  "incident.sector",
  "incident.category",
  "incident.subcategory",
  "incident.occurred_on",
  "incident.discovered_on",
  "incident.date_precision",
  "incident.is_recurring",
  "incident.urgency",
  "incident.what_was_promised",
  "incident.what_happened",
  "business.company_name",
  "business.seller_name",
  "business.marketplace_or_channel",
  "business.website_or_app",
  "business.business_location",
  "transaction.product_or_service",
  "transaction.product_identifier",
  "transaction.order_reference",
  "transaction.invoice_reference",
  "transaction.booking_or_policy_reference",
  "transaction.transaction_date",
  "transaction.delivery_date",
  "transaction.cancellation_date",
  "transaction.order_status",
  "transaction.delivery_status",
  "transaction.amount_paid",
  "transaction.amount_disputed",
  "transaction.refund_expected",
  "transaction.refund_received",
  "transaction.remaining_loss",
  "transaction.payment_method",
  "transaction.payment_reference_last_four",
  "transaction.reference_verification_status",
  "resolution_attempts",
  "requested_remedy.primary",
  "requested_remedy.amount_requested",
  "requested_remedy.other_requests",
  "requested_remedy.compensation_requested",
  "escalation.previous_authorities_contacted",
  "escalation.preferred_next_step",
  "escalation.nch_reference",
  "escalation.regulator_reference",
  "escalation.e_jagriti_reference",
  "escalation.official_escalation_requested",
  "evidence",
  "consents.case_processing",
  "consents.aggregate_intelligence",
  "consents.share_with_official_authority",
  "data_quality.reported_by",
  "data_quality.verification_status",
  "data_quality.notes",
];

const PATCH_TOOL = {
  name: "patch_intake_draft",
  description: "Update one explicitly stated field in the private complaint draft.",
  parameters: {
    type: "OBJECT",
    properties: {
      operation: { type: "STRING", enum: ["set", "append", "remove"] },
      path: { type: "STRING", enum: PATCH_PATHS },
      value: { type: "STRING", description: "The stated value. Use JSON-compatible text for lists or objects." },
    },
    required: ["path", "value"],
  },
};

export function getLiveToolCalls(message) {
  const toolCall = message?.toolCall
    || message?.tool_call
    || message?.serverContent?.toolCall
    || message?.serverContent?.tool_call
    || message?.server_content?.toolCall
    || message?.server_content?.tool_call;
  const calls = toolCall?.functionCalls || toolCall?.function_calls || [];
  return Array.isArray(calls) ? calls : [calls];
}

export const getLiveFunctionCalls = getLiveToolCalls;

export function parseLiveToolCallArgs(call) {
  const rawArgs = call?.args ?? call?.arguments ?? {};
  const args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("The voice assistant returned invalid draft arguments.");
  }
  return args;
}

export const parseLiveFunctionArgs = parseLiveToolCallArgs;

export function getLiveInputTranscription(message) {
  const serverContent = message?.serverContent || message?.server_content;
  return serverContent?.inputTranscription || serverContent?.input_transcription;
}

export function getLiveInterimInputTranscription(message) {
  const serverContent = message?.serverContent || message?.server_content;
  return serverContent?.interimInputTranscription || serverContent?.interim_input_transcription;
}

export function getLiveOutputTranscription(message) {
  const serverContent = message?.serverContent || message?.server_content;
  return serverContent?.outputTranscription || serverContent?.output_transcription;
}

export function buildLiveToolResponse(call, response) {
  return {
    id: call?.id,
    name: call?.name || "patch_intake_draft",
    response,
  };
}

export function buildLiveConfig() {
  return {
    responseModalities: ["AUDIO"],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    systemInstruction: LIVE_SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: [PATCH_TOOL] }],
  };
}

export async function requestLiveToken() {
  const response = await fetch("/api/backend/api/v1/intake/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || "Voice assistance is unavailable right now.");
  }
  if (!body?.token || !body?.model) {
    throw new Error("Voice assistance returned an invalid session.");
  }
  return body;
}

export async function connectGeminiLive({ token, model, callbacks = {} }) {
  const { GoogleGenAI, Modality } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
  const config = buildLiveConfig();
  if (Modality?.AUDIO) config.responseModalities = [Modality.AUDIO];
  return ai.live.connect({ model, config, callbacks });
}

export function sendOpeningPrompt(session) {
  session.sendClientContent({
    turns: [{
      role: "user",
      parts: [{ text: "Begin in English only. Ask exactly this first: Which language would you prefer for this conversation: English, Hindi, or Hinglish? Wait for the answer before asking what happened." }],
    }],
    turnComplete: true,
  });
}

export function sendTextMessage(session, text) {
  session.sendClientContent({
    turns: [{ role: "user", parts: [{ text }] }],
    turnComplete: true,
  });
}

function downsampleToPcm16(samples, inputRate, targetRate = 16000) {
  if (inputRate === targetRate) {
    return Int16Array.from(samples, (sample) => Math.max(-1, Math.min(1, sample)) * 0x7fff);
  }
  const ratio = inputRate / targetRate;
  const output = new Int16Array(Math.max(1, Math.round(samples.length / ratio)));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(samples.length, Math.floor((index + 1) * ratio));
    let total = 0;
    let count = 0;
    for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) {
      total += samples[sourceIndex];
      count += 1;
    }
    const sample = count ? total / count : samples[start] || 0;
    output[index] = Math.max(-1, Math.min(1, sample)) * 0x7fff;
  }
  return output;
}

export function pcmFloat32ToBase64(samples, inputRate) {
  const pcm = downsampleToPcm16(samples, inputRate);
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function startMicrophoneInput(session) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot access a microphone. You can continue by typing instead.");
  }
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const audioContext = new AudioContext();
  await audioContext.resume();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  processor.onaudioprocess = (event) => {
    const samples = event.inputBuffer.getChannelData(0);
    session.sendRealtimeInput({
      audio: {
        data: pcmFloat32ToBase64(samples, audioContext.sampleRate),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  };
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);
  return {
    stop() {
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      silentGain.disconnect();
      mediaStream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    },
  };
}

function base64Bytes(value) {
  if (typeof value !== "string") return new Uint8Array(value || []);
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function playPcmAudioChunk(audioContext, base64Audio, playback) {
  const bytes = base64Bytes(base64Audio);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const buffer = audioContext.createBuffer(1, samples.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 0x7fff;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  const startAt = Math.max(audioContext.currentTime, playback.nextStartTime);
  source.start(startAt);
  playback.nextStartTime = startAt + buffer.duration;
}
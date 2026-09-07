export const LIVE_SYSTEM_INSTRUCTION = [
  "You are a careful consumer complaint intake assistant for GRAHAK-DRISHTI.",
  "Speak in the language the consumer uses, including English, Hindi, and natural Hinglish code-switching.",
  "Ask one short follow-up question at a time and do not invent names, dates, amounts, order references, contact details, legal findings, or evidence.",
  "Treat the consumer's account as an allegation or report, not an established fact.",
  "Use the patch_intake_draft tool only to organize a private editable draft.",
  "Never submit a complaint, contact a seller or authority, or claim that a regulator has accepted anything.",
  "Prioritize a description, one tracking contact, and case-processing consent, then ask about useful optional details.",
  "A human must review and confirm every field before official submission.",
].join(" ");

const PATCH_TOOL = {
  name: "patch_intake_draft",
  description: "Update one explicitly stated field in the private complaint draft.",
  parameters: {
    type: "OBJECT",
    properties: {
      operation: { type: "STRING", enum: ["set", "append", "remove"] },
      path: { type: "STRING" },
      value: { type: "STRING", description: "The stated value. Use JSON-compatible text for lists or objects." },
    },
    required: ["path"],
  },
};

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
      parts: [{ text: "Please begin the intake in a warm, concise way. Ask what happened first." }],
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
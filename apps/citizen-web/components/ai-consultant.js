"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, Mic, MicOff, Send, ShieldCheck, Sparkles, Square, Volume2 } from "lucide-react";

import {
  buildConsultantLiveConfig,
  CONSULTANT_OPENING_PROMPT,
  connectGeminiLive,
  playPcmAudioChunk,
  requestLiveToken,
  sendOpeningPrompt,
  sendTextMessage,
  startMicrophoneInput,
} from "../lib/gemini-live.js";

const quickPrompts = [
  "I paid for a service but did not get what was promised.",
  "My refund is delayed and the company is not responding.",
  "I received a product that was different from the listing.",
];

const initialMessages = [
  {
    id: 0,
    role: "assistant",
    text: "Tell me what happened in your own words. I will help you understand the next sensible step.",
  },
];

const initialPlayback = { nextStartTime: 0 };
const MAX_CONSULTANT_MESSAGE_LENGTH = 4000;

function messageId(nextMessageId) {
  const id = nextMessageId.current;
  nextMessageId.current += 1;
  return id;
}

export default function AIConsultant() {
  const [messages, setMessages] = useState(initialMessages);
  const [typedMessage, setTypedMessage] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const nextMessageId = useRef(1);
  const assistantMessageId = useRef(null);
  const sessionRef = useRef(null);
  const microphoneRef = useRef(null);
  const playbackContextRef = useRef(null);
  const playbackRef = useRef(initialPlayback);
  const openingSentRef = useRef(false);

  function stopMicrophone() {
    microphoneRef.current?.stop();
    microphoneRef.current = null;
  }

  function closeSession() {
    stopMicrophone();
    sessionRef.current?.close?.();
    sessionRef.current = null;
    openingSentRef.current = false;
    if (playbackContextRef.current) {
      void playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  }

  useEffect(() => () => closeSession(), []);

  function appendUserMessage(text) {
    assistantMessageId.current = null;
    setMessages((current) => [...current, { id: messageId(nextMessageId), role: "user", text }]);
  }

  function appendAssistantText(text) {
    setMessages((current) => {
      const existingId = assistantMessageId.current;
      const existingIndex = current.findIndex((message) => message.id === existingId);
      if (existingIndex >= 0) {
        const nextMessages = [...current];
        nextMessages[existingIndex] = {
          ...nextMessages[existingIndex],
          text: `${nextMessages[existingIndex].text} ${text}`.trim(),
        };
        return nextMessages;
      }
      const nextMessage = { id: messageId(nextMessageId), role: "assistant", text };
      assistantMessageId.current = nextMessage.id;
      return [...current, nextMessage];
    });
  }

  function handleLiveMessage(message) {
    const serverContent = message?.serverContent || message?.server_content;
    const input = serverContent?.inputTranscription || serverContent?.input_transcription;
    const interim = serverContent?.interimInputTranscription || serverContent?.interim_input_transcription;
    const output = serverContent?.outputTranscription || serverContent?.output_transcription;

    if (interim?.text) setInterimTranscript(interim.text);
    if (input?.text) {
      appendUserMessage(input.text);
      setInterimTranscript("");
    }
    if (output?.text) {
      appendAssistantText(output.text);
      setStatus((current) => current === "listening" ? current : "thinking");
    }
    if (message?.data) {
      if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
      void playbackContextRef.current.resume();
      playPcmAudioChunk(playbackContextRef.current, message.data, playbackRef.current);
    }
    if (serverContent?.turnComplete) {
      assistantMessageId.current = null;
      setStatus((current) => current === "listening" ? current : "ready");
    }
  }

  async function ensureSession() {
    if (sessionRef.current) return sessionRef.current;
    setStatus("connecting");
    setError("");
    const token = await requestLiveToken("consultant");
    const session = await connectGeminiLive({
      token: token.token,
      model: token.model,
      config: buildConsultantLiveConfig(),
      callbacks: {
        onmessage: handleLiveMessage,
        onerror: (event) => {
          const detail = event?.error?.message || event?.message;
          setError(detail ? `Consultant connection error: ${detail}` : "The consultant connection was interrupted.");
          setStatus("error");
        },
        onclose: (event) => {
          stopMicrophone();
          sessionRef.current = null;
          openingSentRef.current = false;
          if (event?.code && event.code !== 1000) {
            setError(`Consultant connection closed (${event.code}). You can reconnect and continue.`);
          }
          setStatus("idle");
        },
      },
    });
    sessionRef.current = session;
    playbackRef.current = { ...initialPlayback };
    setStatus("ready");
    return session;
  }

  async function startVoice() {
    setError("");
    try {
      const session = await ensureSession();
      if (!microphoneRef.current) microphoneRef.current = await startMicrophoneInput(session);
      setStatus("listening");
      if (!openingSentRef.current) {
        sendOpeningPrompt(session, CONSULTANT_OPENING_PROMPT);
        openingSentRef.current = true;
      }
    } catch (startError) {
      setStatus(sessionRef.current ? "ready" : "error");
      setError(startError instanceof Error ? startError.message : "Voice assistance is unavailable. You can type instead.");
    }
  }

  function stopVoice() {
    stopMicrophone();
    setStatus(sessionRef.current ? "ready" : "idle");
  }

  async function sendMessage(value) {
    const message = value.trim();
    if (!message) return;
    if (message.length > MAX_CONSULTANT_MESSAGE_LENGTH) {
      setError(`Please keep your message under ${MAX_CONSULTANT_MESSAGE_LENGTH.toLocaleString("en-IN")} characters.`);
      return;
    }
    setError("");
    appendUserMessage(message);
    setTypedMessage("");
    setInterimTranscript("");
    try {
      const session = await ensureSession();
      sendTextMessage(session, message);
      if (!microphoneRef.current) setStatus("thinking");
    } catch (sendError) {
      setStatus("error");
      setError(sendError instanceof Error ? sendError.message : "The message could not be sent. Please try again.");
    }
  }

  function submitMessage(event) {
    event.preventDefault();
    void sendMessage(typedMessage);
  }

  function choosePrompt(prompt) {
    void sendMessage(prompt);
  }

  const isListening = status === "listening";
  const statusLabel = {
    idle: "Ready when you are",
    connecting: "Connecting securely",
    ready: "Conversation ready",
    listening: "Listening",
    thinking: "Thinking",
    error: "Needs attention",
  }[status] || "Ready when you are";

  return (
    <main className="page-shell consultant-shell">
      <header className="topbar consultant-topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <nav className="topbar-nav" aria-label="Consultant navigation">
          <a href="/"><ArrowLeft size={14} /> Back home</a>
          <a className="consultant-file-link" href="/login?returnTo=%2Freport">File a case <ArrowRight size={14} /></a>
        </nav>
      </header>

      <section className="consultant-layout" aria-labelledby="consultant-title">
        <div className="consultant-intro">
          <p className="eyebrow">AI Consultant</p>
          <h1 id="consultant-title">Think it through before you file.</h1>
          <p className="consultant-intro-copy">
            Tell me what happened, what you tried, and what outcome you need. I can help you
            decide whether a grievance pathway may be worth pursuing and what to collect next.
          </p>
          <div className="consultant-principles">
            <div className="consultant-principle"><Sparkles size={18} /><span><strong>Make the facts clearer</strong><small>Separate what you know from what still needs checking.</small></span></div>
            <div className="consultant-principle"><Volume2 size={18} /><span><strong>Speak or type naturally</strong><small>Use English, Hindi, or Hinglish in the way that feels easiest.</small></span></div>
            <div className="consultant-principle"><ShieldCheck size={18} /><span><strong>Keep control of the next step</strong><small>The consultant does not submit a complaint or contact anyone for you.</small></span></div>
          </div>
          <div className="consultant-boundary"><ShieldCheck size={18} /><div><strong>General guidance, not a legal finding.</strong><p>Your account is treated as a report. Do not share passwords, OTPs, or full financial identifiers.</p></div></div>
        </div>

        <section className="consultant-workspace" aria-labelledby="consultant-workspace-title">
          <header className="consultant-workspace-header">
            <div className="consultant-agent-title"><span className="consultant-agent-icon"><Sparkles size={17} /></span><div><p className="eyebrow">GRAHAK-DRISHTI</p><h2 id="consultant-workspace-title">AI Consultant</h2></div></div>
            <div className={`consultant-status consultant-status-${status}`} aria-live="polite"><span className="consultant-status-dot" />{statusLabel}</div>
          </header>

          <div className="consultant-messages" role="log" aria-live="polite" aria-label="Conversation with AI Consultant">
            {messages.map((message) => <div className={`consultant-message consultant-message-${message.role}`} key={message.id}><span className="consultant-message-label">{message.role === "assistant" ? "AI Consultant" : "You"}</span><p>{message.text}</p></div>)}
            {interimTranscript && <div className="consultant-interim"><Mic size={14} /> {interimTranscript}</div>}
          </div>

          {error && <div className="consultant-error" role="alert"><CircleAlert size={17} /> <span>{error}</span></div>}

          <div className="consultant-quick-prompts" aria-label="Suggested conversation starters">
            <span>Start with</span>
            {quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => choosePrompt(prompt)} disabled={status === "connecting"}>{prompt}</button>)}
          </div>

          <form className="consultant-composer" onSubmit={submitMessage}>
            <label htmlFor="consultantMessage">Your message</label>
            <div className="consultant-composer-row"><textarea id="consultantMessage" value={typedMessage} onChange={(event) => setTypedMessage(event.target.value)} placeholder="For example: I cancelled an order, but the refund has not arrived." rows="2" maxLength={MAX_CONSULTANT_MESSAGE_LENGTH} /><div className="consultant-composer-actions"><button className={isListening ? "consultant-voice-button is-active" : "consultant-voice-button"} type="button" onClick={isListening ? stopVoice : startVoice} disabled={status === "connecting"} aria-label={isListening ? "Stop listening" : "Start voice conversation"} title={isListening ? "Stop listening" : "Start voice conversation"}>{isListening ? <Square size={16} fill="currentColor" /> : status === "error" ? <MicOff size={17} /> : <Mic size={17} />}</button><button className="consultant-send-button" type="submit" disabled={!typedMessage.trim() || status === "connecting"} aria-label="Send message" title="Send message"><Send size={17} /></button></div></div>
            <p className="consultant-composer-note">Press send to continue by text, or use the microphone to speak.</p>
          </form>

          <p className="consultant-disclosure"><Volume2 size={14} /> Voice audio is sent to Google Gemini for this live session. Audio and unfinished conversation notes are not retained by this application.</p>
        </section>
      </section>

      <section className="consultant-next-step" aria-labelledby="consultant-next-step-title">
        <div><p className="eyebrow">When you are ready</p><h2 id="consultant-next-step-title">Turn a clear account into a private case.</h2><p>The consultant can help you think. You decide whether to review and submit a report.</p></div>
        <a className="primary-button" href="/login?returnTo=%2Freport">Start a private case <ArrowRight size={17} /></a>
      </section>

      <footer className="page-footer consultant-footer">
        <span>AI guidance is advisory and does not replace NCH, regulators, e-Jagriti, or consumer commissions.</span>
        <a href="/">Return to GRAHAK-DRISHTI <ArrowRight size={14} /></a>
      </footer>
    </main>
  );
}
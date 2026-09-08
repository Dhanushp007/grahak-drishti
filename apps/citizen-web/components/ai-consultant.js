"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, Mic, ShieldCheck, Sparkles, Square, Volume2 } from "lucide-react";

import {
  buildConsultantLiveConfig,
  CONSULTANT_OPENING_PROMPT,
  connectGeminiLive,
  playPcmAudioChunk,
  requestLiveToken,
  sendOpeningPrompt,
  startMicrophoneInput,
} from "../lib/gemini-live.js";

const initialPlayback = { nextStartTime: 0 };

export default function AIConsultant() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
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

  function handleLiveMessage(message) {
    const serverContent = message?.serverContent || message?.server_content;
    const input = serverContent?.inputTranscription || serverContent?.input_transcription;
    const output = serverContent?.outputTranscription || serverContent?.output_transcription;

    if (input?.text) setStatus("listening");
    if (output?.text) setStatus("thinking");
    if (message?.data) {
      if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
      void playbackContextRef.current.resume();
      playPcmAudioChunk(playbackContextRef.current, message.data, playbackRef.current);
    }
    if (serverContent?.turnComplete) {
      setStatus(microphoneRef.current ? "listening" : "ready");
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
      setError(startError instanceof Error ? startError.message : "Voice conversation is unavailable. Please try again.");
    }
  }

  function stopVoice() {
    stopMicrophone();
    setStatus(sessionRef.current ? "ready" : "idle");
  }

  const conversationActive = status === "listening" || status === "thinking";
  const statusLabel = {
    idle: "Ready when you are",
    connecting: "Connecting securely",
    ready: "Ready to begin",
    listening: "Listening to you",
    thinking: "Your consultant is speaking",
    error: "Needs attention",
  }[status] || "Ready when you are";
  const voiceStatusDescription = {
    idle: "Your AI Consultant will introduce itself and ask what happened.",
    connecting: "Opening a secure voice session...",
    ready: "Press start when you are ready to speak.",
    listening: "Speak naturally. Your AI Consultant is listening.",
    thinking: "Your AI Consultant is preparing a response.",
    error: "Try starting the conversation again.",
  }[status] || "Your AI Consultant is ready when you are.";

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

          <div className="consultant-voice-stage" aria-live="polite">
            <div className={conversationActive ? "consultant-voice-orb is-active" : "consultant-voice-orb"} aria-hidden="true"><Mic size={44} /></div>
            <p className="consultant-voice-kicker">Voice conversation</p>
            <h3>Speak with your AI Consultant</h3>
            <p className="consultant-voice-copy">{voiceStatusDescription}</p>
            <button className={conversationActive ? "consultant-start-button is-active" : "consultant-start-button"} type="button" onClick={conversationActive ? stopVoice : startVoice} disabled={status === "connecting"}>
              {conversationActive ? <Square size={17} fill="currentColor" /> : <Mic size={18} />}
              {conversationActive ? "Stop conversation" : "Start conversation"}
            </button>
          </div>

          {error && <div className="consultant-error" role="alert"><CircleAlert size={17} /> <span>{error}</span></div>}

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
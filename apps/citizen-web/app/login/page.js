"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck, UserRoundCheck } from "lucide-react";

import { CONSULTANT_HANDOFF_STORAGE_KEY, CONSULTANT_VOICE_RETURN_PATH } from "../../lib/consultant-handoff.js";
import { loginAsDemoCitizen } from "../../lib/demo.js";

function getReturnPath() {
  if (typeof window === "undefined") return "/report";
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  return ["/report", "/report?intakeMode=voice"].includes(returnTo) ? returnTo : "/report";
}

export default function LoginPage() {
  const [returnPath, setReturnPath] = useState("/report");
  const [isConsultantContinuation, setIsConsultantContinuation] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextReturnPath = getReturnPath();
    setReturnPath(nextReturnPath);
    setIsConsultantContinuation(nextReturnPath === CONSULTANT_VOICE_RETURN_PATH && Boolean(window.sessionStorage.getItem(CONSULTANT_HANDOFF_STORAGE_KEY)));
  }, []);

  async function signIn() {
    setIsLoggingIn(true);
    setError("");
    try {
      const session = await loginAsDemoCitizen();
      window.sessionStorage.setItem("gd-demo-contact", session?.contact || "demo.citizen@example.test");
      window.location.assign(returnPath);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in is unavailable right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="page-shell login-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <a className="back-link" href="/"><ArrowLeft size={15} /> Back to home</a>
      </header>
      <section className="login-layout" aria-labelledby="login-title">
        <div className="login-intro">
          <p className="eyebrow">Synthetic demo access</p>
          <h1 id="login-title">Sign in to begin.</h1>
          <p className="intro">Open the prepared citizen journey: report a delayed QuickKart refund, receive a docket, and see how one private case becomes an aggregate issue signal.</p>
          <div className="trust-note"><ShieldCheck size={19} aria-hidden="true" /><span>This uses synthetic data only. No real account or complaint is created.</span></div>
        </div>
        <div className="form-card login-card">
          <div className="form-card-heading">
            <div><p className="eyebrow">Citizen demo</p><h2>Continue to the demo</h2></div>
          </div>
          <p className="login-card-copy">{isConsultantContinuation ? "Your consultant notes are ready. Continue in Speak mode to review them and add anything still missing." : "Use a synthetic citizen profile to try the complete complaint-to-signal journey."}</p>
          {error && <p className="submission-error" role="alert">{error}</p>}
          <button className="submit-button" type="button" onClick={signIn} disabled={isLoggingIn}>
            {isLoggingIn ? <><LoaderCircle className="spin" size={18} /> Signing you in...</> : isConsultantContinuation ? <>Log in and continue to Speak <ArrowRight size={18} /></> : <>Continue as citizen <UserRoundCheck size={18} /></>}
          </button>
          <p className="form-footnote">Synthetic profile · no real account or complaint</p>
          <a className="login-track-link" href="/track">Already have a docket? Track it <ArrowRight size={15} /></a>
        </div>
      </section>
      <footer className="page-footer"><span>Hackathon demo · Existing grievance systems remain separate.</span><a href="/issues">Explore issue signals <ArrowRight size={14} /></a></footer>
    </main>
  );
}
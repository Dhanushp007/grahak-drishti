"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck, UserRoundCheck } from "lucide-react";

import { loginAsDemoCitizen } from "../../lib/demo.js";

function getReturnPath() {
  if (typeof window === "undefined") return "/report";
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  return returnTo === "/report" ? returnTo : "/report";
}

export default function LoginPage() {
  const [returnPath, setReturnPath] = useState("/report");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReturnPath(getReturnPath());
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
          <p className="eyebrow">Your private starting point</p>
          <h1 id="login-title">Sign in to begin.</h1>
          <p className="intro">Use a citizen profile to create and follow your private consumer case.</p>
          <div className="trust-note"><ShieldCheck size={19} aria-hidden="true" /><span>Your contact details are used only for private case access.</span></div>
        </div>
        <div className="form-card login-card">
          <div className="form-card-heading">
            <div><p className="eyebrow">Citizen access</p><h2>Continue securely</h2></div>
          </div>
          <p className="login-card-copy">This demo opens a prepared citizen profile so you can experience the complete case journey.</p>
          {error && <p className="submission-error" role="alert">{error}</p>}
          <button className="submit-button" type="button" onClick={signIn} disabled={isLoggingIn}>
            {isLoggingIn ? <><LoaderCircle className="spin" size={18} /> Signing you in...</> : <>Continue as citizen <UserRoundCheck size={18} /></>}
          </button>
          <p className="form-footnote">Demo environment · synthetic data only</p>
          <a className="login-track-link" href="/track">Already have a docket? Track it <ArrowRight size={15} /></a>
        </div>
      </section>
      <footer className="page-footer"><span>Existing grievance systems remain part of your resolution journey.</span><a href="/issues">Explore issue signals <ArrowRight size={14} /></a></footer>
    </main>
  );
}
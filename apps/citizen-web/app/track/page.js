"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole } from "lucide-react";

import { buildTrackingPayload } from "../../lib/complaint.js";

const initialForm = { docket: "", email: "", phone: "" };

export default function TrackPage() {
  const [form, setForm] = useState(initialForm);
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const docket = new URLSearchParams(window.location.search).get("docket");
    if (docket) setForm((current) => ({ ...current, docket }));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function trackComplaint(event) {
    event.preventDefault();
    if (!/^GD-[A-Z0-9]{12}$/i.test(form.docket.trim())) {
      setError("Enter the 12-character docket number from your acknowledgement.");
      return;
    }
    if ((form.email.trim() && form.phone.trim()) || (!form.email.trim() && !form.phone.trim())) {
      setError("Enter the same email or phone number used when you reported the issue.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/backend/api/v1/complaints/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTrackingPayload(form)),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "We could not find that report.");
      setTracking(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not find that report.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell tracking-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">GRAHAK<span>-</span>DRISHTI</a>
        <a className="back-link" href="/"><ArrowLeft size={15} /> Report another issue</a>
      </header>
      <section className="tracking-layout">
        <div className="tracking-intro">
          <p className="eyebrow">Your private timeline</p>
          <h1>See what happens next.</h1>
          <p className="intro">Enter your docket and the same contact you used to report the issue.</p>
          <div className="trust-note"><LockKeyhole size={19} aria-hidden="true" /><span>Only your docket and matching contact can open this timeline.</span></div>
        </div>
        <div className="form-card tracking-card">
          {!tracking ? (
            <>
              <div className="form-card-heading"><div><p className="eyebrow">Track a report</p><h2>Find your case</h2></div></div>
              <form onSubmit={trackComplaint} noValidate>
                <div className="field-group">
                  <label htmlFor="docket">Docket number</label>
                  <input id="docket" name="docket" value={form.docket} onChange={updateField} placeholder="GD-XXXXXXXXXXXX" autoComplete="off" />
                </div>
                <fieldset className="contact-fields">
                  <legend>Matching contact</legend>
                  <p className="field-hint">Use the email or phone number from your report.</p>
                  <div className="two-column-fields">
                    <div className="field-group"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" autoComplete="email" /></div>
                    <div className="field-group"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+91 98765 43210" autoComplete="tel" /></div>
                  </div>
                </fieldset>
                {error && <p className="submission-error" role="alert">{error}</p>}
                <button className="submit-button" type="submit" disabled={isLoading}>{isLoading ? <><LoaderCircle className="spin" size={18} /> Finding your case...</> : <>Show my timeline <ArrowRight size={18} /></>}</button>
              </form>
            </>
          ) : (
            <div className="timeline-result" aria-live="polite">
              <div className="result-heading"><div className="success-icon small" aria-hidden="true"><Check size={20} /></div><div><p className="eyebrow">Report found</p><h2>{tracking.docket_number}</h2></div></div>
              <p className="result-status">Current status: <strong>{tracking.status}</strong></p>
              <ol className="timeline-list">{tracking.timeline.map((event) => <li key={event.occurred_at}><span className="timeline-dot" aria-hidden="true" /><div><strong>{event.label}</strong><p>{event.message}</p></div></li>)}</ol>
              <button className="text-button" type="button" onClick={() => setTracking(null)}>Track another docket</button>
            </div>
          )}
        </div>
      </section>
      <footer className="page-footer"><span>GRAHAK-DRISHTI connects consumer journeys across existing grievance systems.</span><span>Private case access</span></footer>
    </main>
  );
}
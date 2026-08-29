"use client";

import { useState } from "react";
import { ArrowRight, Check, FileUp, LoaderCircle, ShieldCheck, UserRoundCheck } from "lucide-react";

import { buildComplaintPayload, validateComplaintForm } from "../lib/complaint.js";
import { loginAsDemoCitizen } from "../lib/demo.js";
import { DEMO_SCENARIOS } from "../lib/demo-scenarios.js";

const initialForm = {
  description: "",
  companyName: "",
  amountInvolved: "",
  email: "",
  phone: "",
  state: "Maharashtra",
};

export default function HomePage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoSession, setDemoSession] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);
  const [loadedDemo, setLoadedDemo] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmissionError("");
  }

  async function startDemoLogin() {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const session = await loginAsDemoCitizen();
      setDemoSession(session);
      window.sessionStorage.setItem("gd-demo-contact", "demo.citizen@example.test");
      setForm((current) => ({ ...current, email: "demo.citizen@example.test", phone: "" }));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Demo access is unavailable right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function loadDemoComplaint() {
    const scenario = DEMO_SCENARIOS[demoIndex];
    setForm((current) => ({
      ...current,
      description: scenario.description,
      companyName: scenario.companyName,
      amountInvolved: scenario.amountInvolved,
      state: scenario.state,
      email: scenario.contact,
      phone: "",
    }));
    setLoadedDemo(scenario);
    setDemoIndex((current) => (current + 1) % DEMO_SCENARIOS.length);
    setErrors({});
    setSubmissionError("");
  }

  async function submitComplaint(event) {
    event.preventDefault();
    const validationErrors = validateComplaintForm(form);
    setErrors(validationErrors);
    setSubmissionError("");
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setIntelligence(null);
    try {
      const payload = buildComplaintPayload(form);
      const response = await fetch("/api/backend/api/v1/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message || "We could not submit your report.");
      }
      window.sessionStorage.setItem("gd-demo-contact", payload.contact.email || payload.contact.phone);
      setSubmission(body);
      void loadIntelligence(body.docket_number, payload.contact);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "We could not submit your report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadIntelligence(docketNumber, contact) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch("/api/backend/api/v1/complaints/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docket_number: docketNumber, contact }),
        });
        if (response.status === 200) {
          setIntelligence(await response.json());
          return;
        }
        if (response.status !== 202) return;
      } catch {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setIntelligence(null);
  }

  function advisoryRecommendation() {
    return intelligence?.analysis?.routing?.reason || "An authorized reviewer should assess this aggregate signal.";
  }

  if (submission) {
    return (
      <main className="page-shell success-shell">
        <header className="topbar">
          <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
            GRAHAK<span>-</span>DRISHTI
          </a>
          <div className="topbar-actions"><nav className="topbar-nav" aria-label="Citizen navigation"><a href="/issues">Explore issues</a><a href="/reports">My reports</a><a href="/track">Track a report</a></nav><span className="demo-session">{demoSession?.display_name || "Demo citizen"}</span></div>
        </header>
        <section className="success-panel" aria-labelledby="success-title">
          <div className="success-icon" aria-hidden="true"><Check size={28} /></div>
          <p className="eyebrow">Report received</p>
          <h1 id="success-title">Your voice now has a docket.</h1>
          <p className="success-copy">
            Keep this number safe. It is the private key to your case timeline.
          </p>
          <div className="docket-box">
            <span>Docket number</span>
            <strong>{submission.docket_number}</strong>
          </div>
          <a className="primary-button" href={`/track?docket=${submission.docket_number}`}>
            Track this report <ArrowRight size={18} />
          </a>
          {intelligence ? (
            <section className="analysis-result" aria-live="polite">
              <p className="eyebrow">Advisory intelligence</p>
              <h2>{intelligence.analysis?.classification?.issue?.value || "Issue pattern identified"}</h2>
              <p>We organized your report so similar consumer experiences can be seen together.</p>
              <div className="analysis-facts">
                <span><strong>Company</strong>{intelligence.analysis?.classification?.company_name || "Not provided"}</span>
                <span><strong>Sector</strong>{intelligence.analysis?.classification?.sector?.value || "Needs review"}</span>
                <span><strong>Amount</strong>{intelligence.analysis?.classification?.financial_impact ? `Rs. ${Number(intelligence.analysis.classification.financial_impact).toLocaleString("en-IN")}` : "Not provided"}</span>
                <span><strong>Severity</strong>{intelligence.analysis?.classification?.severity?.value || "Needs review"}</span>
                <span><strong>Confidence</strong>{Math.round(Number(intelligence.analysis?.classification?.issue?.confidence || 0) * 100)}%</span>
              </div>
              {intelligence.matched_issue ? <a href={`/issues/${intelligence.matched_issue.cluster_key}`} className="analysis-link">See {intelligence.matched_issue.reported_count.toLocaleString()} similar reports <ArrowRight size={15} /></a> : <span className="analysis-pending">No matching public issue signal yet.</span>}
              <p className="analysis-recommendation"><strong>Recommended next step</strong> · {advisoryRecommendation()}</p>
              {intelligence.analysis?.dark_pattern?.status === "potential_concern" && <p className="dark-pattern-note"><strong>Potential dark pattern detected</strong> · {intelligence.analysis.dark_pattern.explanation} This is an advisory signal for authorized review, not a legal finding.</p>}
              <span className="analysis-pending">Routing is advisory and does not replace existing grievance systems.</span>
            </section>
          ) : <p className="analysis-pending" aria-live="polite">Preparing your advisory issue summary...</p>}
          <button className="text-button" type="button" onClick={() => setSubmission(null)}>
            Report another issue
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <div className="topbar-actions"><nav className="topbar-nav" aria-label="Citizen navigation"><a href="/issues">Explore issues</a><a href="/reports">My reports</a><a href="/track">Track a report</a></nav>{demoSession ? <span className="demo-session"><UserRoundCheck size={14} /> {demoSession.display_name}</span> : <button className="demo-login-button" type="button" onClick={startDemoLogin} disabled={isLoggingIn}><UserRoundCheck size={14} /> {isLoggingIn ? "Opening demo" : "Citizen demo"}</button>}</div>
        {loginError && <p className="demo-login-error" role="alert">{loginError}</p>}
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">A clearer way forward</p>
          <h1>Tell us what happened.</h1>
          <p className="intro">
            Start with your words. We will give your report a docket and a plain-language
            timeline to follow.
          </p>
          <div className="trust-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>Your contact is used only to let you track your private case.</span>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-heading">
            <div>
              <p className="eyebrow">Step 01</p>
              <h2>Report an issue</h2>
            </div>
            <span className="required-note">* Required</span>
          </div>

          <form onSubmit={submitComplaint} noValidate>
            <div className="field-group">
              <label htmlFor="description">What happened? <span>*</span></label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="For example: I cancelled my order, but the refund has not arrived."
                rows="5"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : undefined}
              />
              {errors.description && <p className="field-error" id="description-error">{errors.description}</p>}
            </div>

            <div className="two-column-fields">
              <div className="field-group">
                <label htmlFor="companyName">Company or seller</label>
                <input id="companyName" name="companyName" value={form.companyName} onChange={updateField} placeholder="Name of the business" />
              </div>
              <div className="field-group">
                <label htmlFor="amountInvolved">Amount involved <span className="optional">(optional)</span></label>
                <div className="currency-input"><span aria-hidden="true">Rs.</span><input id="amountInvolved" name="amountInvolved" value={form.amountInvolved} onChange={updateField} inputMode="decimal" placeholder="0.00" /></div>
              </div>
              <div className="field-group">
                <label htmlFor="state">State <span className="optional">(optional)</span></label>
                <select id="state" name="state" value={form.state} onChange={updateField}>
                  {['Maharashtra', 'Karnataka', 'Delhi', 'Uttar Pradesh', 'Tamil Nadu', 'Gujarat', 'West Bengal', 'Telangana', 'Rajasthan', 'Kerala', 'Bihar', 'Punjab', 'Madhya Pradesh', 'Andhra Pradesh', 'Odisha', 'Haryana', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand'].map((state) => <option key={state}>{state}</option>)}
                </select>
              </div>
            </div>

            <div className="evidence-row">
              <div className="evidence-icon" aria-hidden="true"><FileUp size={20} /></div>
              <div><strong>Have evidence ready?</strong><p>Invoices and screenshots can be added after your docket is created.</p></div>
            </div>

            <fieldset className="contact-fields">
              <legend>How can you track this report? <span>*</span></legend>
              <p className="field-hint">Provide one contact method. We keep it private.</p>
              <div className="two-column-fields">
                <div className="field-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" autoComplete="email" aria-invalid={Boolean(errors.contact)} />
                </div>
                <div className="field-group">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+91 98765 43210" autoComplete="tel" aria-invalid={Boolean(errors.contact)} />
                </div>
              </div>
              {errors.contact && <p className="field-error">{errors.contact}</p>}
            </fieldset>

            <div className="demo-complaint-tools">
              <div>
                <strong>Want to see the full journey?</strong>
                <p>Load a prepared synthetic complaint, then review or edit it before submitting.</p>
              </div>
              <button className="demo-complaint-button" type="button" onClick={loadDemoComplaint}>
                {loadedDemo ? "Load next demo complaint" : "Use a demo complaint"} <ArrowRight size={16} />
              </button>
              {loadedDemo && <p className="demo-loaded" role="status">Synthetic demo data · Example {demoIndex === 0 ? DEMO_SCENARIOS.length : demoIndex} of {DEMO_SCENARIOS.length}: {loadedDemo.title}</p>}
            </div>

            {submissionError && <p className="submission-error" role="alert">{submissionError}</p>}
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><LoaderCircle className="spin" size={18} /> Sending securely...</> : <>Create my docket <ArrowRight size={18} /></>}
            </button>
            <p className="form-footnote">By submitting, you start a private case. Public issue intelligence never shows your personal details.</p>
          </form>
        </div>
      </section>

      <footer className="page-footer">
        <span>GRAHAK-DRISHTI connects consumer journeys across existing grievance systems.</span>
        <a href="/track">Already have a docket? Track it <ArrowRight size={14} /></a>
      </footer>
    </main>
  );
}
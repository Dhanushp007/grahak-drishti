"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, FileText, FileUp, Keyboard, LoaderCircle, Mic, Search, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import indiaMap from "@svg-maps/india";

import VoiceIntake from "../components/voice-intake.js";
import { buildComplaintPayload, readApiResponse, validateComplaintForm } from "../lib/complaint.js";
import { consumeConsultantHandoff, getConsultantTextFields } from "../lib/consultant-handoff.js";
import { loginAsDemoCitizen } from "../lib/demo.js";
import { DEMO_SCENARIOS } from "../lib/demo-scenarios.js";

const initialForm = {
  description: "",
  companyName: "",
  amountInvolved: "",
  email: "",
  phone: "",
  state: "",
};

const landingSteps = [
  { number: "01", label: "Report the experience", title: "Refund confirmed. Money still missing.", detail: "A QuickKart consumer gets a private docket without exposing personal details." },
  { number: "02", label: "Find the pattern", title: "Similar complaints become one issue signal.", detail: "Company, issue, and timing connect separate reports into an aggregate view." },
  { number: "03", label: "Strengthen the signal", title: "Evidence makes the pattern more useful.", detail: "Corroboration helps analysts see trend, impact, geography, and a sensible next step." },
];

const stateSignals = {
  ap: 58, ar: 31, as: 42, br: 47, ch: 35, ct: 51, dl: 72, ga: 28, gj: 64,
  hr: 49, hp: 27, jk: 24, jh: 39, ka: 68, kl: 54, mp: 61, mh: 86, mn: 22,
  ml: 20, mz: 18, nl: 19, od: 45, or: 45, pb: 41, py: 26, rj: 57, sk: 12, tn: 74,
  tg: 63, tr: 21, up: 77, ut: 34, wb: 69, an: 14, ld: 8, dn: 16, dd: 16,
};

function signalLevel(value) {
  if (value >= 70) return "high";
  if (value >= 45) return "medium";
  return "low";
}

export default function HomePage() {
  const [activeLandingStep, setActiveLandingStep] = useState(0);
  const [selectedState, setSelectedState] = useState(null);
  const landingStep = landingSteps[activeLandingStep];
  const selectedLocation = selectedState ? indiaMap.locations.find((location) => location.id === selectedState) : null;

  useEffect(() => {
    const cardTimer = window.setInterval(() => {
      setActiveLandingStep((current) => (current + 1) % landingSteps.length);
    }, 4800);
    return () => window.clearInterval(cardTimer);
  }, []);

  function selectState(stateId) {
    setSelectedState(stateId);
  }

  return (
    <main className="page-shell landing-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <nav className="topbar-nav" aria-label="Citizen navigation">
          <a href="/issues">Explore issues</a>
          <a href="/track">Track a report</a>
          <a href="/government">Government view</a>
          <a className="landing-login-link" href="/login?returnTo=%2Freport">Sign in</a>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">A consumer-first starting point</p>
          <h1 id="landing-title">Make your complaint count.</h1>
          <p className="landing-intro">
            Start with what happened. GRAHAK-DRISHTI helps you create a private case,
            follow its progress, and see when other consumers have faced a similar issue.
          </p>
          <div className="landing-actions">
            <a className="primary-button" href="/login?returnTo=%2Freport">
              File a case <ArrowRight size={18} />
            </a>
            <a className="consultant-action" href="/consultant" target="_blank" rel="noopener noreferrer">
              <Sparkles size={17} /> AI Consultant
            </a>
            <a className="landing-secondary-action" href="/track">
              Track a report <Search size={17} />
            </a>
          </div>
          <div className="landing-trust-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>Your case details stay private. Public pages show only aggregate issue signals.</span>
          </div>
        </div>
        <div className="moving-card-stage" aria-label="GRAHAK-DRISHTI highlights">
          <div className="moving-card-background" aria-hidden="true" />
          <article className="moving-card">
            <div className="moving-card-topline"><span>{landingStep.number}</span><span>{landingStep.label}</span></div>
            <div className="landing-visual-line" />
            <h2>{landingStep.title}</h2>
            <p>{landingStep.detail}</p>
            <div className="moving-card-footer">GRAHAK-DRISHTI · {activeLandingStep + 1} of {landingSteps.length}</div>
          </article>
          <div className="moving-card-controls" aria-label="Highlight controls">
            {landingSteps.map((step, index) => <button className={index === activeLandingStep ? "is-active" : ""} type="button" key={step.number} onClick={() => setActiveLandingStep(index)} aria-label={`Show ${step.label}`} aria-pressed={index === activeLandingStep}><span /></button>)}
          </div>
        </div>
      </section>

      <section className="signal-overview" aria-labelledby="signal-overview-title">
        <div className="signal-overview-heading">
          <p className="eyebrow">Aggregate signals</p>
          <h2 id="signal-overview-title">See the wider consumer picture.</h2>
          <p>Explore relative synthetic issue signals by state. Individual complaints and contact details never appear here.</p>
        </div>
        <div className="signal-overview-layout">
          <div className="signal-map-panel">
            <div className="signal-map-toolbar"><div><strong>Consumer signals across India</strong><span>Select a state to inspect its relative signal</span></div><b>Demo data</b></div>
            <div className="signal-map" aria-label="India map showing synthetic aggregate consumer issue signals">
              <svg viewBox={indiaMap.viewBox}>
                {indiaMap.locations.map((location) => {
                  const signal = stateSignals[location.id] || 10;
                  return <path className={`india-state signal-level-${signalLevel(signal)} ${selectedState === location.id ? "is-selected" : ""}`} d={location.path} key={location.id} tabIndex="0" role="button" aria-label={`Show ${location.name} signal`} onClick={() => selectState(location.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectState(location.id); } }} />;
                })}
              </svg>
              <div className="map-legend"><span><i className="legend-low" /> Lower signal</span><span><i className="legend-high" /> Higher signal</span></div>
            </div>
          </div>
          <div className="signal-summary">
            <div className="signal-summary-lead"><span>{selectedLocation ? "Selected state" : "India overview"}</span><strong>{selectedLocation ? selectedLocation.name : "Patterns become visible when complaints are seen together."}</strong>{selectedLocation ? <><div className="state-signal-score"><b>{stateSignals[selectedState] || 10}</b><span>/ 100 relative signal</span></div><p>{signalLevel(stateSignals[selectedState] || 10).replace(/^\w/, (letter) => letter.toUpperCase())} synthetic signal intensity for this state. Select another state to compare.</p></> : <p>The map is a visual guide to aggregate issue intensity, not official government statistics. Select a state to inspect its relative signal.</p>}</div>
            <a className="signal-summary-link" href="/issues">Explore public issue signals <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>

      <section className="landing-options" aria-labelledby="options-title">
        <div className="landing-section-heading">
          <p className="eyebrow">Continue the story</p>
          <h2 id="options-title">Choose your next step.</h2>
        </div>
        <div className="landing-option-grid">
          <a className="landing-option" href="/login?returnTo=%2Freport">
            <span className="landing-option-icon"><FileText size={21} /></span>
            <span><strong>File a case</strong><small>Describe the issue and receive a private docket.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="landing-option" href="/track">
            <span className="landing-option-icon"><Search size={21} /></span>
            <span><strong>Track a report</strong><small>Open your timeline with a docket and matching contact.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="landing-option" href="/issues">
            <span className="landing-option-icon"><ShieldCheck size={21} /></span>
            <span><strong>Explore issue signals</strong><small>See anonymized patterns reported by consumers.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="page-footer landing-footer">
        <a className="landing-footer-brand wordmark" href="/" aria-label="GRAHAK-DRISHTI home">GRAHAK<span>-</span>DRISHTI</a>
        <span className="landing-footer-copyright">Hackathon demo · Synthetic data only</span>
        <a className="landing-footer-contact" href="/issues">Explore the signal <ArrowRight size={14} /></a>
      </footer>
    </main>
  );
}

export function ComplaintPage() {
  const consultantHandoffReadRef = useRef(false);
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
  const [intakeMode, setIntakeMode] = useState("text");
  const [consultantHandoff, setConsultantHandoff] = useState(null);
  const [docketCopyStatus, setDocketCopyStatus] = useState("");
  const [websiteTrap, setWebsiteTrap] = useState("");

  useEffect(() => {
    if (window.sessionStorage.getItem("gd-demo-contact")) {
      setDemoSession({ display_name: "Demo Citizen" });
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("intakeMode") === "voice") setIntakeMode("voice");
    if (!consultantHandoffReadRef.current) {
      consultantHandoffReadRef.current = true;
      setConsultantHandoff(consumeConsultantHandoff());
    }
  }, []);

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

  function useTextIntake() {
    const fields = getConsultantTextFields(consultantHandoff);
    setForm((current) => ({
      ...current,
      ...(fields.description ? { description: fields.description } : {}),
      ...(fields.companyName ? { companyName: fields.companyName } : {}),
      ...(fields.amountInvolved !== "" ? { amountInvolved: String(fields.amountInvolved) } : {}),
      ...(fields.state ? { state: fields.state } : {}),
    }));
    setConsultantHandoff(null);
    setIntakeMode("text");
  }

  async function submitPayload(payload) {
    setIsSubmitting(true);
    setIntelligence(null);
    setSubmissionError("");
    try {
      const response = await fetch("/api/backend/api/v1/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readApiResponse(response);
      window.sessionStorage.setItem("gd-demo-contact", payload.contact.email || payload.contact.phone);
      setSubmission(body);
      void loadIntelligence(body.docket_number, payload.contact);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "We could not submit your report. Please try again.",
      );
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitComplaint(event) {
    event.preventDefault();
    if (websiteTrap) return;
    const lastSubmission = Number(window.sessionStorage.getItem("gd-last-submission-at") || 0);
    if (Date.now() - lastSubmission < 5000) {
      setSubmissionError("Please wait a few seconds before sending another report.");
      return;
    }
    const validationErrors = validateComplaintForm(form);
    setErrors(validationErrors);
    setSubmissionError("");
    if (Object.keys(validationErrors).length > 0) return;
    try {
      await submitPayload(buildComplaintPayload(form));
      window.sessionStorage.setItem("gd-last-submission-at", String(Date.now()));
    } catch {
      return;
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

  async function copyDocket() {
    try {
      await navigator.clipboard.writeText(submission.docket_number);
      setDocketCopyStatus("Copied");
    } catch {
      setDocketCopyStatus("Copy unavailable");
    }
  }

  if (submission) {
    return (
      <main className="page-shell success-shell">
        <header className="topbar">
          <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
            GRAHAK<span>-</span>DRISHTI
          </a>
          <div className="topbar-actions"><nav className="topbar-nav" aria-label="Citizen navigation"><a href="/issues">Explore issues</a><a href="/reports">My reports</a><a href="/track">Track a report</a><a href="/government">Government view</a></nav><span className="demo-session">{demoSession?.display_name || "Demo citizen"}</span></div>
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
            <div className="docket-value"><strong>{submission.docket_number}</strong><button className="docket-copy-button" type="button" onClick={copyDocket} aria-label="Copy docket number" title="Copy docket number"><Copy size={16} /></button></div>
            {docketCopyStatus && <small className="docket-copy-status" role="status">{docketCopyStatus}</small>}
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
              {intelligence.matched_issue ? <a href={`/issues/${intelligence.matched_issue.cluster_key}`} className="analysis-link">See {intelligence.matched_issue.reported_count.toLocaleString()} similar reports and add evidence <ArrowRight size={15} /></a> : <span className="analysis-pending">No matching public issue signal yet.</span>}
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
        <div className="topbar-actions"><nav className="topbar-nav" aria-label="Citizen navigation"><a href="/issues">Explore issues</a><a href="/reports">My reports</a><a href="/track">Track a report</a><a href="/government">Government view</a></nav>{demoSession ? <span className="demo-session"><UserRoundCheck size={14} /> {demoSession.display_name}</span> : <button className="demo-login-button" type="button" onClick={startDemoLogin} disabled={isLoggingIn}><UserRoundCheck size={14} /> {isLoggingIn ? "Opening demo" : "Citizen demo"}</button>}</div>
        {loginError && <p className="demo-login-error" role="alert">{loginError}</p>}
      </header>

      <section className={`hero-grid ${intakeMode === "voice" ? "hero-grid-voice" : ""}`}>
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
          <div className="report-journey" aria-labelledby="report-journey-title">
            <p className="eyebrow">What happens next</p>
            <h2 id="report-journey-title">One private report, three useful steps.</h2>
            <ol>
              <li><span>01</span><div><strong>Get a docket</strong><p>Your report is saved privately so you can follow it.</p></div></li>
              <li><span>02</span><div><strong>See the pattern</strong><p>Similar consumer experiences become an aggregate issue signal.</p></div></li>
              <li><span>03</span><div><strong>Strengthen the signal</strong><p>Evidence-backed corroboration helps analysts see what matters.</p></div></li>
            </ol>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-heading">
            <div>
              <p className="eyebrow">Step 01</p>
              <h2>{intakeMode === "text" ? "Quick report" : "Guided voice intake"}</h2>
            </div>
            <span className="required-note">* Required</span>
          </div>

          <div className="intake-mode-toggle" role="tablist" aria-label="Choose complaint intake mode">
            <button type="button" role="tab" aria-selected={intakeMode === "text"} className={intakeMode === "text" ? "intake-mode-active" : ""} onClick={() => setIntakeMode("text")}><Keyboard size={15} /> Write</button>
            <button type="button" role="tab" aria-selected={intakeMode === "voice"} className={intakeMode === "voice" ? "intake-mode-active" : ""} onClick={() => setIntakeMode("voice")}><Mic size={15} /> Speak</button>
          </div>
          <p className="intake-mode-note">{intakeMode === "text" ? "Share the essentials now. You can add evidence and details after your docket is created." : "Speak naturally. We will build the same private complaint draft and ask you to review it before creating a docket."}</p>

          {intakeMode === "voice" ? <VoiceIntake onSubmitDraft={submitPayload} initialHandoff={consultantHandoff} onDiscardHandoff={() => setConsultantHandoff(null)} onUseText={useTextIntake} /> : <form onSubmit={submitComplaint} noValidate>
            <div className="form-honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex="-1" autoComplete="off" value={websiteTrap} onChange={(event) => setWebsiteTrap(event.target.value)} /></div>
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
                  <option value="">Prefer not to say</option>
                  {['Maharashtra', 'Karnataka', 'Delhi', 'Uttar Pradesh', 'Tamil Nadu', 'Gujarat', 'West Bengal', 'Telangana', 'Rajasthan', 'Kerala', 'Bihar', 'Punjab', 'Madhya Pradesh', 'Andhra Pradesh', 'Odisha', 'Haryana', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand'].map((state) => <option key={state}>{state}</option>)}
                </select>
              </div>
            </div>

            <div className="evidence-row">
              <div className="evidence-icon" aria-hidden="true"><FileUp size={20} /></div>
              <div><strong>Have evidence ready?</strong><p>Evidence is added on the matching issue page after your docket is created, where it strengthens the aggregate signal.</p></div>
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
          </form>}
        </div>
      </section>

      <footer className="page-footer">
        <span>GRAHAK-DRISHTI connects consumer journeys across existing grievance systems.</span>
        <a href="/track">Already have a docket? Track it <ArrowRight size={14} /></a>
      </footer>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, CarFront, Check, CircleDollarSign, Droplets, FileText, FileUp, HeartPulse, House, Landmark, LoaderCircle, PackageSearch, Search, ShieldCheck, UserRoundCheck, Wifi } from "lucide-react";
import indiaMap from "@svg-maps/india";

import { buildComplaintPayload, readApiResponse, validateComplaintForm } from "../lib/complaint.js";
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

const landingSteps = [
  { number: "01", label: "Our vision", title: "Turn scattered experiences into a clearer public view.", detail: "One consumer story can help reveal a pattern without exposing the person behind it." },
  { number: "02", label: "Seamless filing, wherever you are", title: "File your complaint from anywhere in India.", detail: "A guided starting point for consumers in every state, with one private docket to follow." },
  { number: "03", label: "Speak and file", title: "Speak and file your complaint.", detail: "Start naturally, add what you know, and let the case become clearer as it moves forward." },
];

const stateSignals = {
  ap: 58, ar: 31, as: 42, br: 47, ch: 35, ct: 51, dl: 72, ga: 28, gj: 64,
  hr: 49, hp: 27, jk: 24, jh: 39, ka: 68, kl: 54, mp: 61, mh: 86, mn: 22,
  ml: 20, mz: 18, nl: 19, od: 45, pb: 41, py: 26, rj: 57, sk: 12, tn: 74,
  tg: 63, tr: 21, up: 77, ut: 34, wb: 69, an: 14, ld: 8, dn: 16, dd: 16,
};

const stateMapLabels = {
  an: [521, 615, "A&N"], ap: [263, 500, "Andhra Pradesh"], ar: [550, 224, "Arunachal Pradesh"],
  as: [516, 271, "Assam"], br: [369, 275, "Bihar"], ch: [179, 160, "CHD"], ct: [296, 388, "Chhattisgarh"],
  dn: [102, 405, "D&NH"], dd: [54, 391, "D&D"], dl: [190, 210, "Delhi"], ga: [122, 512, "Goa"],
  gj: [66, 355, "Gujarat"], hr: [164, 195, "Haryana"], hp: [191, 133, "HP"], jk: [173, 61, "J&K"],
  jh: [366, 327, "Jharkhand"], ka: [171, 519, "Karnataka"], kl: [166, 615, "Kerala"], ld: [99, 627, "LD"],
  mp: [214, 319, "Madhya Pradesh"], mh: [180, 435, "Maharashtra"], mn: [537, 301, "Manipur"], ml: [484, 283, "Meghalaya"],
  mz: [516, 337, "Mizoram"], nl: [546, 270, "Nagaland"], or: [340, 405, "Odisha"], py: [268, 546, "Puducherry"],
  pb: [151, 152, "Punjab"], rj: [119, 257, "Rajasthan"], sk: [425, 235, "Sikkim"], tn: [211, 609, "Tamil Nadu"],
  tg: [237, 457, "Telangana"], tr: [493, 325, "Tripura"], up: [265, 245, "Uttar Pradesh"], ut: [232, 175, "Uttarakhand"],
  wb: [412, 310, "West Bengal"],
};

const serviceDepartments = [
  { id: "insurance", label: "Insurance", icon: ShieldCheck, categoryShare: "8.08%", filed: 12480, disposed: 7284, pending: 5196 },
  { id: "banking", label: "Banking", icon: Landmark, categoryShare: "12.40%", filed: 19170, disposed: 11140, pending: 8030 },
  { id: "housing", label: "Housing", icon: House, categoryShare: "6.30%", filed: 9740, disposed: 5380, pending: 4360 },
  { id: "electricity", label: "Electricity", icon: Droplets, categoryShare: "4.70%", filed: 7270, disposed: 4340, pending: 2930 },
  { id: "finance", label: "Finance", icon: CircleDollarSign, categoryShare: "9.60%", filed: 14850, disposed: 8613, pending: 6237 },
  { id: "consumer", label: "Consumer goods", icon: PackageSearch, categoryShare: "10.20%", filed: 15780, disposed: 9440, pending: 6340 },
  { id: "medical", label: "Medical", icon: HeartPulse, categoryShare: "7.40%", filed: 11450, disposed: 6620, pending: 4830 },
  { id: "automobiles", label: "Automobiles", icon: CarFront, categoryShare: "5.60%", filed: 8660, disposed: 5210, pending: 3450 },
  { id: "ecommerce", label: "E-commerce", icon: Building2, categoryShare: "22.10%", filed: 34190, disposed: 20100, pending: 14090 },
  { id: "telecom", label: "Telecom", icon: Wifi, categoryShare: "13.80%", filed: 21350, disposed: 12810, pending: 8540 },
];

const totalServiceFiled = serviceDepartments.reduce((total, department) => total + department.filed, 0);
const allServices = { id: "all", label: "All services", icon: Building2, categoryShare: "100%", filed: totalServiceFiled, disposed: serviceDepartments.reduce((total, department) => total + department.disposed, 0), pending: serviceDepartments.reduce((total, department) => total + department.pending, 0) };

const statusByState = Object.fromEntries(
  indiaMap.locations.map((location) => {
    const signal = stateSignals[location.id] || 10;
    const filed = 180 + signal * 31;
    const disposed = Math.round(filed * (0.48 + signal / 300));
    return [location.id, {
      name: location.name,
      categoryShare: `${(4.2 + signal / 20).toFixed(2)}%`,
      filed,
      disposed,
      pending: filed - disposed,
    }];
  }),
);

function signalLevel(value) {
  if (value >= 70) return "high";
  if (value >= 45) return "medium";
  return "low";
}

export default function HomePage() {
  const [activeLandingStep, setActiveLandingStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState("all");
  const [hoveredServiceId, setHoveredServiceId] = useState(null);
  const [selectedState, setSelectedState] = useState("all");
  const [hoveredState, setHoveredState] = useState(null);
  const activeServiceId = hoveredServiceId || selectedServiceId;
  const activeService = serviceDepartments.find((department) => department.id === activeServiceId) || allServices;
  const activeArea = statusByState[hoveredState || selectedState];
  const areaScale = (stateSignals[hoveredState || selectedState] || 86) / 86;
  const activeStatus = activeArea ? { ...activeService, name: activeArea.name, filed: Math.round(activeService.filed * areaScale), disposed: Math.round(activeService.disposed * areaScale), pending: Math.max(0, Math.round((activeService.filed - activeService.disposed) * areaScale)) } : { ...activeService, name: "All India" };
  const activeStatusSource = hoveredServiceId || hoveredState ? "Previewing" : "Selected view";
  const landingStep = landingSteps[activeLandingStep];

  useEffect(() => {
    const cardTimer = window.setInterval(() => {
      setActiveLandingStep((current) => (current + 1) % landingSteps.length);
    }, 4800);
    return () => window.clearInterval(cardTimer);
  }, []);

  function selectState(stateId) {
    setSelectedState(stateId);
    setHoveredState(null);
  }

  function selectService(serviceId) {
    setSelectedServiceId(serviceId);
    setHoveredServiceId(null);
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

      <section className="guidance-strip" aria-labelledby="guidance-title">
        <div className="onboarding-heading">
          <p className="eyebrow">Start with what you know</p>
          <h2 id="guidance-title">A clearer way to take action.</h2>
          <p>File privately, keep your docket close, and understand the wider consumer signal.</p>
        </div>
        <div className="guidance-actions"><a className="primary-button" href="/login?returnTo=%2Freport">Start a private case <ArrowRight size={17} /></a><a className="guidance-text-link" href="/track">Already have a docket? Track it <ArrowRight size={15} /></a></div>
      </section>

      <section className="signal-overview" aria-labelledby="signal-overview-title">
        <div className="signal-overview-heading">
          <p className="eyebrow">Aggregate signals</p>
          <h2 id="signal-overview-title">A clearer picture across India.</h2>
          <p>Explore anonymized patterns by region. These demo figures show how individual cases can become useful public signals.</p>
        </div>
        <div className="signal-overview-layout">
          <div className="signal-map-panel">
            <div className="signal-map-toolbar"><div><strong>Consumer signals across India</strong><span>Choose a state to inspect its aggregate view</span></div><b>Demo data</b></div>
            <div className="signal-map" aria-label="Accurate India state map showing synthetic aggregate consumer issue signals">
              <svg viewBox={indiaMap.viewBox}>
                {indiaMap.locations.map((location) => {
                  const signal = stateSignals[location.id] || 10;
                  return <path className={`india-state signal-level-${signalLevel(signal)} ${selectedState === location.id ? "is-selected" : ""}`} d={location.path} key={location.id} tabIndex="0" role="button" aria-label={`Show ${location.name} case status`} onClick={() => selectState(location.id)} onMouseEnter={() => setHoveredState(location.id)} onMouseLeave={() => setHoveredState(null)} onFocus={() => setHoveredState(location.id)} onBlur={() => setHoveredState(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectState(location.id); } }} />;
                })}
                {indiaMap.locations.map((location) => {
                  const label = stateMapLabels[location.id];
                  if (!label) return null;
                  return <text className="state-map-label" x={label[0]} y={label[1]} key={`label-${location.id}`} pointerEvents="none" textAnchor="middle">{label[2]}</text>;
                })}
              </svg>
              <div className="map-legend"><span><i className="legend-low" /> Lower signal</span><span><i className="legend-high" /> Higher signal</span></div>
            </div>
            <div className="service-selector">
              <div className="service-selector-heading"><strong>Browse by service</strong><span>Hover or select a department</span></div>
              <div className="service-grid">
                {[allServices, ...serviceDepartments].map((department) => { const Icon = department.icon; return <button className={activeServiceId === department.id ? "is-active" : ""} type="button" key={department.id} onClick={() => selectService(department.id)} onMouseEnter={() => setHoveredServiceId(department.id)} onMouseLeave={() => setHoveredServiceId(null)} onFocus={() => setHoveredServiceId(department.id)} onBlur={() => setHoveredServiceId(null)}><Icon size={18} /><span>{department.label}</span></button>; })}
              </div>
            </div>
          </div>
          <div className="signal-summary">
            <div className="signal-area-selector"><label htmlFor="signal-area">View area</label><select id="signal-area" value={selectedState} onChange={(event) => selectState(event.target.value)}><option value="all">All India</option>{indiaMap.locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></div>
            <div className="case-status-card">
              <div className="case-status-heading"><div><span>{activeStatusSource}</span><h3>{activeStatus.name}</h3></div><b>Demo data</b></div>
              <div className="case-category"><strong>{activeService.label}</strong><div><b>{activeStatus.categoryShare}</b><span>of total filed cases</span></div></div>
              <div className="case-status-grid"><div><strong>{activeStatus.filed.toLocaleString("en-IN")}</strong><span>Filed</span></div><div><strong>{activeStatus.disposed.toLocaleString("en-IN")}</strong><span>Disposed</span></div><div><strong>{activeStatus.pending.toLocaleString("en-IN")}</strong><span>Pending</span></div></div>
              <p className="case-status-note">Synthetic figures. Hover or choose a state and service to inspect its aggregate status.</p>
            </div>
            <div className="signal-guidance"><strong>What this means</strong><p>We group reports by service and location to reveal patterns. Individual complaints and contact details never appear here.</p><a href="/issues">Explore public issue signals <ArrowRight size={16} /></a></div>
          </div>
        </div>
      </section>

      <section className="landing-options" aria-labelledby="options-title">
        <div className="landing-section-heading">
          <p className="eyebrow">One place to start</p>
          <h2 id="options-title">Choose what you need today.</h2>
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
        <span className="landing-footer-copyright">© 2026 GRAHAK-DRISHTI. All rights reserved.</span>
        <a className="landing-footer-contact" href="mailto:contact@grahak-drishti.example">Contact us</a>
      </footer>
    </main>
  );
}

export function ComplaintPage() {
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

  useEffect(() => {
    if (window.sessionStorage.getItem("gd-demo-contact")) {
      setDemoSession({ display_name: "Demo Citizen" });
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
"use client";

import { useState } from "react";
import { ArrowLeft, Check, MapPin, Share2, Users } from "lucide-react";

const issue = {
  title: "Refund delays on Platform X",
  sector: "E-commerce",
  issue: "Refund delay",
  reportedCases: 4381,
  confirmations: 8712,
  states: 12,
  financialImpact: "Rs. 31.4L",
  trend: "+240%",
};

export default function PublicIssuePage() {
  const [confirmations, setConfirmations] = useState(issue.confirmations);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  function confirmExperience() {
    if (hasConfirmed) return;
    setConfirmations((current) => current + 1);
    setHasConfirmed(true);
  }

  return (
    <main className="page-shell issue-detail-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <a className="back-link" href="/issues"><ArrowLeft size={15} /> All issue signals</a>
      </header>
      <section className="issue-hero">
        <p className="eyebrow">Synthetic demo data · Aggregate signal</p>
        <h1>{issue.title}</h1>
        <p className="issue-subtitle">A reported pattern, shown without individual complaint details.</p>
        <div className="issue-tags"><span>{issue.sector}</span><span>{issue.issue}</span></div>
      </section>
      <section className="issue-detail-grid" aria-label="Issue aggregate metrics">
        <div className="signal-score"><p className="eyebrow">Consumer signal</p><strong>{issue.trend}</strong><span>reported growth</span><p>Public consumer signals help identify recurring and high-impact issues for evidence-based prioritization.</p></div>
        <div className="metric-grid"><div><Users size={18} /><strong>{issue.reportedCases.toLocaleString()}</strong><span>Reported cases</span></div><div><Check size={18} /><strong>{confirmations.toLocaleString()}</strong><span>“I experienced this too”</span></div><div><MapPin size={18} /><strong>{issue.states}</strong><span>States affected</span></div><div><span className="metric-symbol">Rs.</span><strong>{issue.financialImpact}</strong><span>Reported impact</span></div></div>
      </section>
      <section className="signal-action">
        <div><p className="eyebrow">Add your signal</p><h2>Did this happen to you too?</h2><p>Your confirmation contributes to an aggregate evidence signal. It does not force government action.</p></div>
        <div className="action-buttons"><button className="primary-button" type="button" onClick={confirmExperience} disabled={hasConfirmed}>{hasConfirmed ? <><Check size={17} /> Signal added</> : <>I experienced this too <Check size={17} /> </>}</button><button className="icon-button" type="button" aria-label="Share this issue" title="Share this issue"><Share2 size={18} /></button></div>
      </section>
      <p className="issue-disclaimer">Reported complaints are allegations until verified or resolved. This public page contains aggregate demo data and no individual consumer records.</p>
    </main>
  );
}
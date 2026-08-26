"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, MapPin, RotateCcw, Share2, Users } from "lucide-react";
import { useParams } from "next/navigation";

import { confirmPublicIssue, fetchPublicIssue } from "../../../lib/issues.js";

export default function PublicIssuePage() {
  const params = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const clusterKey = decodeURIComponent(params.slug);

  useEffect(() => {
    loadIssue();
  }, []);

  async function loadIssue() {
    setIsLoading(true);
    setError("");
    try {
      setIssue(await fetchPublicIssue(clusterKey));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Issue data is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmExperience() {
    if (hasConfirmed) return;
    setIsConfirming(true);
    try {
      const result = await confirmPublicIssue(clusterKey);
      setIssue((current) => ({ ...current, confirmations: result.confirmations }));
      setHasConfirmed(result.recorded || hasConfirmed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not add your signal.");
    } finally {
      setIsConfirming(false);
    }
  }

  if (isLoading) return <main className="page-shell issue-state-page"><div className="issue-state"><LoaderCircle className="spin" size={20} /> Loading issue signal...</div></main>;
  if (error || !issue) return <main className="page-shell issue-state-page"><div className="issue-state issue-state-error" role="alert"><span>{error || "Issue data is unavailable right now."}</span><button className="icon-button" type="button" onClick={loadIssue} aria-label="Retry loading issue" title="Retry"><RotateCcw size={17} /></button></div></main>;

  return (
    <main className="page-shell issue-detail-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <a className="back-link" href="/issues"><ArrowLeft size={15} /> All issue signals</a>
      </header>
      <section className="issue-hero">
        <p className="eyebrow">Aggregate signal</p>
        <h1>{issue.title}</h1>
        <p className="issue-subtitle">A reported pattern, shown without individual complaint details.</p>
        <div className="issue-tags"><span>{issue.sector}</span><span>{issue.issue}</span></div>
      </section>
      <section className="issue-detail-grid" aria-label="Issue aggregate metrics">
        <div className="signal-score"><p className="eyebrow">Consumer signal</p><strong>{issue.growth_rate.toLocaleString()}x</strong><span>reported growth</span><p>Public consumer signals help identify recurring and high-impact issues for evidence-based prioritization.</p></div>
        <div className="metric-grid"><div><Users size={18} /><strong>{issue.reported_count.toLocaleString()}</strong><span>Reported cases</span></div><div><Check size={18} /><strong>{issue.confirmations.toLocaleString()}</strong><span>“I experienced this too”</span></div><div><MapPin size={18} /><strong>{issue.states_affected}</strong><span>States affected</span></div><div><span className="metric-symbol">Rs.</span><strong>{Number(issue.total_reported_amount || 0).toLocaleString()}</strong><span>Reported impact</span></div></div>
      </section>
      <section className="signal-action">
        <div><p className="eyebrow">Add your signal</p><h2>Did this happen to you too?</h2><p>Your confirmation contributes to an aggregate evidence signal. It does not force government action.</p></div>
        <div className="action-buttons"><button className="primary-button" type="button" onClick={confirmExperience} disabled={hasConfirmed || isConfirming}>{isConfirming ? <><LoaderCircle className="spin" size={17} /> Adding signal...</> : hasConfirmed ? <><Check size={17} /> Signal added</> : <>I experienced this too <Check size={17} /> </>}</button><button className="icon-button" type="button" aria-label="Share this issue" title="Share this issue"><Share2 size={18} /></button></div>
      </section>
      <p className="issue-disclaimer">Reported complaints are allegations until verified or resolved. This public page contains aggregate demo data and no individual consumer records.</p>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MapPin, RotateCcw } from "lucide-react";

import { fetchPublicIssues } from "../../lib/issues.js";

export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    setIsLoading(true);
    setError("");
    try {
      setIssues(await fetchPublicIssues());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Issue data is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell issues-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </a>
        <span className="quiet-label">Aggregate issue intelligence</span>
      </header>
      <section className="issues-heading">
        <p className="eyebrow">Consumer signals</p>
        <h1>Patterns worth seeing.</h1>
        <p className="intro">
          Explore reported issues as aggregate signals, never as individual accusations.
        </p>
      </section>
      <section className="issue-list" aria-label="Public issue signals">
        {isLoading && <div className="issue-state"><LoaderCircle className="spin" size={20} /> Loading aggregate signals...</div>}
        {error && <div className="issue-state issue-state-error" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={loadIssues} aria-label="Retry loading issue signals" title="Retry"><RotateCcw size={17} /></button></div>}
        {!isLoading && !error && issues.length === 0 && <div className="issue-state">No public issue signals are available yet.</div>}
        {!isLoading && !error && issues.map((issue) => (
          <a className="issue-list-item" href={`/issues/${issue.cluster_key}`} key={issue.cluster_key}>
            <div><p className="eyebrow">Aggregate issue signal</p><h2>{issue.title}</h2><p>{issue.sector} · {issue.issue}</p></div>
            <div className="issue-list-stats"><strong>{issue.reported_count.toLocaleString()}</strong><span>reported consumers</span><span><MapPin size={14} /> {issue.states_affected} states</span></div>
            <ArrowRight className="issue-arrow" size={22} aria-hidden="true" />
          </a>
        ))}
      </section>
      <footer className="page-footer">
        <span>Reported complaints are allegations until verified or resolved.</span>
        <a href="/">Report an issue <ArrowRight size={14} /></a>
      </footer>
    </main>
  );
}
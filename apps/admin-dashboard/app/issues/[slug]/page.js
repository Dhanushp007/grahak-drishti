"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, LoaderCircle, MapPin, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { useParams } from "next/navigation";

import { fetchDashboardIssue } from "../../../lib/dashboard.js";

export default function DashboardIssuePage() {
  const params = useParams();
  const clusterKey = decodeURIComponent(params.slug);
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadIssue();
  }, []);

  async function loadIssue() {
    setError("");
    try {
      setIssue(await fetchDashboardIssue(clusterKey));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Issue data is unavailable right now.");
    }
  }

  if (error) return <main className="dashboard-shell"><section className="dashboard-content dashboard-state"><div><p className="overline">Issue drill-down</p><h1>Issue unavailable.</h1><p>{error}</p><button className="retry-button" type="button" onClick={loadIssue}><RotateCcw size={16} /> Retry</button></div></section></main>;
  if (!issue) return <main className="dashboard-shell"><section className="dashboard-content dashboard-state"><LoaderCircle className="spin" size={22} /><span>Loading issue intelligence...</span></section></main>;

  const trendMaximum = Math.max(...(issue.trend || []).map((point) => point.reports), 1);
  const route = issue.routing || {};
  return (
    <main className="dashboard-shell">
      <aside className="sidebar"><a className="brand" href="/">GRAHAK<span>-</span>DRISHTI</a><p className="sidebar-kicker">Analyst workspace</p><nav aria-label="Dashboard navigation"><a className="nav-item" href="/"><ArrowLeft size={17} /> Command center</a><a className="nav-item active" href="#summary"><ShieldAlert size={17} /> Issue drill-down</a></nav><div className="sidebar-footer"><ShieldAlert size={16} /><span>Aggregate evidence is synthetic and advisory.</span></div></aside>
      <section className="dashboard-content issue-drilldown" id="summary">
        <header className="dashboard-header"><div><p className="overline">Systemic issue intelligence</p><h1>{issue.title}</h1><p className="drill-subtitle">{issue.sector} · {issue.issue} · aggregate demo view</p></div><a className="back-dashboard" href="/"><ArrowLeft size={15} /> Back to command center</a></header>
        <div className="synthetic-banner"><ShieldAlert size={16} /><span><strong>Synthetic demonstration data</strong> · This pattern is an advisory signal, not an established legal finding.</span></div>
        <section className="detail-metrics" aria-label="Issue impact metrics"><div><Users size={18} /><strong>{issue.reported_count.toLocaleString()}</strong><span>consumer reports</span></div><div><Check size={18} /><strong>{issue.evidence_backed_count.toLocaleString()}</strong><span>evidence-backed</span></div><div><MapPin size={18} /><strong>{issue.states_affected}</strong><span>states affected</span></div><div><ArrowUpRight size={18} /><strong>{Math.round(Number(issue.growth_rate) * 100)}%</strong><span>growth signal</span></div></section>
        <div className="drill-grid"><section className="panel"><div className="panel-heading"><div><p className="overline">Pattern over time</p><h2>Reports are accelerating</h2></div><span className="period">6 months</span></div><div className="trend-bars">{(issue.trend || []).map((point) => <div className="trend-column" key={point.month}><strong>{point.reports}</strong><span style={{ height: `${Math.max((point.reports / trendMaximum) * 145, 8)}px` }} /><small>{point.month}</small></div>)}</div></section><section className="panel"><div className="panel-heading"><div><p className="overline">Evidence quality</p><h2>What supports the signal</h2></div></div><div className="quality-stat"><strong>{issue.evidence_backed_count.toLocaleString()}</strong><span>of {issue.reported_count.toLocaleString()} reports include supporting material</span></div><div className="quality-line"><span style={{ width: `${Math.min((issue.evidence_backed_count / issue.reported_count) * 100, 100)}%` }} /></div><p className="panel-note">{issue.reviewed_count.toLocaleString()} reports are marked reviewed in this synthetic dataset. Evidence status is not legal verification.</p></section></div>
        <div className="drill-grid"><section className="panel"><div className="panel-heading"><div><p className="overline">India distribution</p><h2>Where reports concentrate</h2></div><span className="period">{issue.states_affected} states</span></div><div className="state-list">{(issue.geography || []).slice(0, 8).map((point) => <div className="state-list-row" key={point.state}><span>{point.state}</span><strong>{point.reports}</strong><small>{point.evidence_backed} evidence-backed</small></div>)}</div></section><section className="panel routing-panel"><div className="panel-heading"><div><p className="overline">Recommended next step</p><h2>Advisory routing</h2></div><ArrowUpRight size={18} /></div><strong className="route-name">{String(route.route || "review").replaceAll("_", " ")}</strong><p>{route.reason || "An authorized analyst should review this aggregate signal."}</p><small>Confidence: {Math.round(Number(route.confidence || 0) * 100)}% · {route.source || "Demo rule"}</small><div className="advisory-note"><ShieldAlert size={16} /> Recommendations are advisory and do not represent a live government handoff.</div></section></div>
        <footer className="dashboard-footer"><span>GRAHAK-DRISHTI complements existing grievance systems.</span><span>No individual case records</span></footer>
      </section>
    </main>
  );
}
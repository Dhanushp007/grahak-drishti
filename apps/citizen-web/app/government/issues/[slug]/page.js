"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, LoaderCircle, MapPin, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { useParams } from "next/navigation";

import { fetchGovernmentIssue } from "../../../../lib/government.js";

export default function GovernmentIssuePage() {
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
      setIssue(await fetchGovernmentIssue(clusterKey));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Issue data is unavailable right now.");
    }
  }

  if (error) return <main className="government-shell government-state"><div><p className="government-overline">Issue drill-down</p><h1>Issue unavailable.</h1><p>{error}</p><button className="government-action" type="button" onClick={loadIssue}><RotateCcw size={16} /> Retry</button></div></main>;
  if (!issue) return <main className="government-shell government-state"><LoaderCircle className="spin" size={22} /><span>Loading issue intelligence...</span></main>;

  const trendMaximum = Math.max(...(issue.trend || []).map((point) => point.reports), 1);
  const route = issue.routing || {};
  return (
    <main className="government-shell">
      <aside className="government-sidebar"><a className="government-brand" href="/">GRAHAK<span>-</span>DRISHTI</a><p className="government-kicker">Analyst workspace</p><nav aria-label="Government navigation"><a className="government-nav" href="/government"><ArrowLeft size={17} /> Command center</a><a className="government-nav active" href="#summary"><ShieldAlert size={17} /> Issue drill-down</a></nav><div className="government-sidebar-footer"><ShieldAlert size={16} /><span>Aggregate evidence is synthetic and advisory.</span></div></aside>
      <section className="government-content government-drilldown" id="summary">
        <header className="government-header"><div><p className="government-overline">Systemic issue intelligence</p><h1>{issue.title}</h1><p className="government-subtitle">{issue.sector} · {issue.issue} · aggregate demo view</p></div><a className="government-back" href="/government"><ArrowLeft size={15} /> Back to command center</a></header>
        <div className="government-banner"><ShieldAlert size={16} /><span><strong>Synthetic demonstration data</strong> · This pattern is an advisory signal, not an established legal finding.</span></div>
        <section className="government-detail-metrics" aria-label="Issue impact metrics"><div><Users size={18} /><strong>{issue.reported_count.toLocaleString()}</strong><span>consumer reports</span></div><div><Check size={18} /><strong>{issue.evidence_backed_count.toLocaleString()}</strong><span>evidence-backed</span></div><div><MapPin size={18} /><strong>{issue.states_affected}</strong><span>states affected</span></div><div><ArrowUpRight size={18} /><strong>{Math.round(Number(issue.growth_rate) * 100)}%</strong><span>growth signal</span></div></section>
        <div className="government-grid government-drill-grid"><section className="government-panel"><div className="government-panel-heading"><div><p className="government-overline">Pattern over time</p><h2>Reports are accelerating</h2></div><span className="government-period">6 months</span></div><div className="government-trend-bars">{(issue.trend || []).map((point) => <div className="government-trend-column" key={point.month}><strong>{point.reports}</strong><span style={{ height: `${Math.max((point.reports / trendMaximum) * 145, 8)}px` }} /><small>{point.month}</small></div>)}</div></section><section className="government-panel"><div className="government-panel-heading"><div><p className="government-overline">Evidence quality</p><h2>What supports the signal</h2></div></div><div className="government-quality"><strong>{issue.evidence_backed_count.toLocaleString()}</strong><span>of {issue.reported_count.toLocaleString()} reports include supporting material</span></div><div className="government-quality-line"><span style={{ width: `${Math.min((issue.evidence_backed_count / issue.reported_count) * 100, 100)}%` }} /></div><p className="government-panel-note">{issue.reviewed_count.toLocaleString()} reports are marked reviewed in this synthetic dataset. Evidence status is not legal verification.</p></section></div>
        <div className="government-grid government-drill-grid"><section className="government-panel"><div className="government-panel-heading"><div><p className="government-overline">India distribution</p><h2>Where reports concentrate</h2></div><span className="government-period">{issue.states_affected} states</span></div><div className="government-state-list">{(issue.geography || []).slice(0, 8).map((point) => <div className="government-state-row" key={point.state}><span>{point.state}</span><strong>{point.reports}</strong><small>{point.evidence_backed} evidence-backed</small></div>)}</div></section><section className="government-panel government-routing"><div className="government-panel-heading"><div><p className="government-overline">Recommended next step</p><h2>Advisory routing</h2></div><ArrowUpRight size={18} /></div><strong className="government-route-name">{String(route.route || "review").replaceAll("_", " ")}</strong><p>{route.reason || "An authorized analyst should review this aggregate signal."}</p><small>Confidence: {Math.round(Number(route.confidence || 0) * 100)}% · {route.source || "Demo rule"}</small>{issue.potential_dark_pattern_count > 0 && <div className="government-pattern-note"><ShieldAlert size={16} /><span><strong>Potential dark pattern detected</strong> in {issue.potential_dark_pattern_count} aggregate reports. Review the pattern as an advisory concern.</span></div>}<div className="government-advisory-note"><ShieldAlert size={16} /> Recommendations are advisory and do not represent a live government handoff.</div></section></div>
        <footer className="government-footer"><a href="/government">Back to command center</a><span>No individual case records</span></footer>
      </section>
    </main>
  );
}

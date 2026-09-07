"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CircleHelp,
  LoaderCircle,
  Map,
  RotateCcw,
  ShieldAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { fetchGovernmentGeography, fetchGovernmentOverview, loginAsGovernmentOfficial } from "../../lib/government.js";

export default function GovernmentPage() {
  const [dashboard, setDashboard] = useState(null);
  const [geography, setGeography] = useState(null);
  const [error, setError] = useState("");
  const [demoSession, setDemoSession] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setError("");
    try {
      const [overview, stateData] = await Promise.all([
        fetchGovernmentOverview(),
        fetchGovernmentGeography(),
      ]);
      setDashboard(overview);
      setGeography(stateData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard data is unavailable right now.");
    }
  }

  async function startDemoLogin() {
    setIsLoggingIn(true);
    try {
      setDemoSession(await loginAsGovernmentOfficial());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Demo access is unavailable right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (error) {
    return <main className="government-shell government-state"><div><p className="government-overline">Government intelligence</p><h1>Dashboard unavailable.</h1><p>{error}</p><button className="government-action" type="button" onClick={loadDashboard}><RotateCcw size={16} /> Retry</button></div></main>;
  }

  if (!dashboard || !geography) {
    return <main className="government-shell government-state"><LoaderCircle className="spin" size={22} /><span>Loading synthetic intelligence view...</span></main>;
  }

  const topIssue = dashboard.issues[0];
  return (
    <main className="government-shell">
      <aside className="government-sidebar">
        <a className="government-brand" href="/">GRAHAK<span>-</span>DRISHTI</a>
        <p className="government-kicker">Analyst workspace</p>
        <nav aria-label="Government navigation">
          <a className="government-nav active" href="/government"><Activity size={17} /> Command center</a>
          <a className="government-nav" href="#issues"><AlertTriangle size={17} /> Emerging issues <span>{dashboard.issues.length}</span></a>
          <a className="government-nav" href="#map"><Map size={17} /> Issue map</a>
          <a className="government-nav" href="#alerts"><BellRing size={17} /> Alerts</a>
        </nav>
        <div className="government-sidebar-footer"><CircleHelp size={16} /><span>Evidence is aggregate and advisory.</span></div>
      </aside>
      <section className="government-content">
        <header className="government-header">
          <div><p className="government-overline">Government intelligence</p><h1>Consumer protection<br /><em>command center.</em></h1></div>
          <div className="government-meta"><span className="government-live-dot" /> Synthetic signal view <small>{dashboard.as_of}</small>{demoSession ? <span className="government-session"><UserRoundCheck size={14} /> {demoSession.display_name}</span> : <button className="government-login" type="button" onClick={startDemoLogin} disabled={isLoggingIn}><UserRoundCheck size={14} /> {isLoggingIn ? "Opening demo" : "Official demo"}</button>}</div>
        </header>
        <div className="government-banner"><ShieldAlert size={16} /><span><strong>{dashboard.data_label}</strong> · {dashboard.synthetic_notice}</span></div>
        <section className="government-kpi-grid" aria-label="Key metrics">
          {dashboard.kpis.map((kpi) => <div className={`government-kpi ${kpi.tone}`} key={kpi.label}><p>{kpi.label}</p><strong>{kpi.value.toLocaleString()}</strong><span><ArrowUpRight size={13} /> {kpi.change} vs last period</span></div>)}
        </section>
        <div className="government-grid">
          <section className="government-panel" id="issues"><div className="government-panel-heading"><div><p className="government-overline">Priority watchlist</p><h2>Top emerging issues</h2></div><a className="government-link" href="#issues">Review list <ArrowUpRight size={15} /></a></div><div className="government-table" role="table" aria-label="Top emerging issues"><div className="government-table-row government-table-head" role="row"><span>#</span><span>Issue pattern</span><span>Growth</span><span>Reports</span><span>Priority</span></div>{dashboard.issues.map((issue, index) => <a className="government-table-row government-issue-link" role="row" href={`/government/issues/${issue.cluster_key}`} key={issue.cluster_key}><span className="government-rank">{String(index + 1).padStart(2, "0")}</span><span><strong>{issue.title}</strong><small>{issue.sector}</small></span><span className="government-growth">+{Math.round(Number(issue.growth_rate) * 100)}%</span><span>{issue.reported_count.toLocaleString()}</span><span><b className={`government-priority ${Number(issue.severity) >= .75 ? "high" : "medium"}`}>{Number(issue.severity) >= .75 ? "High" : "Medium"}</b></span></a>)}</div></section>
          <section className="government-panel"><div className="government-panel-heading"><div><p className="government-overline">Systemic signal</p><h2>What changed</h2></div><span className="government-period">Aggregate</span></div><div className="government-signal"><div className="government-ring"><strong>{dashboard.signal_strength}</strong><span>signal<br />strength</span></div><div><p>{topIssue ? <>{topIssue.title} is appearing across <strong>{topIssue.states_affected} states</strong> with <strong>{topIssue.evidence_backed_count.toLocaleString()} evidence-backed reports</strong>.</> : "No systemic issue signal is available yet."}</p><a href={topIssue ? `/government/issues/${topIssue.cluster_key}` : "#issues"}>Open issue drill-down <ArrowUpRight size={15} /></a></div></div><div className="government-explanation"><Users size={16} /><span>Priority combines volume, growth, financial impact, severity, unresolved rate, and geographic spread.</span></div></section>
        </div>
        <div className="government-grid government-lower-grid"><section className="government-panel" id="map"><div className="government-panel-heading"><div><p className="government-overline">India issue map</p><h2>State distribution</h2></div><span className="government-period">Aggregate · synthetic</span></div><div className="government-bars">{geography.states.slice(0, 8).map((state, index) => <div className="government-bar-row" key={state.state}><div><span>{state.state}</span><strong>{state.reports.toLocaleString()}</strong></div><div className="government-bar-track"><span className={`government-bar-fill tone-${index % 3}`} style={{ width: `${Math.max(state.share, 2)}%` }} /></div></div>)}</div></section><section className="government-panel" id="alerts"><div className="government-panel-heading"><div><p className="government-overline">Needs attention</p><h2>Analyst notes</h2></div><BellRing size={18} /></div>{topIssue ? <div className="government-note"><span className="government-note-dot coral" /><div><strong>{topIssue.title}</strong><p>High growth and unresolved rate. Review the advisory routing recommendation.</p></div></div> : null}<div className="government-note"><span className="government-note-dot yellow" /><div><strong>Evidence quality</strong><p>{topIssue ? `${topIssue.reviewed_count.toLocaleString()} reports have been reviewed in this synthetic view.` : "No reviewed reports yet."}</p></div></div></section></div>
        <footer className="government-footer"><a href="/">Citizen experience</a><span>Aggregate view · No individual case records</span></footer>
      </section>
    </main>
  );
}

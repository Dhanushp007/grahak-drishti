"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, BellRing, CircleHelp, LoaderCircle, Map, RotateCcw, ShieldAlert, UserRoundCheck, Users } from "lucide-react";

import { fetchDashboardGeography, fetchDashboardOverview } from "../lib/dashboard.js";
import { loginAsDemoGovernmentOfficial } from "../lib/demo.js";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [geography, setGeography] = useState(null);
  const [error, setError] = useState("");
  const [demoSession, setDemoSession] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setError("");
    try {
      const [overview, stateData] = await Promise.all([fetchDashboardOverview(), fetchDashboardGeography()]);
      setDashboard(overview);
      setGeography(stateData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard data is unavailable right now.");
    }
  }

  async function startDemoLogin() {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      setDemoSession(await loginAsDemoGovernmentOfficial());
    } catch (requestError) {
      setLoginError(requestError instanceof Error ? requestError.message : "Demo access is unavailable right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (error) return <main className="dashboard-shell"><section className="dashboard-content dashboard-state"><div><p className="overline">Government intelligence</p><h1>Dashboard unavailable.</h1><p>{error}</p><button className="retry-button" type="button" onClick={loadDashboard}><RotateCcw size={16} /> Retry</button></div></section></main>;
  if (!dashboard || !geography) return <main className="dashboard-shell"><section className="dashboard-content dashboard-state"><LoaderCircle className="spin" size={22} /><span>Loading synthetic intelligence view...</span></section></main>;

  const topIssue = dashboard.issues[0];
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="/">GRAHAK<span>-</span>DRISHTI</a>
        <p className="sidebar-kicker">Analyst workspace</p>
        <nav aria-label="Dashboard navigation">
          <a className="nav-item active" href="/"><Activity size={17} /> Command center</a>
          <a className="nav-item" href="#issues"><AlertTriangle size={17} /> Emerging issues <span>{dashboard.issues.length}</span></a>
          <a className="nav-item" href="#map"><Map size={17} /> Issue map</a>
          <a className="nav-item" href="#alerts"><BellRing size={17} /> Alerts</a>
        </nav>
        <div className="sidebar-footer"><CircleHelp size={16} /><span>Evidence is aggregate and advisory.</span></div>
      </aside>
      <section className="dashboard-content">
        <header className="dashboard-header">
          <div><p className="overline">Government intelligence</p><h1>Consumer protection<br /><em>command center.</em></h1></div>
          <div className="header-meta"><span className="live-dot" /> Synthetic signal view <small>{dashboard.as_of}</small>{demoSession ? <span className="demo-session"><UserRoundCheck size={14} /> {demoSession.display_name}</span> : <button className="demo-login-button" type="button" onClick={startDemoLogin} disabled={isLoggingIn}><UserRoundCheck size={14} /> {isLoggingIn ? "Opening demo" : "Official demo"}</button>}{loginError && <span className="demo-login-error" role="alert">{loginError}</span>}</div>
        </header>
        <div className="synthetic-banner"><ShieldAlert size={16} /><span><strong>{dashboard.data_label}</strong> · {dashboard.synthetic_notice}</span></div>
        <section className="kpi-grid" aria-label="Key metrics">
          {dashboard.kpis.map((kpi) => <div className={`kpi-card ${kpi.tone}`} key={kpi.label}><p>{kpi.label}</p><strong>{kpi.value.toLocaleString()}</strong><span><ArrowUpRight size={13} /> {kpi.change} vs last period</span></div>)}
        </section>
        <div className="dashboard-grid">
          <section className="panel issues-panel" id="issues"><div className="panel-heading"><div><p className="overline">Priority watchlist</p><h2>Top emerging issues</h2></div><a className="text-link" href="#issues">Review list <ArrowUpRight size={15} /></a></div><div className="issue-table" role="table" aria-label="Top emerging issues"><div className="table-row table-head" role="row"><span>#</span><span>Issue pattern</span><span>Growth</span><span>Reports</span><span>Priority</span></div>{dashboard.issues.map((issue, index) => <a className="table-row issue-row-link" role="row" href={`/issues/${issue.cluster_key}`} key={issue.cluster_key}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span><strong>{issue.title}</strong><small>{issue.sector}</small></span><span className="growth">+{Math.round(Number(issue.growth_rate) * 100)}%</span><span>{issue.reported_count.toLocaleString()}</span><span><b className={`priority ${Number(issue.severity) >= .75 ? "high" : "medium"}`}>{Number(issue.severity) >= .75 ? "High" : "Medium"}</b></span></a>)}</div></section>
          <section className="panel signal-panel"><div className="panel-heading"><div><p className="overline">Systemic signal</p><h2>What changed</h2></div><span className="period">Aggregate</span></div><div className="signal-visual"><div className="signal-ring"><strong>{dashboard.signal_strength}</strong><span>signal<br />strength</span></div><div className="signal-copy"><p>{topIssue ? <>{topIssue.title} is appearing across <strong>{topIssue.states_affected} states</strong> with <strong>{topIssue.evidence_backed_count.toLocaleString()} evidence-backed reports</strong>.</> : "No systemic issue signal is available yet."}</p><a href={topIssue ? `/issues/${topIssue.cluster_key}` : "#issues"}>Open issue drill-down <ArrowUpRight size={15} /></a></div></div><div className="explanation"><Users size={16} /><span>Priority combines volume, growth, financial impact, severity, unresolved rate, and geographic spread.</span></div></section>
        </div>
        <div className="dashboard-grid lower-grid"><section className="panel sector-panel" id="map"><div className="panel-heading"><div><p className="overline">India issue map</p><h2>State distribution</h2></div><span className="period">Aggregate · synthetic</span></div><div className="sector-bars">{geography.states.slice(0, 8).map((state, index) => <div className="sector-row" key={state.state}><div><span>{state.state}</span><strong>{state.reports.toLocaleString()}</strong></div><div className="bar-track"><span className={`bar-fill ${index % 3 === 0 ? "coral" : index % 3 === 1 ? "teal" : "yellow"}`} style={{ width: `${Math.max(state.share, 2)}%` }} /></div></div>)}</div></section><section className="panel alert-panel" id="alerts"><div className="panel-heading"><div><p className="overline">Needs attention</p><h2>Analyst notes</h2></div><BellRing size={18} /></div>{topIssue ? <div className="note-item"><span className="note-dot coral" /><div><strong>{topIssue.title}</strong><p>High growth and unresolved rate. Review the advisory routing recommendation.</p></div></div> : null}<div className="note-item"><span className="note-dot yellow" /><div><strong>Evidence quality</strong><p>{topIssue ? `${topIssue.reviewed_count.toLocaleString()} reports have been reviewed in this synthetic view.` : "No reviewed reports yet."}</p></div></div></section></div>
        <footer className="dashboard-footer"><span>GRAHAK-DRISHTI complements existing grievance systems. It does not replace NCH, regulators, or consumer commissions.</span><span>Aggregate view · No individual case records</span></footer>
      </section>
    </main>
  );
}
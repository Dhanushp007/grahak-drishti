import { Activity, AlertTriangle, ArrowUpRight, BellRing, CircleHelp, Map, ShieldAlert, Users } from "lucide-react";

import { dashboardSnapshot } from "../lib/dashboard.js";

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="/">GRAHAK<span>-</span>DRISHTI</a>
        <p className="sidebar-kicker">Analyst workspace</p>
        <nav aria-label="Dashboard navigation">
          <a className="nav-item active" href="/"><Activity size={17} /> Command center</a>
          <a className="nav-item" href="#issues"><AlertTriangle size={17} /> Emerging issues <span>147</span></a>
          <a className="nav-item" href="#map"><Map size={17} /> Issue map</a>
          <a className="nav-item" href="#alerts"><BellRing size={17} /> Alerts <span>11</span></a>
        </nav>
        <div className="sidebar-footer"><CircleHelp size={16} /><span>Evidence is aggregate and advisory.</span></div>
      </aside>
      <section className="dashboard-content">
        <header className="dashboard-header">
          <div><p className="overline">Government intelligence</p><h1>Consumer protection<br /><em>command center.</em></h1></div>
          <div className="header-meta"><span className="live-dot" /> Live signal view <small>{dashboardSnapshot.asOf}</small></div>
        </header>
        <div className="synthetic-banner"><ShieldAlert size={16} /><span><strong>{dashboardSnapshot.dataLabel}</strong> · Figures are for demonstration and are not official government statistics.</span></div>
        <section className="kpi-grid" aria-label="Key metrics">
          {dashboardSnapshot.kpis.map((kpi) => <div className={`kpi-card ${kpi.tone}`} key={kpi.label}><p>{kpi.label}</p><strong>{kpi.value}</strong><span><ArrowUpRight size={13} /> {kpi.change} vs last period</span></div>)}
        </section>
        <div className="dashboard-grid">
          <section className="panel issues-panel" id="issues"><div className="panel-heading"><div><p className="overline">Priority watchlist</p><h2>Top emerging issues</h2></div><button className="text-link" type="button">View all <ArrowUpRight size={15} /></button></div><div className="issue-table" role="table" aria-label="Top emerging issues"><div className="table-row table-head" role="row"><span>#</span><span>Issue pattern</span><span>Growth</span><span>Reports</span><span>Priority</span></div>{dashboardSnapshot.issues.map((issue) => <div className="table-row" role="row" key={issue.title}><span className="rank">{String(issue.rank).padStart(2, "0")}</span><span><strong>{issue.title}</strong><small>{issue.sector}</small></span><span className="growth">{issue.growth}</span><span>{issue.reports}</span><span><b className={`priority ${issue.priority.toLowerCase()}`}>{issue.priority}</b></span></div>)}</div></section>
          <section className="panel signal-panel"><div className="panel-heading"><div><p className="overline">Systemic signal</p><h2>What changed</h2></div><span className="period">7 days</span></div><div className="signal-visual"><div className="signal-ring"><strong>82</strong><span>signal<br />strength</span></div><div className="signal-copy"><p>Refund delays are appearing across <strong>12 states</strong> with a reported impact of <strong>Rs. 31.4L</strong>.</p><a href="#issues">Open issue drill-down <ArrowUpRight size={15} /></a></div></div><div className="explanation"><Users size={16} /><span>Priority combines volume, growth, financial impact, severity, unresolved rate, and geographic spread.</span></div></section>
        </div>
        <div className="dashboard-grid lower-grid"><section className="panel sector-panel" id="map"><div className="panel-heading"><div><p className="overline">Issue map</p><h2>Sector distribution</h2></div><span className="period">India · aggregate</span></div><div className="sector-bars">{dashboardSnapshot.sectors.map((sector) => <div className="sector-row" key={sector.name}><div><span>{sector.name}</span><strong>{sector.value}%</strong></div><div className="bar-track"><span className={`bar-fill ${sector.color}`} style={{ width: `${sector.value * 2.38}%` }} /></div></div>)}</div></section><section className="panel alert-panel" id="alerts"><div className="panel-heading"><div><p className="overline">Needs attention</p><h2>Analyst notes</h2></div><BellRing size={18} /></div><div className="note-item"><span className="note-dot coral" /><div><strong>Refund delays</strong><p>High growth and unresolved rate. Review company-level convergence evidence.</p></div></div><div className="note-item"><span className="note-dot yellow" /><div><strong>Subscription traps</strong><p>Potential pattern detected. Regulatory review is advisory.</p></div></div></section></div>
        <footer className="dashboard-footer"><span>GRAHAK-DRISHTI complements existing grievance systems. It does not replace NCH, regulators, or consumer commissions.</span><span>Aggregate view · No individual case records</span></footer>
      </section>
    </main>
  );
}
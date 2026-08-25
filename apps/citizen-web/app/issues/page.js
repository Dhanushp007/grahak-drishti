import { ArrowRight, MapPin } from "lucide-react";

const issues = [
  {
    slug: "refund-delays-platform-x",
    title: "Refund delays on Platform X",
    detail: "A reported pattern across e-commerce refunds",
    affected: "4,381",
    states: "12 states",
  },
];

export default function IssuesPage() {
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
        {issues.map((issue) => (
          <a className="issue-list-item" href={`/issues/${issue.slug}`} key={issue.slug}>
            <div>
              <p className="eyebrow">Synthetic demo data</p>
              <h2>{issue.title}</h2>
              <p>{issue.detail}</p>
            </div>
            <div className="issue-list-stats">
              <strong>{issue.affected}</strong>
              <span>reported consumers</span>
              <span><MapPin size={14} /> {issue.states}</span>
            </div>
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
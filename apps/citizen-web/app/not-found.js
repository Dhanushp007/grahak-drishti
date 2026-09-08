import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-shell error-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">
          GRAHAK<span>-</span>DRISHTI
        </Link>
        <Link className="back-link" href="/"><ArrowLeft size={15} /> Back to home</Link>
      </header>
      <section className="error-panel" aria-labelledby="not-found-title">
        <p className="eyebrow">Page not found</p>
        <h1 id="not-found-title">This path is not part of the journey.</h1>
        <p>The page may have moved. Start a private report, track a docket, or explore aggregate issue signals.</p>
        <div className="error-actions">
          <Link className="primary-button" href="/report">Start a report <Search size={17} /></Link>
          <Link className="text-button" href="/issues">Explore issue signals</Link>
        </div>
      </section>
    </main>
  );
}

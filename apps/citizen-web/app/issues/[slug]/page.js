"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileCheck2, LoaderCircle, MapPin, RotateCcw, Share2, Users } from "lucide-react";
import { useParams } from "next/navigation";

import { fetchPublicIssue, startPublicCorroboration, submitCorroborationEvidence, submitCorroborationUpload } from "../../../lib/issues.js";

export default function PublicIssuePage() {
  const params = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [corroboration, setCorroboration] = useState(null);
  const [evidenceType, setEvidenceType] = useState("refund/cancellation screenshot");
  const [filename, setFilename] = useState("");
  const [file, setFile] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [shareStatus, setShareStatus] = useState("");
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

  async function startExperience() {
    if (hasConfirmed || corroboration) return;
    setIsConfirming(true);
    setError("");
    try {
      const result = await startPublicCorroboration(clusterKey, explanation);
      setCorroboration(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not start your signal.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function submitEvidence(event) {
    event.preventDefault();
    setIsConfirming(true);
    setError("");
    try {
      const result = file
        ? await submitCorroborationUpload(corroboration.corroboration_id, evidenceType, file)
        : await submitCorroborationEvidence(corroboration.corroboration_id, {
          evidence_type: evidenceType,
          filename: filename.trim() || null,
        });
      setIssue((current) => ({
        ...current,
        confirmations: result.confirmations,
        evidence_backed_count: result.evidence_backed_count,
      }));
      setHasConfirmed(true);
      setCorroboration({ ...corroboration, ...result });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not submit the evidence.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function shareIssue() {
    setShareStatus("");
    try {
      await globalThis.navigator.clipboard.writeText(globalThis.location.href);
      setShareStatus("Issue link copied.");
    } catch {
      setShareStatus("Copy the issue link from your browser address bar.");
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
        <div className="metric-grid"><div><Users size={18} /><strong>{issue.reported_count.toLocaleString()}</strong><span>Reported cases</span></div><div><FileCheck2 size={18} /><strong>{issue.evidence_backed_count.toLocaleString()}</strong><span>Evidence-backed</span></div><div><Check size={18} /><strong>{issue.confirmations.toLocaleString()}</strong><span>Corroborations recorded</span></div><div><MapPin size={18} /><strong>{issue.states_affected}</strong><span>States affected</span></div><div><span className="metric-symbol">Rs.</span><strong>{Number(issue.total_reported_amount || 0).toLocaleString()}</strong><span>Reported impact</span></div></div>
      </section>
      <section className="issue-context-grid" aria-label="Issue pattern context">
        <div><p className="eyebrow">Trend</p><strong>{issue.trend?.at(-1)?.reports?.toLocaleString() || 0} reports in the latest period</strong><span>Compared with {issue.trend?.at(-2)?.reports?.toLocaleString() || 0} in the previous period.</span></div>
        <div><p className="eyebrow">Recommended next step</p><strong>{String(issue.routing?.route || "review").replaceAll("_", " ")}</strong><span>{issue.routing?.reason || "An authorized reviewer should assess this aggregate signal."}</span></div>
      </section>
      <section className="signal-action">
        <div><p className="eyebrow">Add your signal</p><h2>Did this happen to you too?</h2><p>Your confirmation contributes to an aggregate evidence signal. It does not force government action.</p></div>
        {!corroboration ? (
          <div className="action-buttons"><button className="primary-button" type="button" onClick={startExperience} disabled={hasConfirmed || isConfirming}>{isConfirming ? <><LoaderCircle className="spin" size={17} /> Starting...</> : hasConfirmed ? <><Check size={17} /> Signal added</> : <>I experienced this too <Check size={17} /> </>}</button><button className="icon-button" type="button" onClick={shareIssue} aria-label="Share this issue" title="Share this issue"><Share2 size={18} /></button>{shareStatus && <span className="share-status" role="status">{shareStatus}</span>}</div>
        ) : hasConfirmed ? (
          <div className="evidence-confirmation"><FileCheck2 size={19} /><div><strong>Demo evidence submitted</strong><span>Recorded for review. It is not legally verified.</span></div></div>
        ) : (
          <form className="corroboration-form" onSubmit={submitEvidence}>
            <p className="field-hint">Supporting proof helps distinguish a corroborated report from a blind vote.</p>
            <label htmlFor="evidenceType">What proof do you have?</label>
            <select id="evidenceType" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
              <option>invoice / bill</option><option>order screenshot</option><option>refund/cancellation screenshot</option><option>email/message screenshot</option><option>warranty document</option><option>photo/video</option><option>other supporting proof</option>
            </select>
            <label htmlFor="filename">Demo file name <span className="optional">(optional)</span></label>
            <input id="filename" value={filename} onChange={(event) => setFilename(event.target.value)} placeholder="for example: refund-confirmation.png" />
            <label htmlFor="evidenceUpload">Upload supporting proof <span className="optional">(optional)</span></label>
            <input id="evidenceUpload" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            {file && <span className="selected-file">Selected: {file.name}</span>}
            <label htmlFor="explanation">Short explanation <span className="optional">(optional)</span></label>
            <textarea id="explanation" value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="What does this proof show?" rows="3" />
            <button className="primary-button" type="submit" disabled={isConfirming}>{isConfirming ? <><LoaderCircle className="spin" size={17} /> Recording...</> : <>Submit demo evidence <FileCheck2 size={17} /></>}</button>
          </form>
        )}
      </section>
      {error && <p className="submission-error issue-action-error" role="alert">{error}</p>}
      <p className="issue-disclaimer">Reported complaints are allegations until verified or resolved. This public page contains aggregate demo data and no individual consumer records.</p>
    </main>
  );
}
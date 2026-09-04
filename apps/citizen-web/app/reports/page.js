"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, LoaderCircle, Pencil, RotateCcw, Save } from "lucide-react";

import { fetchMyReports, updateMyReport } from "../../lib/reports.js";

const initialContact = { email: "", phone: "" };

function contactValue(contact) {
  if (contact.email.trim() && contact.phone.trim()) throw new Error("Use either email or phone, not both.");
  if (!contact.email.trim() && !contact.phone.trim()) throw new Error("Add the contact used for your report.");
  return contact.email.trim() ? { email: contact.email.trim() } : { phone: contact.phone.trim() };
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReportsPage() {
  const [contact, setContact] = useState(initialContact);
  const [activeContact, setActiveContact] = useState(null);
  const [reports, setReports] = useState([]);
  const [editingDocket, setEditingDocket] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedContact = window.sessionStorage.getItem("gd-demo-contact");
    if (savedContact) {
      const saved = { email: savedContact, phone: "" };
      setContact(saved);
      void loadReports({ email: savedContact });
    }
  }, []);

  async function loadReports(nextContact) {
    setError("");
    setIsLoading(true);
    try {
      const result = await fetchMyReports(nextContact);
      setReports(result);
      setActiveContact(nextContact);
    } catch (requestError) {
      setReports([]);
      setError(requestError instanceof Error ? requestError.message : "We could not load your reports.");
    } finally {
      setIsLoading(false);
    }
  }

  async function findReports(event) {
    event.preventDefault();
    try {
      await loadReports(contactValue(contact));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Add the contact used for your report.");
    }
  }

  function beginEdit(report) {
    setEditingDocket(report.docket_number);
    setEditForm({
      description: report.description,
      company_name: report.company_name || "",
      amount_involved: report.amount_involved || "",
      state: report.state || "",
    });
    setError("");
  }

  async function saveEdit(report) {
    if (!activeContact || !editForm) return;
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateMyReport(report.docket_number, { ...editForm, contact: activeContact });
      setReports((current) => current.map((item) => item.docket_number === updated.docket_number ? updated : item));
      setEditingDocket(null);
      setEditForm(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not update your report.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell reports-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRAHAK-DRISHTI home">GRAHAK<span>-</span>DRISHTI</a>
        <nav className="topbar-nav" aria-label="Citizen navigation"><a href="/issues">Explore issues</a><a href="/">Report an issue</a></nav>
      </header>
      <section className="reports-heading">
        <p className="eyebrow">Private case access</p>
        <h1>My reports.</h1>
        <p className="intro">See your submitted dockets and update a report during its first 48 hours.</p>
      </section>
      <section className="reports-content">
        <form className="form-card reports-lookup" onSubmit={findReports} noValidate>
          <div className="form-card-heading"><div><p className="eyebrow">Find your reports</p><h2>Use your contact</h2></div></div>
          <p className="field-hint">Use the same email or phone number that was attached to the docket.</p>
          <div className="two-column-fields">
            <div className="field-group"><label htmlFor="reports-email">Email</label><input id="reports-email" type="email" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} /></div>
            <div className="field-group"><label htmlFor="reports-phone">Phone</label><input id="reports-phone" type="tel" value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} /></div>
          </div>
          <button className="submit-button" type="submit" disabled={isLoading}>{isLoading ? <><LoaderCircle className="spin" size={18} /> Finding reports...</> : <>Show my reports <ArrowLeft size={17} className="turn-right" /></>}</button>
        </form>
        <section className="reports-list" aria-live="polite">
          {error && <div className="issue-state issue-state-error" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={() => activeContact && loadReports(activeContact)} aria-label="Retry loading reports" title="Retry"><RotateCcw size={17} /></button></div>}
          {!isLoading && !error && activeContact && reports.length === 0 && <div className="issue-state">No private reports were found for this contact.</div>}
          {!activeContact && !isLoading && !error && <div className="reports-empty"><Clock3 size={20} /><span>Enter the contact used for a report to load your private cases.</span><a href="/login?returnTo=%2Freport">File a case <ArrowLeft size={14} className="turn-right" /></a></div>}
          {reports.map((report) => (
            <article className="report-card" key={report.docket_number}>
              <div className="report-card-header"><div><p className="eyebrow">Docket</p><h2>{report.docket_number}</h2></div><span className={`report-status ${report.status}`}>{report.status}</span></div>
              {editingDocket === report.docket_number && editForm ? (
                <form className="report-edit-form" onSubmit={(event) => { event.preventDefault(); void saveEdit(report); }}>
                  <div className="field-group"><label htmlFor={`description-${report.docket_number}`}>What happened?</label><textarea id={`description-${report.docket_number}`} rows="4" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} /></div>
                  <div className="two-column-fields"><div className="field-group"><label htmlFor={`company-${report.docket_number}`}>Company or seller</label><input id={`company-${report.docket_number}`} value={editForm.company_name} onChange={(event) => setEditForm((current) => ({ ...current, company_name: event.target.value }))} /></div><div className="field-group"><label htmlFor={`amount-${report.docket_number}`}>Amount involved</label><input id={`amount-${report.docket_number}`} inputMode="decimal" value={editForm.amount_involved} onChange={(event) => setEditForm((current) => ({ ...current, amount_involved: event.target.value }))} /></div></div>
                  <div className="report-edit-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <><LoaderCircle className="spin" size={16} /> Saving...</> : <><Save size={16} /> Save changes</>}</button><button className="text-button" type="button" onClick={() => setEditingDocket(null)}>Cancel</button></div>
                </form>
              ) : <><p className="report-description">{report.description}</p><div className="report-facts"><span><strong>Company</strong>{report.company_name || "Not provided"}</span><span><strong>Amount</strong>{report.amount_involved ? `Rs. ${Number(report.amount_involved).toLocaleString("en-IN")}` : "Not provided"}</span><span><strong>Last updated</strong>{formatDate(report.updated_at)}</span></div></>}
              <div className="report-card-footer"><span>Submitted {formatDate(report.submitted_at)}</span>{report.editable ? <><span>Editable until {formatDate(report.editable_until)}</span>{editingDocket !== report.docket_number && <button className="text-button report-edit-button" type="button" onClick={() => beginEdit(report)}><Pencil size={14} /> Edit report</button>}</> : <span className="read-only-label"><Check size={14} /> This report is now read-only</span>}</div>
            </article>
          ))}
        </section>
      </section>
      <footer className="page-footer"><span>Private case access · synthetic demo environment</span><a href="/track">Track a docket <ArrowLeft size={14} className="turn-right" /></a></footer>
    </main>
  );
}

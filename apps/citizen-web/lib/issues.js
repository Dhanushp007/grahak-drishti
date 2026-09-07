import { readApiResponse } from "./complaint.js";

const API_PREFIX = "/api/backend/api/v1/issues";

export async function fetchPublicIssues() {
  return readApiResponse(await fetch(API_PREFIX, { cache: "no-store" }));
}

export async function fetchPublicIssue(clusterKey) {
  return readApiResponse(
    await fetch(`${API_PREFIX}/${encodeURIComponent(clusterKey)}`, { cache: "no-store" }),
  );
}

export async function confirmPublicIssue(clusterKey) {
  const confirmationKey = getConfirmationKey();
  return readApiResponse(
    await fetch(`${API_PREFIX}/${encodeURIComponent(clusterKey)}/confirm`, {
      method: "POST",
      headers: { "X-Confirmation-Key": confirmationKey },
    }),
  );
}

function getConfirmationKey() {
  const storageKey = "grahak-drishti-confirmation-key";
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = window.crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
  }
  return key;
}

export async function startPublicCorroboration(clusterKey, explanation = "") {
  return readApiResponse(
    await fetch(`${API_PREFIX}/${encodeURIComponent(clusterKey)}/corroborations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmation_key: getConfirmationKey(),
        explanation: explanation.trim() || null,
      }),
    }),
  );
}

export async function submitCorroborationEvidence(corroborationId, evidence) {
  return readApiResponse(
    await fetch(`${API_PREFIX}/corroborations/${encodeURIComponent(corroborationId)}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evidence),
    }),
  );
}

export async function submitCorroborationUpload(corroborationId, evidenceType, file) {
  const formData = new FormData();
  formData.append("evidence_type", evidenceType);
  formData.append("upload", file);
  return readApiResponse(
    await fetch(`${API_PREFIX}/corroborations/${encodeURIComponent(corroborationId)}/evidence/upload`, {
      method: "POST",
      body: formData,
    }),
  );
}
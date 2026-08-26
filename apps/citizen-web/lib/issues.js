const API_PREFIX = "/api/backend/api/v1/issues";

async function readJson(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || "Issue data is unavailable right now.");
  }
  return body;
}

export async function fetchPublicIssues() {
  return readJson(await fetch(API_PREFIX, { cache: "no-store" }));
}

export async function fetchPublicIssue(clusterKey) {
  return readJson(
    await fetch(`${API_PREFIX}/${encodeURIComponent(clusterKey)}`, { cache: "no-store" }),
  );
}

export async function confirmPublicIssue(clusterKey) {
  const confirmationKey = getConfirmationKey();
  return readJson(
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
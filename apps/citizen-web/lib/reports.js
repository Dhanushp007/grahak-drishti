export async function fetchMyReports(contact) {
  const response = await fetch("/api/backend/api/v1/complaints/my-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "We could not load your reports.");
  return body;
}

export async function updateMyReport(docketNumber, payload) {
  const response = await fetch(`/api/backend/api/v1/complaints/${encodeURIComponent(docketNumber)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "We could not update your report.");
  return body;
}

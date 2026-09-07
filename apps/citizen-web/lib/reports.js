import { readApiResponse } from "./complaint.js";

export async function fetchMyReports(contact) {
  const response = await fetch("/api/backend/api/v1/complaints/my-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  });
  if (response.status === 404) return [];
  return readApiResponse(response);
}

export async function updateMyReport(docketNumber, payload) {
  const response = await fetch(`/api/backend/api/v1/complaints/${encodeURIComponent(docketNumber)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readApiResponse(response);
}

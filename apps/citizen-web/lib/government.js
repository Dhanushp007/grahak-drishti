async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || "Government intelligence is unavailable right now.");
  }
  return body;
}

export async function fetchGovernmentOverview() {
  return readJson(await fetch("/api/backend/api/v1/dashboard/overview", { cache: "no-store" }));
}

export async function fetchGovernmentGeography() {
  return readJson(await fetch("/api/backend/api/v1/dashboard/geography", { cache: "no-store" }));
}

export async function fetchGovernmentIssue(clusterKey) {
  return readJson(
    await fetch(`/api/backend/api/v1/dashboard/issues/${encodeURIComponent(clusterKey)}`, {
      cache: "no-store",
    }),
  );
}

export async function loginAsGovernmentOfficial() {
  return readJson(
    await fetch("/api/backend/api/v1/demo/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "government" }),
    }),
  );
}

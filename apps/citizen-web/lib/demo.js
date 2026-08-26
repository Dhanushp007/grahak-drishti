async function readDemoLogin(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || "Demo access is unavailable right now.");
  }
  return body;
}

export async function loginAsDemoCitizen() {
  return readDemoLogin(
    await fetch("/api/backend/api/v1/demo/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "citizen" }),
    }),
  );
}
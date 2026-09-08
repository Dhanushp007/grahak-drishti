import { readApiResponse } from "./complaint.js";

async function readDemoLogin(response) {
  return readApiResponse(response);
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
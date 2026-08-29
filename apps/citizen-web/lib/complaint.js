export async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const rawBody = await response.text();
  let body = null;

  if (contentType.includes("application/json") && rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        (response.status >= 500
          ? "The reporting service is temporarily unavailable. Please try again shortly."
          : "We could not complete that request."),
    );
  }

  if (!body) {
    throw new Error("The reporting service returned an invalid response. Please try again.");
  }
  return body;
}

export function validateComplaintForm(form) {
  const errors = {};
  if (!form.description.trim()) {
    errors.description = "Tell us what happened so we can create your report.";
  }
  if (form.email.trim() && form.phone.trim()) {
    errors.contact = "Use either email or phone, not both.";
  } else if (!form.email.trim() && !form.phone.trim()) {
    errors.contact = "Add an email or phone number to track your report.";
  }
  return errors;
}

export function buildComplaintPayload(form) {
  const contact = form.email.trim()
    ? { email: form.email.trim() }
    : { phone: form.phone.trim() };
  return {
    description: form.description.trim(),
    company_name: form.companyName.trim() || null,
    amount_involved: form.amountInvolved.trim() || null,
    ...(form.state?.trim() ? { state: form.state.trim() } : {}),
    contact,
  };
}

export function buildTrackingPayload(form) {
  const contact = form.email.trim()
    ? { email: form.email.trim() }
    : { phone: form.phone.trim() };
  return {
    docket_number: form.docket.trim().toUpperCase(),
    contact,
  };
}
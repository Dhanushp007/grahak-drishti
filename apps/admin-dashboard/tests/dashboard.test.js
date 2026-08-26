import assert from "node:assert/strict";
import test from "node:test";

import { dashboardSnapshot, dashboardSummary } from "../lib/dashboard.js";

test("dashboard snapshot exposes the intended systemic overview", () => {
  const summary = dashboardSummary();

  assert.equal(summary.totalKpis, 4);
  assert.equal(summary.topIssue, "Refund delays");
  assert.equal(summary.totalSectorShare, 100);
  assert.equal(summary.isSynthetic, true);
  assert.equal(dashboardSnapshot.issues.length, 5);
});

test("dashboard data contains no individual complaint records", () => {
  const serialized = JSON.stringify(dashboardSnapshot);

  assert.equal(serialized.includes("complaint_id"), false);
  assert.equal(serialized.includes("email"), false);
  assert.equal(serialized.includes("phone"), false);
  assert.equal(serialized.includes("description"), false);
});
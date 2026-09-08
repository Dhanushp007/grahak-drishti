import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConsultantLiveConfig,
  CONSULTANT_SYSTEM_INSTRUCTION,
} from "../lib/gemini-live.js";

test("builds a consultant session without complaint draft tools", () => {
  const config = buildConsultantLiveConfig();

  assert.deepEqual(config.responseModalities, ["AUDIO"]);
  assert.equal(config.systemInstruction, CONSULTANT_SYSTEM_INSTRUCTION);
  assert.equal(config.tools, undefined);
  assert.match(config.systemInstruction, /worth pursuing a grievance pathway/);
  assert.match(config.systemInstruction, /untrusted case content/);
  assert.match(config.systemInstruction, /Do not help fabricate/);
  assert.match(config.systemInstruction, /official verification/);
});
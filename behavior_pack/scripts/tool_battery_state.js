"use strict";

const { createToolBattery, validateToolBattery } = require("./energy_ledger.js");

const TOOL_BATTERY_STATE_SCHEMA = 1;
const TOOL_BATTERY_STATE_KEY = "aetherium:tool_battery_state";

/**
 * Encode a validated battery into a compact, versioned item-persistent payload.
 * The Bedrock adapter is responsible for storing this string on the ItemStack
 * (for example via dynamic properties) and writing the returned value back
 * after every charge or use.
 */
function serializeToolBattery(battery) {
  if (!validateToolBattery(battery)) {
    return { ok: false, reason: "invalid_tool_battery" };
  }
  return {
    ok: true,
    state: JSON.stringify({
      schema: TOOL_BATTERY_STATE_SCHEMA,
      toolId: battery.toolId,
      stored: battery.stored,
    }),
  };
}

/**
 * Restore the battery from its own saved item state. A missing state creates
 * a new empty battery; malformed or unsupported state is rejected rather
 * than silently granting energy or resetting a charged item.
 */
function deserializeToolBattery(rawState, expectedToolId) {
  if (typeof expectedToolId !== "string") {
    return { ok: false, reason: "invalid_expected_tool" };
  }
  if (rawState === undefined || rawState === null || rawState === "") {
    const fresh = createToolBattery(expectedToolId, 0);
    return fresh.ok ? { ok: true, battery: fresh.battery, created: true } : fresh;
  }
  if (typeof rawState !== "string") {
    return { ok: false, reason: "invalid_persistent_state_type" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    return { ok: false, reason: "malformed_persistent_state" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "invalid_persistent_state" };
  }
  if (parsed.schema !== TOOL_BATTERY_STATE_SCHEMA) {
    return { ok: false, reason: "unsupported_persistent_schema" };
  }
  if (parsed.toolId !== expectedToolId) {
    return { ok: false, reason: "tool_identity_mismatch" };
  }

  const restored = createToolBattery(parsed.toolId, parsed.stored);
  if (!restored.ok) return restored;
  return { ok: true, battery: restored.battery, created: false };
}

/** Return the key and encoded value expected by the future Bedrock item adapter. */
function getToolBatteryItemProperty(battery) {
  const encoded = serializeToolBattery(battery);
  if (!encoded.ok) return encoded;
  return { ok: true, key: TOOL_BATTERY_STATE_KEY, value: encoded.state };
}

module.exports = {
  TOOL_BATTERY_STATE_SCHEMA,
  TOOL_BATTERY_STATE_KEY,
  serializeToolBattery,
  deserializeToolBattery,
  getToolBatteryItemProperty,
};

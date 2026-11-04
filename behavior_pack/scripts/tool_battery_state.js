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


/**
 * Read battery state directly from a Bedrock ItemStack-like object.
 * ItemStack dynamic properties travel with the item when it is moved between
 * inventory slots. The caller must register the property in the world script
 * bootstrap before using this adapter in-game.
 */
function readToolBatteryFromItem(itemStack, expectedToolId) {
  if (!itemStack || typeof itemStack.getDynamicProperty !== "function") {
    return { ok: false, reason: "item_dynamic_properties_unavailable" };
  }
  let rawState;
  try {
    rawState = itemStack.getDynamicProperty(TOOL_BATTERY_STATE_KEY);
  } catch {
    return { ok: false, reason: "item_state_read_failed" };
  }
  return deserializeToolBattery(rawState, expectedToolId);
}

/** Persist a validated battery on the same ItemStack instance. */
function writeToolBatteryToItem(itemStack, battery) {
  if (!itemStack || typeof itemStack.setDynamicProperty !== "function") {
    return { ok: false, reason: "item_dynamic_properties_unavailable" };
  }
  const encoded = getToolBatteryItemProperty(battery);
  if (!encoded.ok) return encoded;
  try {
    itemStack.setDynamicProperty(encoded.key, encoded.value);
  } catch {
    return { ok: false, reason: "item_state_write_failed" };
  }
  return { ok: true, itemStack };
}

/**
 * Apply one energy operation and persist its resulting battery atomically from
 * the caller's perspective. The callback must return { ok: true, battery }.
 * No ItemStack property is changed when reading or the operation fails.
 */
function mutateToolBatteryItem(itemStack, expectedToolId, operation) {
  if (typeof operation !== "function") {
    return { ok: false, reason: "invalid_battery_operation" };
  }
  const restored = readToolBatteryFromItem(itemStack, expectedToolId);
  if (!restored.ok) return restored;
  let result;
  try {
    result = operation(restored.battery);
  } catch {
    return { ok: false, reason: "battery_operation_failed" };
  }
  if (!result || result.ok !== true || !validateToolBattery(result.battery)
    || result.battery.toolId !== expectedToolId) {
    return { ok: false, reason: "invalid_battery_operation_result", operation: result };
  }
  const saved = writeToolBatteryToItem(itemStack, result.battery);
  if (!saved.ok) return { ...saved, operation: result };
  return { ok: true, itemStack, battery: result.battery, operation: result };
}

module.exports = {
  TOOL_BATTERY_STATE_SCHEMA,
  TOOL_BATTERY_STATE_KEY,
  serializeToolBattery,
  deserializeToolBattery,
  getToolBatteryItemProperty,
  readToolBatteryFromItem,
  writeToolBatteryToItem,
  mutateToolBatteryItem,
};

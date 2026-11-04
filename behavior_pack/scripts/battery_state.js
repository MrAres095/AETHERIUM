"use strict";

const { createBattery, validateBattery } = require("./energy_ledger.js");

const BATTERY_STATE_SCHEMA = 1;
const BATTERY_STATE_KEY = "aetherium:battery_state";
const MAX_BATTERY_STATE_LENGTH = 4096;

/**
 * Store only identity, schema and charge. Capacity and transfer limits are
 * reconstructed from the trusted tier table, never trusted from item data.
 */
function serializeBattery(battery) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  const state = JSON.stringify({
    schema: BATTERY_STATE_SCHEMA,
    tier: battery.tier,
    stored: battery.stored,
  });
  if (state.length > MAX_BATTERY_STATE_LENGTH) {
    return { ok: false, reason: "battery_state_too_large" };
  }
  return { ok: true, state };
}

function deserializeBattery(rawState, expectedTier) {
  if (![1, 2, 3].includes(expectedTier)) {
    return { ok: false, reason: "invalid_expected_battery_tier" };
  }
  if (rawState === undefined || rawState === null || rawState === "") {
    const fresh = createBattery(expectedTier, 0);
    return fresh.ok ? { ok: true, battery: fresh.battery, created: true } : fresh;
  }
  if (typeof rawState !== "string") {
    return { ok: false, reason: "invalid_persistent_state_type" };
  }
  if (rawState.length > MAX_BATTERY_STATE_LENGTH) {
    return { ok: false, reason: "battery_state_too_large" };
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
  if (parsed.schema !== BATTERY_STATE_SCHEMA) {
    return { ok: false, reason: "unsupported_persistent_schema" };
  }
  if (parsed.tier !== expectedTier) {
    return { ok: false, reason: "battery_tier_mismatch" };
  }
  const restored = createBattery(parsed.tier, parsed.stored);
  if (!restored.ok) return restored;
  return { ok: true, battery: restored.battery, created: false };
}

function readBatteryFromItem(itemStack, expectedTier) {
  if (!itemStack || typeof itemStack.getDynamicProperty !== "function") {
    return { ok: false, reason: "item_dynamic_properties_unavailable" };
  }
  let rawState;
  try {
    rawState = itemStack.getDynamicProperty(BATTERY_STATE_KEY);
  } catch {
    return { ok: false, reason: "item_state_read_failed" };
  }
  return deserializeBattery(rawState, expectedTier);
}

function writeBatteryToItem(itemStack, battery) {
  if (!itemStack || typeof itemStack.setDynamicProperty !== "function") {
    return { ok: false, reason: "item_dynamic_properties_unavailable" };
  }
  const encoded = serializeBattery(battery);
  if (!encoded.ok) return encoded;
  try {
    itemStack.setDynamicProperty(BATTERY_STATE_KEY, encoded.state);
  } catch {
    return { ok: false, reason: "item_state_write_failed" };
  }
  return { ok: true, itemStack };
}

/**
 * Persist a charge/discharge operation to the dropped or placed battery item.
 * A failed operation or write leaves the original item property untouched.
 */
function mutateBatteryItem(itemStack, expectedTier, operation) {
  if (typeof operation !== "function") {
    return { ok: false, reason: "invalid_battery_operation" };
  }
  const restored = readBatteryFromItem(itemStack, expectedTier);
  if (!restored.ok) return restored;
  let result;
  try {
    result = operation(restored.battery);
  } catch {
    return { ok: false, reason: "battery_operation_failed" };
  }
  if (!result || result.ok !== true || !validateBattery(result.battery)
    || result.battery.tier !== expectedTier) {
    return { ok: false, reason: "invalid_battery_operation_result" };
  }
  const saved = writeBatteryToItem(itemStack, result.battery);
  if (!saved.ok) return { ...saved, operation: result };
  return { ok: true, itemStack, battery: result.battery, operation: result };
}

module.exports = {
  BATTERY_STATE_SCHEMA,
  BATTERY_STATE_KEY,
  MAX_BATTERY_STATE_LENGTH,
  serializeBattery,
  deserializeBattery,
  readBatteryFromItem,
  writeBatteryToItem,
  mutateBatteryItem,
};

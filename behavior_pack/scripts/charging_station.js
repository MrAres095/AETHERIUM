"use strict";

const {
  validateToolBattery,
  createBattery,
  chargeToolAtStation,
} = require("./energy_ledger.js");
const { serializeToolBattery, deserializeToolBattery } = require("./tool_battery_state.js");

const CHARGING_STATION_STATE_VERSION = 1;
const CHARGING_STATION_MAX_INPUT_PER_TICK = 500;
const CHARGING_STATION_STATE_MAX_LENGTH = 4096;

function cloneTool(tool) {
  return tool ? { ...tool } : null;
}

function validateChargingStationState(state) {
  return !!state
    && state.version === CHARGING_STATION_STATE_VERSION
    && (state.tool === null || validateToolBattery(state.tool));
}

function createChargingStationState(tool = null) {
  if (tool !== null && !validateToolBattery(tool)) {
    return { ok: false, reason: "invalid_tool_battery" };
  }
  return {
    ok: true,
    state: { version: CHARGING_STATION_STATE_VERSION, tool: cloneTool(tool) },
  };
}

/** Serialize the station and its inserted tool so the runtime can persist it across unloads/restarts. */
function serializeChargingStationState(state) {
  if (!validateChargingStationState(state)) return { ok: false, reason: "invalid_station_state" };
  const payload = {
    schema: CHARGING_STATION_STATE_VERSION,
    tool: null,
  };
  if (state.tool !== null) {
    const encoded = serializeToolBattery(state.tool);
    if (!encoded.ok) return encoded;
    payload.tool = JSON.parse(encoded.state);
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > CHARGING_STATION_STATE_MAX_LENGTH) {
    return { ok: false, reason: "station_state_too_large" };
  }
  return { ok: true, state: serialized };
}

/** Restore station state; malformed or mismatched tool payloads never reset silently. */
function deserializeChargingStationState(rawState) {
  if (typeof rawState !== "string" || rawState.length === 0
    || rawState.length > CHARGING_STATION_STATE_MAX_LENGTH) {
    return { ok: false, reason: "invalid_persistent_state" };
  }
  let parsed;
  try { parsed = JSON.parse(rawState); } catch {
    return { ok: false, reason: "malformed_persistent_state" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
    || parsed.schema !== CHARGING_STATION_STATE_VERSION
    || !(parsed.tool === null || (parsed.tool && typeof parsed.tool === "object" && !Array.isArray(parsed.tool)))) {
    return { ok: false, reason: "unsupported_persistent_state" };
  }
  if (parsed.tool === null) return createChargingStationState();
  const restored = deserializeToolBattery(JSON.stringify(parsed.tool), parsed.tool.toolId);
  if (!restored.ok) return restored;
  return createChargingStationState(restored.battery);
}

/** Insert one supported handheld tool. An occupied station never overwrites it. */
function insertToolIntoChargingStation(state, tool) {
  if (!validateChargingStationState(state)) {
    return { ok: false, reason: "invalid_station_state" };
  }
  if (!validateToolBattery(tool)) return { ok: false, reason: "invalid_tool_battery" };
  if (state.tool !== null) return { ok: false, reason: "station_occupied" };
  return {
    ok: true,
    state: { version: state.version, tool: cloneTool(tool) },
  };
}

/** Extract the exact current tool state, including its stored charge. */
function extractToolFromChargingStation(state) {
  if (!validateChargingStationState(state)) {
    return { ok: false, reason: "invalid_station_state" };
  }
  if (state.tool === null) return { ok: false, reason: "station_empty" };
  return {
    ok: true,
    tool: cloneTool(state.tool),
    state: { version: state.version, tool: null },
  };
}

/**
 * Run one powered tick. availablePower is the AEU budget allocated by the
 * network for this station on this tick. The station never buffers energy:
 * it only consumes what the inserted tool can accept, up to 500 AEU/t.
 */
function runChargingStationTick(state, availablePower) {
  if (!validateChargingStationState(state)) {
    return { ok: false, reason: "invalid_station_state" };
  }
  if (!Number.isSafeInteger(availablePower) || availablePower < 0) {
    return { ok: false, reason: "invalid_available_power" };
  }
  if (state.tool === null) {
    return {
      ok: true, status: "no_tool", consumed: 0, unusedPower: availablePower,
      state: { version: state.version, tool: null },
    };
  }

  const stationBudget = Math.min(availablePower, CHARGING_STATION_MAX_INPUT_PER_TICK);
  const source = createBattery(1, stationBudget);
  if (!source.ok) return { ok: false, reason: "station_power_setup_failed" };
  const transfer = chargeToolAtStation(source.battery, state.tool, stationBudget);
  if (!transfer.ok) return transfer;

  const full = transfer.tool.stored === transfer.tool.capacity;
  const consumed = transfer.transferred;
  return {
    ok: true,
    status: full ? "full" : consumed > 0 ? "charging" : availablePower === 0 ? "no_power" : "waiting",
    consumed,
    unusedPower: availablePower - consumed,
    toolPercent: Math.floor((transfer.tool.stored / transfer.tool.capacity) * 100),
    state: { version: state.version, tool: cloneTool(transfer.tool) },
  };
}

function inspectChargingStation(state) {
  if (!validateChargingStationState(state)) {
    return { ok: false, reason: "invalid_station_state" };
  }
  if (state.tool === null) {
    return { ok: true, status: "no_tool", maxInputPerTick: CHARGING_STATION_MAX_INPUT_PER_TICK };
  }
  return {
    ok: true,
    status: state.tool.stored === state.tool.capacity ? "full" : "ready_to_charge",
    toolId: state.tool.toolId,
    stored: state.tool.stored,
    capacity: state.tool.capacity,
    remaining: state.tool.capacity - state.tool.stored,
    percent: Math.floor((state.tool.stored / state.tool.capacity) * 100),
    maxInputPerTick: Math.min(CHARGING_STATION_MAX_INPUT_PER_TICK, state.tool.maxInputPerTick),
  };
}

module.exports = {
  CHARGING_STATION_STATE_VERSION,
  CHARGING_STATION_MAX_INPUT_PER_TICK,
  validateChargingStationState,
  createChargingStationState,
  serializeChargingStationState,
  deserializeChargingStationState,
  insertToolIntoChargingStation,
  extractToolFromChargingStation,
  runChargingStationTick,
  inspectChargingStation,
};

"use strict";

const {
  validateToolBattery,
  createBattery,
  chargeToolAtStation,
} = require("./energy_ledger.js");

const CHARGING_STATION_STATE_VERSION = 1;
const CHARGING_STATION_MAX_INPUT_PER_TICK = 500;

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
  insertToolIntoChargingStation,
  extractToolFromChargingStation,
  runChargingStationTick,
  inspectChargingStation,
};

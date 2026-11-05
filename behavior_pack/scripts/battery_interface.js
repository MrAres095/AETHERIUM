"use strict";

const { validateBattery, validateToolBattery, chargeToolAtStation } = require("./energy_ledger.js");

const BATTERY_FACES = Object.freeze(["north", "south", "east", "west", "up", "down"]);

/** All six faces are bidirectional power ports. Network flow decides direction. */
function getBatteryFacePorts() {
  return BATTERY_FACES.map(face => Object.freeze({ face, input: true, output: true }));
}

/** Read-only data for the battery's openable inspection screen. */
function inspectBattery(battery) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  return {
    ok: true,
    tier: battery.tier,
    stored: battery.stored,
    capacity: battery.capacity,
    remaining: battery.capacity - battery.stored,
    percent: Math.floor((battery.stored / battery.capacity) * 100),
    maxInputPerTick: battery.maxInputPerTick,
    maxOutputPerTick: battery.maxOutputPerTick,
    ports: getBatteryFacePorts(),
  };
}

/**
 * Charge a supported handheld tool from the block battery when its UI is open.
 * This is one bounded transfer; the runtime must call it at most once per tick
 * and persist both returned states before consuming the inserted tool.
 */
function chargeHandToolFromBattery(battery, toolBattery, requested) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  if (!validateToolBattery(toolBattery)) return { ok: false, reason: "invalid_tool_battery" };
  const transfer = chargeToolAtStation(battery, toolBattery, requested);
  if (!transfer.ok) return transfer;
  return {
    ok: true,
    transferred: transfer.transferred,
    battery: transfer.station,
    tool: transfer.tool,
    batteryView: inspectBattery(transfer.station),
  };
}

module.exports = { BATTERY_FACES, getBatteryFacePorts, inspectBattery, chargeHandToolFromBattery };

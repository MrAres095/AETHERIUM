"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const {
  createChargingStationState,
  insertToolIntoChargingStation,
  extractToolFromChargingStation,
  runChargingStationTick,
  inspectChargingStation,
} = require("../behavior_pack/scripts/charging_station.js");

function tool(toolId = "drill", stored = 0) {
  const result = createToolBattery(toolId, stored);
  assert.equal(result.ok, true);
  return result.battery;
}

function emptyStation() {
  const result = createChargingStationState();
  assert.equal(result.ok, true);
  return result.state;
}

test("station accepts one supported tool and refuses to overwrite an occupied slot", () => {
  const inserted = insertToolIntoChargingStation(emptyStation(), tool());
  assert.equal(inserted.ok, true);
  assert.equal(inserted.state.tool.toolId, "drill");
  assert.equal(insertToolIntoChargingStation(inserted.state, tool("chainsaw")).reason, "station_occupied");
});

test("station automatically charges a drill from its allocated AEU budget", () => {
  const inserted = insertToolIntoChargingStation(emptyStation(), tool());
  const tick = runChargingStationTick(inserted.state, 500);
  assert.equal(tick.ok, true);
  assert.equal(tick.status, "charging");
  assert.equal(tick.consumed, 250);
  assert.equal(tick.unusedPower, 250);
  assert.equal(tick.state.tool.stored, 250);
  assert.equal(inserted.state.tool.stored, 0);
});

test("station respects chainsaw input limit and its own 500 AEU/t limit", () => {
  const inserted = insertToolIntoChargingStation(emptyStation(), tool("chainsaw"));
  const tick = runChargingStationTick(inserted.state, 1000);
  assert.equal(tick.consumed, 300);
  assert.equal(tick.unusedPower, 700);
  assert.equal(tick.state.tool.stored, 300);
});

test("station consumes only what the tool needs and reports full", () => {
  const inserted = insertToolIntoChargingStation(emptyStation(), tool("drill", 19900));
  const tick = runChargingStationTick(inserted.state, 500);
  assert.equal(tick.status, "full");
  assert.equal(tick.consumed, 100);
  assert.equal(tick.unusedPower, 400);
  assert.equal(tick.state.tool.stored, 20000);
});

test("station does not consume power when empty, unpowered, or tool is full", () => {
  const empty = runChargingStationTick(emptyStation(), 500);
  assert.equal(empty.status, "no_tool");
  assert.equal(empty.consumed, 0);
  const noPower = runChargingStationTick(
    insertToolIntoChargingStation(emptyStation(), tool()).state, 0
  );
  assert.equal(noPower.status, "no_power");
  assert.equal(noPower.consumed, 0);
  const full = runChargingStationTick(
    insertToolIntoChargingStation(emptyStation(), tool("drill", 20000)).state, 500
  );
  assert.equal(full.status, "full");
  assert.equal(full.consumed, 0);
});

test("extraction returns the updated charge and empties the station", () => {
  const inserted = insertToolIntoChargingStation(emptyStation(), tool());
  const charged = runChargingStationTick(inserted.state, 250);
  const extracted = extractToolFromChargingStation(charged.state);
  assert.equal(extracted.ok, true);
  assert.equal(extracted.tool.stored, 250);
  assert.equal(extracted.state.tool, null);
  assert.equal(inspectChargingStation(extracted.state).status, "no_tool");
});

test("inspection exposes charge status without mutating station state", () => {
  const state = insertToolIntoChargingStation(emptyStation(), tool("chainsaw", 15000)).state;
  const view = inspectChargingStation(state);
  assert.equal(view.ok, true);
  assert.equal(view.toolId, "chainsaw");
  assert.equal(view.stored, 15000);
  assert.equal(view.capacity, 30000);
  assert.equal(view.percent, 50);
  assert.equal(state.tool.stored, 15000);
});

test("invalid power and corrupt station states fail closed", () => {
  assert.equal(runChargingStationTick(emptyStation(), -1).reason, "invalid_available_power");
  assert.equal(runChargingStationTick({ version: 99, tool: null }, 10).reason, "invalid_station_state");
  assert.equal(insertToolIntoChargingStation(emptyStation(), {}).reason, "invalid_tool_battery");
});

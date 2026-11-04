"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery, chargeBattery, dischargeBattery, transferEnergy, transferWirelessHop, validateWirelessRoute } = require("../behavior_pack/scripts/energy_ledger.js");


test("creates rechargeable tool batteries with distinct profiles", () => {
  const drill = createToolBattery("drill");
  const saw = createToolBattery("chainsaw");
  assert.equal(drill.battery.capacity, 20000);
  assert.equal(drill.battery.energyPerUse, 100);
  assert.equal(saw.battery.capacity, 30000);
  assert.equal(saw.battery.energyPerUse, 150);
  assert.equal(createToolBattery("pickaxe").reason, "unknown_energy_tool");
});

test("tool actions consume a full cost atomically and stop when charge is insufficient", () => {
  const drill = createToolBattery("drill", 250).battery;
  const twoUses = consumeToolEnergy(drill, 2);
  assert.equal(twoUses.canRun, true);
  assert.equal(twoUses.consumed, 200);
  assert.equal(twoUses.battery.stored, 50);
  const blocked = consumeToolEnergy(twoUses.battery, 1);
  assert.equal(blocked.canRun, false);
  assert.equal(blocked.reason, "insufficient_charge");
  assert.equal(blocked.battery.stored, 50);
  assert.equal(drill.stored, 250);
});

test("charging station transfers energy within station output and tool input limits", () => {
  const station = createBattery(1, 1000).battery;
  const drill = createToolBattery("drill").battery;
  const result = chargeToolAtStation(station, drill, 900);
  assert.equal(result.transferred, 250);
  assert.equal(result.station.stored, 750);
  assert.equal(result.tool.stored, 250);
  assert.equal(station.stored, 1000);
});

test("charging station never overfills tool or drains empty station", () => {
  const station = createBattery(1, 50).battery;
  const almostFull = createToolBattery("chainsaw", 29950).battery;
  const result = chargeToolAtStation(station, almostFull, 500);
  assert.equal(result.transferred, 50);
  assert.equal(result.station.stored, 0);
  assert.equal(result.tool.stored, 30000);
  const empty = chargeToolAtStation(result.station, result.tool, 100);
  assert.equal(empty.transferred, 0);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery, chargeBattery, dischargeBattery, transferEnergy, transferWirelessHop, validateWirelessRoute, createToolBattery, consumeToolEnergy, chargeToolAtStation } = require("../behavior_pack/scripts/energy_ledger.js");

test("battery tiers define bounded storage and throughput", () => {
  assert.equal(createBattery(1).battery.capacity, 100000);
  assert.equal(createBattery(2).battery.capacity, 500000);
  assert.equal(createBattery(3).battery.capacity, 2500000);
  assert.equal(createBattery(4).reason, "invalid_battery_tier");
});

test("charging and discharging obey per-tick limits", () => {
  const battery = createBattery(1).battery;
  const charged = chargeBattery(battery, 900);
  assert.equal(charged.accepted, 500);
  assert.equal(charged.rejected, 400);
  const drained = dischargeBattery(charged.battery, 700);
  assert.equal(drained.delivered, 500);
  assert.equal(drained.unmet, 200);
});

test("ordinary transfer conserves energy and respects destination capacity", () => {
  const source = createBattery(2, 2000).battery;
  const destination = createBattery(1, 99900).battery;
  const result = transferEnergy(source, destination, 1500);
  assert.equal(result.transferred, 100);
  assert.equal(result.source.stored + result.destination.stored, 101900);
});

test("wireless route limits each hop to 16 blocks in one dimension", () => {
  const route = [
    { dimension: "overworld", x: 0, y: 64, z: 0 },
    { dimension: "overworld", x: 16, y: 64, z: 0 },
    { dimension: "overworld", x: 32, y: 64, z: 0 },
  ];
  assert.equal(validateWirelessRoute(route).ok, true);
  assert.equal(validateWirelessRoute([route[0], { ...route[1], x: 17 }]).reason, "segment_out_of_range");
});

test("wireless hop accounts for transmission loss and relay battery limits", () => {
  const source = createBattery(2, 1000).battery;
  const relay = createBattery(1).battery;
  const result = transferWirelessHop(source, relay, 190, 5);
  assert.equal(result.sent, 200);
  assert.equal(result.delivered, 190);
  assert.equal(result.lost, 10);
  assert.equal(result.source.stored, 800);
  assert.equal(result.destination.stored, 190);
});

test("handheld tool battery profiles have bounded capacity and usage costs", () => {
  const drill = createToolBattery("drill");
  const saw = createToolBattery("chainsaw");
  assert.equal(drill.battery.capacity, 20000);
  assert.equal(drill.battery.energyPerUse, 100);
  assert.equal(saw.battery.capacity, 30000);
  assert.equal(saw.battery.energyPerUse, 150);
  assert.equal(createToolBattery("unknown").reason, "unknown_energy_tool");
  assert.equal(createToolBattery("drill", 20001).reason, "invalid_stored_energy");
});

test("tool action consumes its full cost or does not run at all", () => {
  const battery = createToolBattery("drill", 250).battery;
  const oneUse = consumeToolEnergy(battery);
  assert.equal(oneUse.canRun, true);
  assert.equal(oneUse.consumed, 100);
  assert.equal(oneUse.battery.stored, 150);
  const threeUses = consumeToolEnergy(oneUse.battery, 2);
  assert.equal(threeUses.canRun, false);
  assert.equal(threeUses.consumed, 0);
  assert.equal(threeUses.required, 200);
  assert.equal(threeUses.battery.stored, 150);
  assert.equal(battery.stored, 250);
});

test("charging station transfers real energy and respects station and tool limits", () => {
  const station = createBattery(1, 1000).battery;
  const tool = createToolBattery("drill", 0).battery;
  const result = chargeToolAtStation(station, tool, 500);
  assert.equal(result.transferred, 250);
  assert.equal(result.station.stored, 750);
  assert.equal(result.tool.stored, 250);
  assert.equal(result.station.stored + result.tool.stored, 1000);
  assert.equal(station.stored, 1000);
  assert.equal(tool.stored, 0);
});

test("charging station stops at tool capacity and rejects invalid state", () => {
  const station = createBattery(2, 1000).battery;
  const nearlyFullTool = createToolBattery("chainsaw", 29900).battery;
  const result = chargeToolAtStation(station, nearlyFullTool, 500);
  assert.equal(result.transferred, 100);
  assert.equal(result.tool.stored, 30000);
  assert.equal(result.station.stored, 900);
  assert.equal(chargeToolAtStation(null, nearlyFullTool, 10).reason, "invalid_station_battery");
  assert.equal(chargeToolAtStation(station, nearlyFullTool, -1).reason, "invalid_energy_amount");
});

test("tool battery rejects tampering and invalid use counts", () => {
  const battery = createToolBattery("drill", 1000).battery;
  assert.equal(consumeToolEnergy({ ...battery, energyPerUse: 1 }).reason, "invalid_tool_battery");
  assert.equal(consumeToolEnergy(battery, 0).reason, "invalid_use_count");
  assert.equal(consumeToolEnergy(battery, 1.5).reason, "invalid_use_count");
});

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

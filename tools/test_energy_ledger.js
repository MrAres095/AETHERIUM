"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBattery, chargeBattery, dischargeBattery, transferEnergy, validateWirelessRoute,
} = require("../behavior_pack/scripts/energy_ledger.js");

test("creates tiered batteries with increasing real storage and throughput", () => {
  const a = createBattery(1);
  const b = createBattery(2);
  const c = createBattery(3);
  assert.equal(a.battery.capacity, 100000);
  assert.equal(b.battery.capacity, 500000);
  assert.equal(c.battery.capacity, 2500000);
  assert.ok(a.battery.maxOutputPerTick < b.battery.maxOutputPerTick);
  assert.ok(b.battery.maxOutputPerTick < c.battery.maxOutputPerTick);
});

test("rejects invalid tiers and charge outside battery capacity", () => {
  assert.equal(createBattery(4).reason, "invalid_battery_tier");
  assert.equal(createBattery(1, -1).reason, "invalid_stored_energy");
  assert.equal(createBattery(1, 100001).reason, "invalid_stored_energy");
});

test("charging respects per-tick input limit and capacity without mutating source", () => {
  const battery = createBattery(1).battery;
  const result = chargeBattery(battery, 900);
  assert.equal(result.accepted, 500);
  assert.equal(result.rejected, 400);
  assert.equal(result.battery.stored, 500);
  assert.equal(battery.stored, 0);
  const nearlyFull = createBattery(1, 99900).battery;
  assert.equal(chargeBattery(nearlyFull, 500).accepted, 100);
});

test("discharging respects output rate and never creates negative energy", () => {
  const battery = createBattery(1, 800).battery;
  const result = dischargeBattery(battery, 700);
  assert.equal(result.delivered, 500);
  assert.equal(result.unmet, 200);
  assert.equal(result.battery.stored, 300);
  assert.equal(dischargeBattery(createBattery(1, 20).battery, 50).delivered, 20);
});

test("transfers only energy accepted by both batteries and conserves total energy", () => {
  const source = createBattery(2, 2000).battery;
  const destination = createBattery(1, 99900).battery;
  const result = transferEnergy(source, destination, 1500);
  assert.equal(result.transferred, 100);
  assert.equal(result.source.stored + result.destination.stored, 2000 + 99900);
  assert.equal(source.stored, 2000);
  assert.equal(destination.stored, 99900);
});

test("wireless route accepts 16-block links and multiple battery-backed relay hops", () => {
  const route = [
    { dimension: "overworld", x: 0, y: 64, z: 0 },
    { dimension: "overworld", x: 16, y: 64, z: 0 },
    { dimension: "overworld", x: 32, y: 64, z: 0 },
    { dimension: "overworld", x: 48, y: 64, z: 0 },
  ];
  assert.deepEqual(validateWirelessRoute(route), {
    ok: true, segments: 3, maxSegmentLength: 16,
  });
});

test("wireless route rejects long links, missing nodes and dimension changes", () => {
  assert.equal(validateWirelessRoute([]).reason, "route_requires_transmitter_and_receiver");
  assert.equal(validateWirelessRoute([
    { dimension: "overworld", x: 0, y: 0, z: 0 },
    { dimension: "overworld", x: 17, y: 0, z: 0 },
  ]).reason, "segment_out_of_range");
  assert.equal(validateWirelessRoute([
    { dimension: "overworld", x: 0, y: 0, z: 0 },
    { dimension: "nether", x: 1, y: 0, z: 0 },
  ]).reason, "invalid_or_cross_dimension_route");
});

test("rejects tampered battery snapshots and fractional energy", () => {
  const battery = createBattery(1).battery;
  assert.equal(chargeBattery({ ...battery, capacity: 999999 }, 1).reason, "invalid_battery");
  assert.equal(chargeBattery(battery, 0.5).reason, "invalid_energy_amount");
  assert.equal(dischargeBattery(battery, -2).reason, "invalid_energy_amount");
});

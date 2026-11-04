"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { dispatchPowerTick } = require("../behavior_pack/scripts/power_dispatch.js");

test("steam target supplies two machines then charges Tier I battery with surplus", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "steam", outputPerTick: 900 }],
    internalLoadPerTick: 100,
    machines: [{ id: "grinder", demandPerTick: 150 }, { id: "cutter", demandPerTick: 150 }],
    batteries: [{ id: "main", battery: createBattery(1).battery }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.netGenerationAvailable, 800);
  assert.equal(result.machineDelivered, 300);
  assert.equal(result.totalBatteryCharged, 500);
  assert.equal(result.batteries[0].battery.stored, 500);
  assert.equal(result.unusedGeneration, 0);
});

test("active machines get generation before any battery charging", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "solar", outputPerTick: 200 }],
    machines: [{ id: "machine", demandPerTick: 200 }],
    batteries: [{ id: "battery", battery: createBattery(1).battery }],
  });
  assert.equal(result.machineDelivered, 200);
  assert.equal(result.totalBatteryCharged, 0);
  assert.equal(result.batteries[0].battery.stored, 0);
});

test("battery supplies machine demand when generation is short", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "wind", outputPerTick: 100 }],
    machines: [{ id: "machine", demandPerTick: 400 }],
    batteries: [{ id: "battery", battery: createBattery(1, 1000).battery }],
  });
  assert.equal(result.machines[0].fromGeneration, 100);
  assert.equal(result.machines[0].fromBatteries, 300);
  assert.equal(result.machines[0].powered, true);
  assert.equal(result.batteries[0].battery.stored, 700);
});

test("priority is deterministic and lower priority number is served first", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "gen", outputPerTick: 100 }],
    machines: [
      { id: "secondary", demandPerTick: 80, priority: 20 },
      { id: "critical", demandPerTick: 80, priority: 1 },
    ],
  });
  assert.deepEqual(result.machines.map(x => [x.id, x.delivered, x.unmet]), [
    ["critical", 80, 0], ["secondary", 20, 60],
  ]);
});

test("battery discharge obeys per-tick output cap and reports unmet demand", () => {
  const result = dispatchPowerTick({
    generators: [],
    machines: [{ id: "machine", demandPerTick: 900 }],
    batteries: [{ id: "battery", battery: createBattery(1, 1000).battery }],
  });
  assert.equal(result.machines[0].fromBatteries, 500);
  assert.equal(result.machines[0].unmet, 400);
  assert.equal(result.machines[0].powered, false);
  assert.equal(result.batteries[0].battery.stored, 500);
});

test("multiple batteries charge in order and full batteries accept no energy", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "gen", outputPerTick: 1200 }],
    machines: [{ id: "machine", demandPerTick: 200 }],
    batteries: [
      { id: "full", battery: createBattery(1, 100000).battery },
      { id: "second", battery: createBattery(1).battery },
    ],
  });
  assert.equal(result.totalBatteryCharged, 500);
  assert.equal(result.batteries[0].battery.stored, 100000);
  assert.equal(result.batteries[1].battery.stored, 500);
  assert.equal(result.unusedGeneration, 500);
});

test("internal plant load is paid before machines and deficit is reported", () => {
  const result = dispatchPowerTick({
    generators: [{ id: "steam", outputPerTick: 50 }],
    internalLoadPerTick: 100,
    machines: [{ id: "machine", demandPerTick: 20 }],
  });
  assert.equal(result.internalSupplied, 50);
  assert.equal(result.internalUnmet, 50);
  assert.equal(result.machines[0].delivered, 0);
  assert.equal(result.machines[0].unmet, 20);
});

test("invalid and duplicate network entries fail closed", () => {
  assert.equal(dispatchPowerTick(null).reason, "invalid_dispatch_input");
  assert.equal(dispatchPowerTick({ generators: [{ id: "g", outputPerTick: -1 }] }).reason,
    "invalid_generator");
  assert.equal(dispatchPowerTick({ batteries: [
    { id: "b", battery: createBattery(1).battery },
    { id: "b", battery: createBattery(1).battery },
  ] }).reason, "invalid_or_duplicate_battery");
  assert.equal(dispatchPowerTick({ machines: [
    { id: "m", demandPerTick: 1 }, { id: "m", demandPerTick: 1 },
  ] }).reason, "invalid_or_duplicate_machine");
});

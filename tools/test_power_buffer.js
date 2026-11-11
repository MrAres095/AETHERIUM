"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { routePowerWithBuffer } = require("../behavior_pack/scripts/power_buffer.js");

function battery(stored = 0) {
  const result = createBattery(1, stored);
  assert.equal(result.ok, true);
  return result.battery;
}

const cable = {
  id: "line-1", from: "generator", to: "machine",
  maxTransferPerTick: 100, efficiencyBps: 10000,
};

test("buffer covers demand above an overloaded cable's throughput", () => {
  const result = routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 180, availableSourceEnergy: 1000, buffer: battery(1000),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 100);
  assert.equal(result.bufferDelivered, 80);
  assert.equal(result.delivered, 180);
  assert.equal(result.unmet, 0);
  assert.equal(result.buffer.stored, 920);
  assert.equal(result.bufferCharged, 0);
});

test("reports a remaining shortage when the buffer cannot cover the overload", () => {
  const result = routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 700, availableSourceEnergy: 1000, buffer: battery(100),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 100);
  assert.equal(result.bufferDelivered, 100);
  assert.equal(result.unmet, 500);
  assert.equal(result.powered, false);
  assert.equal(result.buffer.stored, 0);
});

test("charges a buffer from spare cable capacity after serving the machine", () => {
  const result = routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 40, availableSourceEnergy: 1000, buffer: battery(0),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 40);
  assert.equal(result.bufferDelivered, 0);
  assert.equal(result.bufferCharged, 60);
  assert.equal(result.buffer.stored, 60);
  assert.equal(result.unusedSourceEnergy, 900);
});

test("does not double-count cable capacity when charging the buffer", () => {
  const result = routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 80, availableSourceEnergy: 1000, buffer: battery(0),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 80);
  assert.equal(result.bufferCharged, 20);
  assert.equal(result.buffer.stored, 20);
  assert.equal(result.cableDelivered + result.bufferCharged, 100);
});

test("accounts for cable loss when charging and discharging a local buffer", () => {
  const lossy = { ...cable, maxTransferPerTick: 500, efficiencyBps: 9000 };
  const result = routePowerWithBuffer({
    cables: [lossy], from: "generator", to: "machine",
    requestedAtDestination: 100, availableSourceEnergy: 500, buffer: battery(200),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 100);
  assert.equal(result.cableSourceRequired, 112);
  assert.equal(result.cableLoss, 12);
  assert.equal(result.delivered, 100);
  assert.equal(result.bufferCharged, 349);
  assert.equal(result.chargeSourceRequired, 388);
  assert.equal(result.chargeCableLoss, 39);
  assert.equal(result.buffer.stored, 549);
});

test("handles maximum safe-integer demand without midpoint overflow", () => {
  const hugeCable = { ...cable, maxTransferPerTick: Number.MAX_SAFE_INTEGER };
  const result = routePowerWithBuffer({
    cables: [hugeCable], from: "generator", to: "machine",
    requestedAtDestination: Number.MAX_SAFE_INTEGER,
    availableSourceEnergy: Number.MAX_SAFE_INTEGER,
    buffer: battery(0),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, Number.MAX_SAFE_INTEGER);
  assert.equal(result.delivered, Number.MAX_SAFE_INTEGER);
  assert.equal(result.unmet, 0);
  assert.equal(result.cableSourceRequired, Number.MAX_SAFE_INTEGER);
});

test("rejects invalid source budgets and batteries", () => {
  assert.equal(routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 10, availableSourceEnergy: -1, buffer: battery(10),
  }).reason, "invalid_energy_request");
  assert.equal(routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: 10, availableSourceEnergy: 10, buffer: {},
  }).reason, "invalid_buffer_battery");
});


test("supports a local generator and consumer without a cable path", () => {
  const result = routePowerWithBuffer({
    cables: [], from: "machine-room", to: "machine-room",
    requestedAtDestination: 75, availableSourceEnergy: 100,
    buffer: battery(0),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 75);
  assert.equal(result.cableSourceRequired, 75);
  assert.equal(result.bufferDelivered, 0);
  assert.equal(result.unmet, 0);
  assert.equal(result.bufferCharged, 25);
  assert.equal(result.buffer.stored, 25);
  assert.equal(result.unusedSourceEnergy, 0);
});

test("uses the local buffer when a direct source has no available energy", () => {
  const result = routePowerWithBuffer({
    cables: [], from: "machine-room", to: "machine-room",
    requestedAtDestination: 60, availableSourceEnergy: 0,
    buffer: battery(80),
  });
  assert.equal(result.ok, true);
  assert.equal(result.cableDelivered, 0);
  assert.equal(result.bufferDelivered, 60);
  assert.equal(result.delivered, 60);
  assert.equal(result.unmet, 0);
  assert.equal(result.buffer.stored, 20);
});

test("rejects unsafe integer energy requests rather than rounding them", () => {
  const result = routePowerWithBuffer({
    cables: [cable], from: "generator", to: "machine",
    requestedAtDestination: Number.MAX_SAFE_INTEGER + 1,
    availableSourceEnergy: 100, buffer: battery(10),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_energy_request");
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCables, findPowerPath, calculatePowerDelivery, routePowerDelivery } = require("../behavior_pack/scripts/power_network.js");

const cables = [
  { id: "copper-a", from: "generator", to: "junction", maxTransferPerTick: 1000, efficiencyBps: 9900 },
  { id: "copper-b", from: "junction", to: "machine", maxTransferPerTick: 1000, efficiencyBps: 9800 },
  { id: "backup", from: "generator", to: "machine", maxTransferPerTick: 100, efficiencyBps: 10000 },
];

test("validates cable IDs, endpoints, throughput and efficiency", () => {
  assert.equal(validateCables(cables).ok, true);
  assert.equal(validateCables([{ ...cables[0], efficiencyBps: 0 }]).reason, "invalid_or_duplicate_cable");
  assert.equal(validateCables([{ ...cables[0], maxTransferPerTick: 0 }]).ok, false);
  assert.equal(validateCables([cables[0], cables[0]]).ok, false);
});

test("finds a shortest deterministic path and ignores longer alternatives", () => {
  const result = findPowerPath(cables, "generator", "machine");
  assert.equal(result.ok, true);
  assert.deepEqual(result.path.map(cable => cable.id), ["backup"]);
  assert.deepEqual(result.nodes, ["generator", "machine"]);
});

test("breaks equal-length route ties by cable ID", () => {
  const alternatives = [
    { id: "z-link", from: "a", to: "c", maxTransferPerTick: 500, efficiencyBps: 10000 },
    { id: "a-link", from: "a", to: "b", maxTransferPerTick: 500, efficiencyBps: 10000 },
    { id: "b-link", from: "b", to: "d", maxTransferPerTick: 500, efficiencyBps: 10000 },
    { id: "y-link", from: "c", to: "d", maxTransferPerTick: 500, efficiencyBps: 10000 },
  ];
  assert.deepEqual(findPowerPath(alternatives, "a", "d").path.map(cable => cable.id), ["a-link", "b-link"]);
});

test("reports disconnected endpoints and handles same-node delivery", () => {
  assert.equal(findPowerPath(cables, "generator", "isolated").reason, "no_power_path");
  assert.deepEqual(routePowerDelivery(cables, "generator", "generator", 123), {
    ok: true, nodes: ["generator"], path: [], requestedAtDestination: 123,
    sourceRequired: 123, totalLoss: 0, flows: [],
  });
});

test("calculates compounded cable losses backwards without creating energy", () => {
  const path = [
    { id: "one", from: "a", to: "b", maxTransferPerTick: 1000, efficiencyBps: 9900 },
    { id: "two", from: "b", to: "c", maxTransferPerTick: 1000, efficiencyBps: 9800 },
  ];
  const result = calculatePowerDelivery(path, 500);
  assert.equal(result.ok, true);
  assert.equal(result.sourceRequired, 517);
  assert.equal(result.totalLoss, 17);
  assert.deepEqual(result.flows, [
    { cableId: "one", input: 517, output: 511, loss: 6 },
    { cableId: "two", input: 511, output: 500, loss: 11 },
  ]);
  assert.equal(result.flows.reduce((sum, flow) => sum + flow.loss, 0), result.totalLoss);
});

test("enforces each cable throughput after accounting for downstream losses", () => {
  const path = [
    { id: "near-source", from: "a", to: "b", maxTransferPerTick: 510, efficiencyBps: 9900 },
    { id: "near-load", from: "b", to: "c", maxTransferPerTick: 510, efficiencyBps: 9800 },
  ];
  const result = calculatePowerDelivery(path, 500);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "cable_overloaded");
  assert.equal(result.cableId, "near-load");
});

test("routes delivery and returns ordered per-cable flows", () => {
  const linear = [
    { id: "first", from: "source", to: "middle", maxTransferPerTick: 1000, efficiencyBps: 10000 },
    { id: "second", from: "middle", to: "load", maxTransferPerTick: 1000, efficiencyBps: 10000 },
  ];
  const result = routePowerDelivery(linear, "source", "load", 750);
  assert.equal(result.ok, true);
  assert.deepEqual(result.path, ["first", "second"]);
  assert.equal(result.sourceRequired, 750);
  assert.equal(result.totalLoss, 0);
});

test("rejects invalid requests and malformed cable routes", () => {
  assert.equal(calculatePowerDelivery([], -1).reason, "invalid_energy_request");
  assert.equal(calculatePowerDelivery("not-a-path", 10).reason, "invalid_power_path");
  assert.equal(routePowerDelivery([{ ...cables[0], from: "x", to: "x" }], "x", "y", 10).ok, false);
});

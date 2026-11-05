"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery, createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { BATTERY_FACES, getBatteryFacePorts, inspectBattery, chargeHandToolFromBattery } = require("../behavior_pack/scripts/battery_interface.js");

function makeBattery(stored = 0) {
  const result = createBattery(1, stored);
  assert.equal(result.ok, true);
  return result.battery;
}

function makeTool(stored = 0) {
  const result = createToolBattery("drill", stored);
  assert.equal(result.ok, true);
  return result.battery;
}

test("all six battery faces accept incoming and outgoing power", () => {
  const ports = getBatteryFacePorts();
  assert.deepEqual(ports.map(port => port.face), BATTERY_FACES);
  assert.equal(ports.length, 6);
  for (const port of ports) {
    assert.equal(port.input, true);
    assert.equal(port.output, true);
  }
});

test("battery inspection exposes charge, capacity, percentage and port data", () => {
  const view = inspectBattery(makeBattery(50000));
  assert.equal(view.ok, true);
  assert.equal(view.stored, 50000);
  assert.equal(view.capacity, 100000);
  assert.equal(view.remaining, 50000);
  assert.equal(view.percent, 50);
  assert.equal(view.maxInputPerTick, 500);
  assert.equal(view.maxOutputPerTick, 500);
  assert.equal(view.ports.length, 6);
});

test("opening the battery interface does not mutate stored charge", () => {
  const battery = makeBattery(12345);
  const view = inspectBattery(battery);
  assert.equal(view.ok, true);
  assert.equal(battery.stored, 12345);
});

test("battery interface charges a handheld drill within both transfer limits", () => {
  const result = chargeHandToolFromBattery(makeBattery(1000), makeTool(0), 1000);
  assert.equal(result.ok, true);
  assert.equal(result.transferred, 250);
  assert.equal(result.battery.stored, 750);
  assert.equal(result.tool.stored, 250);
  assert.equal(result.batteryView.percent, 0);
});

test("battery interface respects tool capacity and available battery energy", () => {
  const fullTool = chargeHandToolFromBattery(makeBattery(1000), makeTool(19900), 500);
  assert.equal(fullTool.transferred, 100);
  assert.equal(fullTool.tool.stored, 20000);
  const lowBattery = chargeHandToolFromBattery(makeBattery(50), makeTool(0), 500);
  assert.equal(lowBattery.transferred, 50);
  assert.equal(lowBattery.battery.stored, 0);
  assert.equal(lowBattery.tool.stored, 50);
});

test("invalid battery or tool state is rejected without mutation", () => {
  assert.equal(inspectBattery({}).reason, "invalid_battery");
  assert.equal(chargeHandToolFromBattery(makeBattery(500), {}, 100).reason, "invalid_tool_battery");
  assert.equal(makeBattery(500).stored, 500);
});

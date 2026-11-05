"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { writeToolBatteryToItem, readToolBatteryFromItem } = require("../behavior_pack/scripts/tool_battery_state.js");
const { runPoweredToolAction } = require("../behavior_pack/scripts/powered_tool_action.js");

function makeItem(toolId, stored) {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery(toolId, stored).battery);
  return item;
}

test("powered action persists energy before invoking the world callback", () => {
  const item = makeItem("drill", 500);
  let observedCharge = null;
  const result = runPoweredToolAction(item, "drill", () => {
    observedCharge = readToolBatteryFromItem(item, "drill").battery.stored;
    return "mined";
  });
  assert.equal(result.ok, true);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 100);
  assert.equal(observedCharge, 400);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 400);
});

test("insufficient charge prevents the world callback and spends nothing", () => {
  const item = makeItem("drill", 99);
  let called = false;
  const result = runPoweredToolAction(item, "drill", () => { called = true; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, false);
  assert.equal(result.reason, "insufficient_charge");
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 99);
});

test("a failed world callback cannot refund already committed energy", () => {
  const item = makeItem("chainsaw", 500);
  const result = runPoweredToolAction(item, "chainsaw", () => { throw new Error("boom"); });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "world_action_failed_energy_spent");
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 350);
});

test("invalid callbacks and invalid tool identities fail without changing charge", () => {
  const item = makeItem("drill", 500);
  assert.equal(runPoweredToolAction(item, "drill", null).reason, "invalid_tool_action");
  assert.equal(runPoweredToolAction(item, "chainsaw", () => {}).reason, "tool_identity_mismatch");
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 500);
});

test("multi-use actions require the complete energy cost", () => {
  const item = makeItem("drill", 250);
  const result = runPoweredToolAction(item, "drill", () => "area-mined", 3);
  assert.equal(result.ok, true);
  assert.equal(result.ran, false);
  assert.equal(result.required, 300);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 250);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { writeToolBatteryToItem, readToolBatteryFromItem } = require("../behavior_pack/scripts/tool_battery_state.js");
const { runChainsawAction } = require("../behavior_pack/scripts/chainsaw_action.js");

function makeChainsaw(stored) {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("chainsaw", stored).battery);
  return item;
}

test("one chainsaw operation spends exactly 150 AEU before cutting", () => {
  const item = makeChainsaw(1000);
  let chargeDuringAction = null;
  const result = runChainsawAction(item, () => {
    chargeDuringAction = readToolBatteryFromItem(item, "chainsaw").battery.stored;
    return "cut";
  });
  assert.equal(result.ok, true);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 150);
  assert.equal(chargeDuringAction, 850);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 850);
});

test("chainsaw does not run or spend energy below its per-operation cost", () => {
  const item = makeChainsaw(149);
  let called = false;
  const result = runChainsawAction(item, () => { called = true; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, false);
  assert.equal(result.reason, "insufficient_charge");
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 149);
});

test("chainsaw rejects another tool battery without changing it", () => {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("drill", 500).battery);
  const result = runChainsawAction(item, () => "should not run");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "tool_identity_mismatch");
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 500);
});

test("failed chainsaw world callback cannot refund committed energy", () => {
  const item = makeChainsaw(500);
  const result = runChainsawAction(item, () => { throw new Error("cut failed"); });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "world_action_failed_energy_spent");
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 350);
});

test("invalid callback leaves chainsaw charge untouched", () => {
  const item = makeChainsaw(500);
  const result = runChainsawAction(item, null);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_tool_action");
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 500);
});

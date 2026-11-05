"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { writeToolBatteryToItem, readToolBatteryFromItem } = require("../behavior_pack/scripts/tool_battery_state.js");
const { planChainsawAction, runChainsawAction } = require("../behavior_pack/scripts/chainsaw_action.js");

function makeChainsaw(stored) {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("chainsaw", stored).battery);
  return item;
}

test("Vein Miner disabled cuts only the targeted block", () => {
  const item = makeChainsaw(1000);
  let cutCount = 0;
  const result = runChainsawAction(item, false, 12, count => { cutCount = count; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 150);
  assert.equal(result.plan.blockCount, 1);
  assert.equal(cutCount, 1);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 850);
});

test("Vein Miner enabled cuts all eligible connected logs within the cap", () => {
  const item = makeChainsaw(3000);
  let cutCount = 0;
  const result = runChainsawAction(item, true, 8, count => { cutCount = count; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 1200);
  assert.equal(result.plan.blockCount, 8);
  assert.equal(cutCount, 8);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 1800);
});

test("Vein Miner action is bounded to 64 blocks", () => {
  const plan = planChainsawAction(true, 100);
  assert.equal(plan.ok, true);
  assert.equal(plan.blockCount, 64);
  assert.equal(plan.energyRequired, 9600);
});

test("insufficient charge prevents the complete multi-block action", () => {
  const item = makeChainsaw(1000);
  let called = false;
  const result = runChainsawAction(item, true, 8, () => { called = true; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, false);
  assert.equal(result.reason, "insufficient_charge");
  assert.equal(result.required, 1200);
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 1000);
});

test("no eligible logs do not spend energy or invoke the action", () => {
  const item = makeChainsaw(500);
  let called = false;
  const result = runChainsawAction(item, true, 0, () => { called = true; });
  assert.equal(result.ran, false);
  assert.equal(result.reason, "no_eligible_blocks");
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 500);
});

test("invalid Vein Miner setting and block counts are rejected", () => {
  assert.equal(planChainsawAction("yes", 3).reason, "invalid_vein_miner_setting");
  assert.equal(planChainsawAction(true, -1).reason, "invalid_eligible_block_count");
  assert.equal(planChainsawAction(true, 3, 65).reason, "invalid_vein_miner_limit");
});

test("chainsaw rejects another tool battery without changing it", () => {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("drill", 500).battery);
  const result = runChainsawAction(item, false, 1, () => "should not run");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "tool_identity_mismatch");
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 500);
});

test("failed world callback cannot refund committed energy", () => {
  const item = makeChainsaw(500);
  const result = runChainsawAction(item, false, 1, () => { throw new Error("cut failed"); });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "world_action_failed_energy_spent");
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 350);
});

test("invalid callback leaves chainsaw charge untouched", () => {
  const item = makeChainsaw(500);
  const result = runChainsawAction(item, false, 1, null);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_tool_action");
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 500);
});

const { setVeinMinerEnabled } = require("../behavior_pack/scripts/tool_settings.js");

test("Chainsaw action automatically uses the saved Vein Miner preference", () => {
  const item = makeChainsaw(3000);
  setVeinMinerEnabled(item, "chainsaw", true);
  let cut = 0;
  const result = runChainsawAction(item, undefined, 8, count => { cut = count; });
  assert.equal(result.ok, true);
  assert.equal(result.plan.veinMinerEnabled, true);
  assert.equal(cut, 8);
  assert.equal(result.consumed, 1200);
});

test("Chainsaw saved OFF preference keeps single-log behavior", () => {
  const item = makeChainsaw(3000);
  setVeinMinerEnabled(item, "chainsaw", false);
  let cut = 0;
  const result = runChainsawAction(item, undefined, 8, count => { cut = count; });
  assert.equal(result.ok, true);
  assert.equal(result.plan.veinMinerEnabled, false);
  assert.equal(cut, 1);
  assert.equal(result.consumed, 150);
});

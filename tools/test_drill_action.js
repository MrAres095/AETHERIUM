"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const { writeToolBatteryToItem, readToolBatteryFromItem } = require("../behavior_pack/scripts/tool_battery_state.js");
const { runDrillAction } = require("../behavior_pack/scripts/drill_action.js");

function makeDrill(stored) {
  const props = new Map();
  const item = {
    getDynamicProperty(key) { return props.get(key); },
    setDynamicProperty(key, value) { props.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("drill", stored).battery);
  return item;
}

test("Basic drill runs without an item battery", () => {
  let mined = 0;
  const result = runDrillAction(null, "basic", 1, count => { mined = count; });
  assert.equal(result.ok, true);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 0);
  assert.equal(mined, 1);
});

test("Advanced drill spends exactly 100 AEU for each eligible block", () => {
  const item = makeDrill(1000);
  const result = runDrillAction(item, "advanced", 4, count => count);
  assert.equal(result.ran, true);
  assert.equal(result.consumed, 400);
  assert.equal(result.actionResult, 4);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 600);
});

test("Ultimate drill refuses the complete action if the battery is short", () => {
  const item = makeDrill(800);
  let called = false;
  const result = runDrillAction(item, "ultimate", 9, () => { called = true; });
  assert.equal(result.ran, false);
  assert.equal(result.reason, "insufficient_charge");
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 800);
});

test("no eligible blocks do not spend energy or call the world action", () => {
  const item = makeDrill(500);
  let called = false;
  const result = runDrillAction(item, "advanced", 0, () => { called = true; });
  assert.equal(result.reason, "no_eligible_blocks");
  assert.equal(called, false);
  assert.equal(readToolBatteryFromItem(item, "drill").battery.stored, 500);
});

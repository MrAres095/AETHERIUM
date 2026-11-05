"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectDrillMode, planDrillAction, validateDrillModules } = require("../behavior_pack/scripts/drill_profiles.js");

test("Basic drill mines one block and consumes no AEU", () => {
  assert.deepEqual(planDrillAction("basic", 1), {
    ok: true, mode: "basic", blockCount: 1, energyRequired: 0,
    speedMultiplier: 1, veinMining: false, canRun: true,
  });
  assert.equal(inspectDrillMode("basic").requiresBattery, false);
});

test("Advanced drill is a powered 3x3 action with per-block cost", () => {
  const plan = planDrillAction("advanced", 9);
  assert.equal(plan.blockCount, 9);
  assert.equal(plan.energyRequired, 900);
  assert.equal(inspectDrillMode("advanced").requiresBattery, true);
});

test("Ultimate drill keeps 3x3 size, is faster and enables vein mining", () => {
  const plan = planDrillAction("ultimate", 9);
  assert.equal(plan.blockCount, 9);
  assert.equal(plan.energyRequired, 900);
  assert.equal(plan.speedMultiplier, 1.5);
  assert.equal(plan.veinMining, true);
});

test("energy is charged only for eligible blocks, never the full theoretical area", () => {
  const plan = planDrillAction("advanced", 4);
  assert.equal(plan.blockCount, 4);
  assert.equal(plan.energyRequired, 400);
});

test("invalid mode and invalid block counts are rejected", () => {
  assert.equal(planDrillAction("experimental", 1).reason, "unknown_drill_mode");
  assert.equal(planDrillAction("basic", -1).reason, "invalid_eligible_block_count");
  assert.equal(planDrillAction("basic", 1.5).reason, "invalid_eligible_block_count");
});

test("drill modules allow known unique modules", () => {
  assert.equal(validateDrillModules(["speed", "efficiency", "area"]).ok, true);
});

test("Fortune and Silk Touch cannot be installed together", () => {
  assert.equal(validateDrillModules(["fortune", "silk_touch"]).reason, "incompatible_drill_modules");
});

test("unknown and duplicate modules are rejected", () => {
  assert.equal(validateDrillModules(["speed", "speed"]).reason, "duplicate_drill_module");
  assert.equal(validateDrillModules(["auto_smelt"]).reason, "unknown_drill_module");
});

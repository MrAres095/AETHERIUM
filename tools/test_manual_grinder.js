"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const registry = require("../behavior_pack/industry/grinder_recipes.json");
const {
  MANUAL_GRINDER_ID,
  MANUAL_GRIND_COOLDOWN_TICKS,
  operateManualGrinder,
} = require("../behavior_pack/scripts/manual_grinder.js");

const base = {
  machineId: MANUAL_GRINDER_ID,
  inputSlot: { typeId: "minecraft:iron_ore", amount: 2 },
  outputSlots: [null, null, null],
  recipeRegistry: registry,
  currentTick: 100,
};

test("manual Grinder processes exactly one recipe action without electricity", () => {
  const result = operateManualGrinder(base);
  assert.equal(result.ok, true);
  assert.deepEqual(result.produced, { typeId: "minecraft:raw_iron", amount: 2 });
  assert.equal(result.inputAfter.amount, 1);
  assert.equal(result.powered, false);
  assert.equal(result.energyCost, 0);
  assert.equal(result.nextOperationTick, 100 + MANUAL_GRIND_COOLDOWN_TICKS);
});

test("manual Grinder enforces its hand-operation cooldown", () => {
  const result = operateManualGrinder({
    ...base,
    currentTick: 115,
    lastOperationTick: 100,
  });
  assert.deepEqual(result, {
    ok: false,
    reason: "cooldown",
    retryAfterTicks: 5,
  });
});

test("manual Grinder becomes usable again when cooldown expires", () => {
  const result = operateManualGrinder({
    ...base,
    currentTick: 120,
    lastOperationTick: 100,
  });
  assert.equal(result.ok, true);
});

test("manual Grinder does not consume input if output storage is full", () => {
  const result = operateManualGrinder({
    ...base,
    outputSlots: [
      { typeId: "minecraft:stone", amount: 64 },
      { typeId: "minecraft:dirt", amount: 64 },
      { typeId: "minecraft:gravel", amount: 64 },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "output_full");
});

test("manual Grinder rejects electric machine identity", () => {
  assert.deepEqual(operateManualGrinder({
    ...base,
    machineId: "aetherium:electric_grinder",
  }), { ok: false, reason: "wrong_machine" });
});

test("manual Grinder rejects invalid tick state", () => {
  assert.deepEqual(operateManualGrinder({
    ...base,
    currentTick: -1,
  }), { ok: false, reason: "invalid_tick_state" });
});

test("manual Grinder rejects a tick that would overflow its cooldown deadline", () => {
  assert.deepEqual(operateManualGrinder({
    ...base,
    currentTick: Number.MAX_SAFE_INTEGER - MANUAL_GRIND_COOLDOWN_TICKS + 1,
  }), { ok: false, reason: "invalid_tick_state" });
});

test("manual Grinder accepts the highest tick with a safe cooldown deadline", () => {
  const result = operateManualGrinder({
    ...base,
    currentTick: Number.MAX_SAFE_INTEGER - MANUAL_GRIND_COOLDOWN_TICKS,
  });
  assert.equal(result.ok, true);
  assert.equal(result.nextOperationTick, Number.MAX_SAFE_INTEGER);
  assert.equal(Number.isSafeInteger(result.nextOperationTick), true);
});

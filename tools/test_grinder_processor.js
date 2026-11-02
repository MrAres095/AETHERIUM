"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { planGrind } = require("../behavior_pack/scripts/grinder_processor.js");

const registry = {
  recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2 },
    { input: "aetherium:ore", output: "aetherium:raw_crystal", count: 2 },
  ],
};

test("processes one ore into two outputs and consumes one input", () => {
  const result = planGrind(
    { typeId: "minecraft:iron_ore", amount: 3 },
    [null, null],
    registry,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.inputAfter, { typeId: "minecraft:iron_ore", amount: 2 });
  assert.deepEqual(result.outputAfter[0], {
    typeId: "minecraft:raw_iron", amount: 2, maxAmount: 64,
  });
  assert.deepEqual(result.produced, { typeId: "minecraft:raw_iron", amount: 2 });
});

test("fills an existing compatible stack before an empty slot", () => {
  const result = planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 },
    [{ typeId: "minecraft:raw_iron", amount: 63 }, null],
    registry,
  );
  assert.equal(result.ok, true);
  assert.equal(result.outputAfter[0].amount, 64);
  assert.equal(result.outputAfter[1].amount, 1);
});

test("does not consume input when output inventory is full", () => {
  const result = planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 },
    [{ typeId: "minecraft:stone", amount: 64 }],
    registry,
  );
  assert.deepEqual(result, { ok: false, reason: "output_full" });
});

test("does not mutate caller-owned inventory slots", () => {
  const input = { typeId: "minecraft:iron_ore", amount: 1 };
  const outputs = [{ typeId: "minecraft:raw_iron", amount: 63 }, null];
  planGrind(input, outputs, registry);
  assert.equal(input.amount, 1);
  assert.equal(outputs[0].amount, 63);
  assert.equal(outputs[1], null);
});

test("rejects unknown ores and malformed input", () => {
  assert.equal(planGrind(
    { typeId: "minecraft:stone", amount: 1 }, [null], registry,
  ).reason, "no_recipe");
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 0 }, [null], registry,
  ).reason, "invalid_input");
});

test("splits large recipe output across multiple empty slots", () => {
  const largeRegistry = {
    recipes: [{ input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 130 }],
  };
  const result = planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 },
    [null, null, null],
    largeRegistry,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.outputAfter.map(slot => slot.amount), [64, 64, 2]);
});

test("rejects malformed output stacks instead of planning against them", () => {
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 },
    [{ typeId: "minecraft:raw_iron", amount: 65, maxAmount: 64 }],
    registry,
  ).reason, "invalid_output_inventory");
});

test("rejects duplicate recipe mappings as ambiguous", () => {
  const ambiguous = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2 },
    { input: "minecraft:iron_ore", output: "minecraft:iron_ingot", count: 1 },
  ] };
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], ambiguous,
  ).reason, "ambiguous_recipe");
});

test("honors a recipe-specific stack limit", () => {
  const singleStack = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:bucket", count: 2, max_stack_size: 1 },
  ] };
  const result = planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null, null], singleStack,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.outputAfter.map(slot => slot.amount), [1, 1]);
});

test("rejects a recipe with an invalid stack limit", () => {
  const bad = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2, max_stack_size: 0 },
  ] };
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], bad,
  ).reason, "invalid_recipe");
});

test("leaves input and output unchanged when an output cannot fully fit", () => {
  const input = { typeId: "minecraft:iron_ore", amount: 1 };
  const outputs = [{ typeId: "minecraft:raw_iron", amount: 63 }, { typeId: "minecraft:stone", amount: 64 }];
  const result = planGrind(input, outputs, registry);
  assert.equal(result.reason, "output_full");
  assert.equal(input.amount, 1);
  assert.equal(outputs[0].amount, 63);
});


test("rejects a malformed unrelated recipe instead of silently ignoring the registry error", () => {
  const badRegistry = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2 },
    { input: "minecraft:gold_ore", output: "not-an-item-id", count: 2 },
  ] };
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], badRegistry,
  ).reason, "invalid_recipe_registry");
});

test("rejects duplicate mappings even when the duplicate is not the selected input", () => {
  const badRegistry = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2 },
    { input: "minecraft:gold_ore", output: "minecraft:raw_gold", count: 2 },
    { input: "minecraft:gold_ore", output: "minecraft:gold_ingot", count: 1 },
  ] };
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], badRegistry,
  ).reason, "ambiguous_recipe");
});

test("rejects an empty recipe registry", () => {
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], { recipes: [] },
  ).reason, "invalid_recipe_registry");
});

test("does not accept a recipe output stack limit above the engine-safe default", () => {
  const badRegistry = { recipes: [
    { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2, max_stack_size: 65 },
  ] };
  assert.equal(planGrind(
    { typeId: "minecraft:iron_ore", amount: 1 }, [null], badRegistry,
  ).reason, "invalid_recipe_registry");
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const registry = require("../behavior_pack/industry/grinder_recipes.json");
const { planGrind, validateRecipeRegistry } = require("../behavior_pack/scripts/grinder_processor.js");

test("production Grinder registry is valid and contains unique explicit mappings", () => {
  assert.equal(registry.machine, "aetherium:grinder");
  assert.equal(validateRecipeRegistry(registry), null);
  assert.equal(registry.recipes.length, 22);
  assert.equal(new Set(registry.recipes.map(recipe => recipe.input)).size, registry.recipes.length);
});

test("every production recipe produces its declared output without mutating input", () => {
  for (const recipe of registry.recipes) {
    const input = { typeId: recipe.input, amount: 2 };
    const result = planGrind(input, [null, null, null, null], registry);
    assert.equal(result.ok, true, recipe.input);
    assert.deepEqual(result.produced, {
      typeId: recipe.output,
      amount: recipe.count,
    }, recipe.input);
    assert.equal(result.inputAfter.amount, 1, recipe.input);
    assert.equal(input.amount, 2, recipe.input);
  }
});

test("production recipe output counts are positive safe integers", () => {
  for (const recipe of registry.recipes) {
    assert.equal(Number.isSafeInteger(recipe.count) && recipe.count > 0, true, recipe.input);
  }
});

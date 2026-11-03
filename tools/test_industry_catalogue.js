"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const machines = require("../behavior_pack/industry/machines.json");
const recipes = require("../behavior_pack/industry/grinder_recipes.json");
const { validateMachineRegistry } = require("../behavior_pack/scripts/machine_registry.js");
const { validateRecipeRegistry } = require("../behavior_pack/scripts/grinder_processor.js");

test("production machine catalogue satisfies the shared machine contract", () => {
  assert.deepEqual(validateMachineRegistry(machines), { ok: true, count: 2 });
});

test("production Grinder recipe catalogue is valid and unambiguous", () => {
  assert.equal(validateRecipeRegistry(recipes), null);
  assert.equal(recipes.machine, "aetherium:grinder");
  assert.equal(recipes.recipes.length, 22);
});

test("both Grinder variants point to the same production recipe registry", () => {
  for (const machine of machines.machines) {
    assert.equal(machine.recipe_registry, "behavior_pack/industry/grinder_recipes.json");
    assert.equal(machine.family, "aetherium:grinder");
  }
});

test("manual Grinder stays unpowered and electric Grinder exposes all upgrade roles", () => {
  const manual = machines.machines.find(machine => machine.id === "aetherium:manual_grinder");
  const electric = machines.machines.find(machine => machine.id === "aetherium:electric_grinder");
  assert.equal(manual.mode, "manual");
  assert.equal(manual.powered, false);
  assert.deepEqual(manual.upgrade_slots, []);
  assert.equal(electric.mode, "electric");
  assert.equal(electric.powered, true);
  assert.deepEqual(electric.upgrade_slots, ["speed", "yield", "energy"]);
});

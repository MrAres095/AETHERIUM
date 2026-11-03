"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateMachineRegistry, getMachine } =
  require("../behavior_pack/scripts/machine_registry.js");

const registry = {
  schema_version: 1,
  machines: [
    {
      id: "aetherium:manual_grinder",
      family: "aetherium:grinder",
      mode: "manual",
      powered: false,
      input_slots: 1,
      output_slots: 3,
      upgrade_slots: [],
      recipe_registry: "behavior_pack/industry/grinder_recipes.json",
    },
    {
      id: "aetherium:electric_grinder",
      family: "aetherium:grinder",
      mode: "electric",
      powered: true,
      input_slots: 1,
      output_slots: 3,
      upgrade_slots: ["speed", "yield", "energy"],
      recipe_registry: "behavior_pack/industry/grinder_recipes.json",
    },
  ],
};

test("accepts the shared manual and electric Grinder definitions", () => {
  assert.deepEqual(validateMachineRegistry(registry), { ok: true, count: 2 });
});

test("looks up a machine by its namespaced identifier", () => {
  assert.equal(getMachine(registry, "aetherium:electric_grinder").powered, true);
  assert.equal(getMachine(registry, "aetherium:missing"), null);
});

test("rejects duplicate machine identifiers", () => {
  const duplicate = structuredClone(registry);
  duplicate.machines[1].id = duplicate.machines[0].id;
  assert.equal(validateMachineRegistry(duplicate).reason, "duplicate_machine_id");
});

test("rejects powered/manual mode contradictions", () => {
  const invalid = structuredClone(registry);
  invalid.machines[0].powered = true;
  assert.equal(validateMachineRegistry(invalid).reason, "invalid_machine_definition");
});

test("manual machines cannot claim electric upgrade slots", () => {
  const invalid = structuredClone(registry);
  invalid.machines[0].upgrade_slots = ["speed"];
  assert.equal(validateMachineRegistry(invalid).reason,
    "manual_machine_cannot_have_power_upgrades");
});

test("electric machines must expose all three shared upgrade roles", () => {
  const invalid = structuredClone(registry);
  invalid.machines[1].upgrade_slots = ["speed", "yield"];
  assert.equal(validateMachineRegistry(invalid).reason,
    "electric_machine_requires_shared_upgrade_slots");
});

test("rejects unknown and duplicate upgrade roles", () => {
  const unknown = structuredClone(registry);
  unknown.machines[1].upgrade_slots = ["speed", "yield", "magic"];
  assert.equal(validateMachineRegistry(unknown).reason, "invalid_machine_upgrade_slots");

  const duplicate = structuredClone(registry);
  duplicate.machines[1].upgrade_slots = ["speed", "speed", "energy"];
  assert.equal(validateMachineRegistry(duplicate).reason, "invalid_machine_upgrade_slots");
});

test("rejects malformed recipe registry paths", () => {
  const invalid = structuredClone(registry);
  invalid.machines[0].recipe_registry = "../../secrets.json";
  assert.equal(validateMachineRegistry(invalid).reason, "invalid_machine_recipe_registry");
});

test("rejects an empty catalogue", () => {
  assert.equal(validateMachineRegistry({ schema_version: 1, machines: [] }).reason,
    "invalid_machine_registry");
});

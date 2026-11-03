"use strict";

/**
 * Shared machine catalogue validation and lookup.
 * Kept engine-independent so every AETHERIUM module can use the same contract.
 */

const MACHINE_ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
const UPGRADE_ROLES = new Set(["speed", "yield", "energy"]);

function validateMachineRegistry(registry) {
  if (!registry || typeof registry !== "object" ||
      registry.schema_version !== 1 || !Array.isArray(registry.machines) ||
      registry.machines.length === 0) {
    return { ok: false, reason: "invalid_machine_registry" };
  }

  const ids = new Set();
  for (const machine of registry.machines) {
    if (!machine || typeof machine !== "object" || Array.isArray(machine) ||
        typeof machine.id !== "string" || !MACHINE_ID.test(machine.id) ||
        typeof machine.family !== "string" || !MACHINE_ID.test(machine.family) ||
        !["manual", "electric"].includes(machine.mode) ||
        typeof machine.powered !== "boolean" ||
        machine.powered !== (machine.mode === "electric") ||
        !Number.isInteger(machine.input_slots) || machine.input_slots < 1 ||
        !Number.isInteger(machine.output_slots) || machine.output_slots < 1 ||
        !Array.isArray(machine.upgrade_slots)) {
      return { ok: false, reason: "invalid_machine_definition" };
    }

    if (ids.has(machine.id)) {
      return { ok: false, reason: "duplicate_machine_id" };
    }
    ids.add(machine.id);

    const seenRoles = new Set();
    for (const role of machine.upgrade_slots) {
      if (!UPGRADE_ROLES.has(role) || seenRoles.has(role)) {
        return { ok: false, reason: "invalid_machine_upgrade_slots" };
      }
      seenRoles.add(role);
    }

    if (machine.mode === "manual" && machine.upgrade_slots.length !== 0) {
      return { ok: false, reason: "manual_machine_cannot_have_power_upgrades" };
    }
    if (machine.mode === "electric" &&
        (machine.upgrade_slots.length !== 3 ||
         !["speed", "yield", "energy"].every(role => seenRoles.has(role)))) {
      return { ok: false, reason: "electric_machine_requires_shared_upgrade_slots" };
    }

    if (typeof machine.recipe_registry !== "string" ||
        !/^behavior_pack\/[a-z0-9_./-]+\.json$/.test(machine.recipe_registry)) {
      return { ok: false, reason: "invalid_machine_recipe_registry" };
    }
  }

  return { ok: true, count: registry.machines.length };
}

function getMachine(registry, id) {
  const validation = validateMachineRegistry(registry);
  if (!validation.ok) return null;
  return registry.machines.find(machine => machine.id === id) || null;
}

module.exports = { validateMachineRegistry, getMachine };

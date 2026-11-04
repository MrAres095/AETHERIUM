"use strict";

const { executeItemTransfer } = require("./item_transfer.js");
const { getAdjacentOffset, shouldRunTransfer } = require("./logistics_config.js");
const { validateState } = require("./logistics_state.js");

const EXTRACTOR_ID = "aetherium:item_extractor";
const INSERTER_ID = "aetherium:item_inserter";

/**
 * Runs one engine-independent logistics cycle.
 *
 * resolveAdjacentInventory(face, offset) must return a synchronous inventory
 * adapter exposing readSlots()/writeSlots(), or null when no inventory exists.
 * The caller owns persistence of the machine buffer and world tick scheduling.
 */
function runLogisticsMachineCycle(state, tick, bufferAdapter, resolveAdjacentInventory) {
  const validated = validateState(state);
  if (!validated.ok) return validated;
  const machine = validated.state;
  if (!machine.config.enabled) return { ok: true, movedItems: 0, movedStacks: 0, reason: "disabled" };
  if (!shouldRunTransfer(tick, machine.config)) {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "not_due" };
  }
  if (typeof resolveAdjacentInventory !== "function") {
    return { ok: false, reason: "invalid_inventory_resolver" };
  }
  if (!bufferAdapter || typeof bufferAdapter.readSlots !== "function" ||
      typeof bufferAdapter.writeSlots !== "function") {
    return { ok: false, reason: "invalid_buffer_adapter" };
  }

  const offset = getAdjacentOffset(machine.config.targetFace);
  if (!offset) return { ok: false, reason: "invalid_target_face" };

  let adjacent;
  try {
    adjacent = resolveAdjacentInventory(machine.config.targetFace, offset);
  } catch {
    return { ok: false, reason: "adjacent_inventory_lookup_failed" };
  }
  if (!adjacent) return { ok: true, movedItems: 0, movedStacks: 0, reason: "no_adjacent_inventory" };
  if (adjacent === bufferAdapter) return { ok: false, reason: "same_inventory_adapter" };

  const options = {
    maxStacks: machine.config.maxStacks,
    maxItems: machine.config.maxItems,
    filter: machine.config.filter,
  };
  const source = machine.machineId === EXTRACTOR_ID ? adjacent : bufferAdapter;
  const destination = machine.machineId === EXTRACTOR_ID ? bufferAdapter : adjacent;
  if (machine.machineId !== EXTRACTOR_ID && machine.machineId !== INSERTER_ID) {
    return { ok: false, reason: "unknown_machine_id" };
  }

  const result = executeItemTransfer(source, destination, options);
  if (!result.ok && result.reason === "no_transferable_items") {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "nothing_to_transfer" };
  }
  return result;
}

module.exports = { runLogisticsMachineCycle };

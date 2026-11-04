"use strict";

const { executeItemTransfer } = require("./item_transfer.js");
const { getAdjacentOffset, shouldRunTransfer } = require("./logistics_config.js");
const {
  validateState,
  updateLogisticsMachineBuffer,
} = require("./logistics_state.js");

const EXTRACTOR_ID = "aetherium:item_extractor";
const INSERTER_ID = "aetherium:item_inserter";

/**
 * Runs one engine-independent logistics cycle.
 *
 * resolveAdjacentInventory(face, offset) must return a synchronous inventory
 * adapter exposing readSlots()/writeSlots(), or null when no inventory exists.
 * The buffer adapter must represent the machine's current nine-slot buffer.
 * On a committed cycle the returned state contains the new buffer snapshot;
 * the caller must persist it through its chosen Bedrock storage adapter.
 */
function runLogisticsMachineCycle(state, tick, bufferAdapter, resolveAdjacentInventory) {
  const validated = validateState(state);
  if (!validated.ok) return validated;
  const machine = validated.state;

  if (!Number.isSafeInteger(tick) || tick < 0) {
    return { ok: false, reason: "invalid_tick" };
  }
  if (!machine.config.enabled) {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "disabled", state: machine };
  }
  if (!shouldRunTransfer(tick, machine.config)) {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "not_due", state: machine };
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
  if (!adjacent) {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "no_adjacent_inventory", state: machine };
  }
  if (adjacent === bufferAdapter) return { ok: false, reason: "same_inventory_adapter" };

  if (machine.machineId !== EXTRACTOR_ID && machine.machineId !== INSERTER_ID) {
    return { ok: false, reason: "unknown_machine_id" };
  }

  const options = {
    maxStacks: machine.config.maxStacks,
    maxItems: machine.config.maxItems,
    filter: machine.config.filter,
  };
  const source = machine.machineId === EXTRACTOR_ID ? adjacent : bufferAdapter;
  const destination = machine.machineId === EXTRACTOR_ID ? bufferAdapter : adjacent;
  const result = executeItemTransfer(source, destination, options);

  if (!result.ok && result.reason === "no_transferable_items") {
    return { ok: true, movedItems: 0, movedStacks: 0, reason: "nothing_to_transfer", state: machine };
  }
  if (!result.ok) return result;

  let updatedSlots;
  try {
    updatedSlots = bufferAdapter.readSlots();
  } catch {
    return {
      ...result,
      state: undefined,
      reason: "buffer_state_refresh_failed",
      transferCommitted: true,
    };
  }
  const updated = updateLogisticsMachineBuffer(machine, updatedSlots);
  if (!updated.ok) {
    return {
      ...result,
      state: undefined,
      reason: "buffer_state_validation_failed",
      transferCommitted: true,
      detail: updated.reason,
    };
  }
  return { ...result, state: updated.state };
}

module.exports = { runLogisticsMachineCycle };

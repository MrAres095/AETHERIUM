"use strict";

const { planGrind } = require("./grinder_processor.js");
const activeStores = new WeakSet();

function isDeclaredAsync(fn) {
  return fn && fn.constructor && fn.constructor.name === "AsyncFunction";
}

function snapshotSlot(slot) {
  return slot && typeof slot === "object" ? { ...slot } : slot;
}

function snapshotSlots(slots) {
  return Array.isArray(slots) ? slots.map(snapshotSlot) : slots;
}

/**
 * Applies a planned grind through a synchronous storage adapter.
 *
 * Adapter contract:
 *   readInput() -> slot | null
 *   readOutputs() -> array of slots
 *   writeOutputs(slots) -> void
 *   writeInput(slot | null) -> void
 *
 * Read values are copied before planning so adapters that expose live mutable
 * slot objects cannot corrupt the rollback snapshots during a write.
 * Output is written before input is consumed. If either write throws, the
 * adapter attempts to restore both previous snapshots. This in-memory rollback
 * is not crash-safe. Adapter methods must be synchronous; a Bedrock adapter
 * must not yield between these operations.
 */
function executeGrind(storage, recipeRegistry) {
  if (!storage || typeof storage !== "object" ||
      typeof storage.readInput !== "function" ||
      typeof storage.readOutputs !== "function" ||
      typeof storage.writeOutputs !== "function" ||
      typeof storage.writeInput !== "function") {
    return { ok: false, reason: "invalid_storage_adapter" };
  }
  // The transaction spans several inventory operations and cannot safely yield.
  // Reject async methods before invoking any adapter code.
  if ([storage.readInput, storage.readOutputs, storage.writeOutputs, storage.writeInput]
    .some(isDeclaredAsync)) {
    return { ok: false, reason: "async_storage_adapter_unsupported" };
  }
  if (activeStores.has(storage)) {
    return { ok: false, reason: "transaction_in_progress" };
  }

  activeStores.add(storage);
  try {
    let inputBefore;
    let outputsBefore;
    try {
      inputBefore = snapshotSlot(storage.readInput());
      outputsBefore = snapshotSlots(storage.readOutputs());
    } catch {
      return { ok: false, reason: "storage_read_failed" };
    }
    const plan = planGrind(inputBefore, outputsBefore, recipeRegistry);
    if (!plan.ok) return plan;

    try {
      storage.writeOutputs(plan.outputAfter);
    } catch {
      // A storage adapter may fail after partially applying a multi-slot write.
      try {
        storage.writeOutputs(outputsBefore);
        return { ok: false, reason: "output_write_failed_rolled_back" };
      } catch {
        return { ok: false, reason: "output_write_failed_rollback_failed" };
      }
    }

    try {
      storage.writeInput(plan.inputAfter);
    } catch {
      let inputRestored = false;
      let outputsRestored = false;
      try {
        storage.writeInput(inputBefore);
        inputRestored = true;
      } catch {
        // Keep attempting restoration of the other inventory side.
      }
      try {
        storage.writeOutputs(outputsBefore);
        outputsRestored = true;
      } catch {
        // The caller receives an explicit failure if either side did not restore.
      }
      return inputRestored && outputsRestored
        ? { ok: false, reason: "input_write_failed_rolled_back" }
        : { ok: false, reason: "rollback_failed" };
    }

    return { ok: true, produced: plan.produced };
  } finally {
    activeStores.delete(storage);
  }
}

module.exports = { executeGrind };

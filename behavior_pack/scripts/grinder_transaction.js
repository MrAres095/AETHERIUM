"use strict";

const { planGrind } = require("./grinder_processor.js");
const activeStores = new WeakSet();

/**
 * Applies a planned grind through a synchronous storage adapter.
 *
 * Adapter contract:
 *   readInput() -> slot | null
 *   readOutputs() -> array of slots
 *   writeOutputs(slots) -> void
 *   writeInput(slot | null) -> void
 *
 * Output is written before input is consumed. If committing the input fails,
 * the previous output snapshot is restored. Adapter methods must be
 * synchronous; a Bedrock adapter must not yield between these operations.
 */
function executeGrind(storage, recipeRegistry) {
  if (!storage || typeof storage !== "object" ||
      typeof storage.readInput !== "function" ||
      typeof storage.readOutputs !== "function" ||
      typeof storage.writeOutputs !== "function" ||
      typeof storage.writeInput !== "function") {
    return { ok: false, reason: "invalid_storage_adapter" };
  }
  if (activeStores.has(storage)) {
    return { ok: false, reason: "transaction_in_progress" };
  }

  activeStores.add(storage);
  try {
    let inputBefore;
    let outputsBefore;
    try {
      inputBefore = storage.readInput();
      outputsBefore = storage.readOutputs();
    } catch {
      return { ok: false, reason: "storage_read_failed" };
    }
    const plan = planGrind(inputBefore, outputsBefore, recipeRegistry);
    if (!plan.ok) return plan;

    try {
      storage.writeOutputs(plan.outputAfter);
    } catch {
      return { ok: false, reason: "output_write_failed" };
    }

    try {
      storage.writeInput(plan.inputAfter);
    } catch {
      try {
        storage.writeOutputs(outputsBefore);
        return { ok: false, reason: "input_write_failed_rolled_back" };
      } catch {
        return { ok: false, reason: "rollback_failed" };
      }
    }

    return { ok: true, produced: plan.produced };
  } finally {
    activeStores.delete(storage);
  }
}

module.exports = { executeGrind };

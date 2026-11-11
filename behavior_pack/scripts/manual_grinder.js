"use strict";

const { planGrind } = require("./grinder_processor.js");

const MANUAL_GRINDER_ID = "aetherium:manual_grinder";
const MANUAL_GRIND_COOLDOWN_TICKS = 20;

/**
 * Plans one player-operated grind action.
 * This is deliberately engine-independent: a Bedrock interaction handler
 * supplies the inventory snapshots and commits the returned plan.
 */
function operateManualGrinder({
  machineId,
  inputSlot,
  outputSlots,
  recipeRegistry,
  currentTick,
  lastOperationTick = null,
}) {
  if (machineId !== MANUAL_GRINDER_ID) {
    return { ok: false, reason: "wrong_machine" };
  }
  // Keep the scheduled cooldown tick representable as a safe integer too.
  if (!Number.isSafeInteger(currentTick) || currentTick < 0 ||
      currentTick > Number.MAX_SAFE_INTEGER - MANUAL_GRIND_COOLDOWN_TICKS ||
      (lastOperationTick !== null &&
       (!Number.isSafeInteger(lastOperationTick) ||
        lastOperationTick < 0 || lastOperationTick > currentTick))) {
    return { ok: false, reason: "invalid_tick_state" };
  }
  if (lastOperationTick !== null &&
      currentTick - lastOperationTick < MANUAL_GRIND_COOLDOWN_TICKS) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterTicks: MANUAL_GRIND_COOLDOWN_TICKS -
        (currentTick - lastOperationTick),
    };
  }

  const plan = planGrind(inputSlot, outputSlots, recipeRegistry);
  if (!plan.ok) return plan;

  return {
    ...plan,
    machineId: MANUAL_GRINDER_ID,
    powered: false,
    energyCost: 0,
    nextOperationTick: currentTick + MANUAL_GRIND_COOLDOWN_TICKS,
  };
}

module.exports = {
  MANUAL_GRINDER_ID,
  MANUAL_GRIND_COOLDOWN_TICKS,
  operateManualGrinder,
};

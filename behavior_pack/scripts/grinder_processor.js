"use strict";

/**
 * Engine-independent Grinder transaction planner.
 *
 * This module plans a complete inventory transition without mutating the
 * supplied slots. A Bedrock-specific adapter must apply the returned plan
 * and persist it as one guarded operation.
 */

const DEFAULT_STACK_LIMIT = 64;
const ITEM_ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

function failure(reason) {
  return { ok: false, reason };
}

function validStack(slot, allowEmpty = true) {
  if (slot == null) return allowEmpty;
  const maxAmount = slot.maxAmount ?? DEFAULT_STACK_LIMIT;
  return typeof slot.typeId === "string" &&
    ITEM_ID.test(slot.typeId) &&
    Number.isInteger(slot.amount) && slot.amount > 0 &&
    Number.isInteger(maxAmount) && maxAmount > 0 &&
    slot.amount <= maxAmount;
}

function cloneSlot(slot) {
  if (slot == null) return null;
  return {
    typeId: slot.typeId,
    amount: slot.amount,
    maxAmount: slot.maxAmount ?? DEFAULT_STACK_LIMIT,
  };
}

function findRecipe(inputTypeId, registry) {
  let match = null;
  for (const recipe of registry.recipes) {
    if (!recipe || recipe.input !== inputTypeId) continue;
    if (match) return { error: "ambiguous_recipe" };
    match = recipe;
  }
  if (!match) return { error: "no_recipe" };

  const maxStackSize = match.max_stack_size ?? DEFAULT_STACK_LIMIT;
  if (typeof match.output !== "string" || !ITEM_ID.test(match.output) ||
      !Number.isInteger(match.count) || match.count < 1 ||
      !Number.isInteger(maxStackSize) || maxStackSize < 1 ||
      maxStackSize > DEFAULT_STACK_LIMIT) {
    return { error: "invalid_recipe" };
  }
  return { recipe: match, maxStackSize };
}

/**
 * @returns {object} A plan only; no inventory mutation is performed here.
 */
function planGrind(inputSlot, outputSlots, recipeRegistry) {
  if (!validStack(inputSlot, false)) return failure("invalid_input");
  if (!Array.isArray(outputSlots) ||
      !recipeRegistry || !Array.isArray(recipeRegistry.recipes)) {
    return failure("invalid_inventory_or_registry");
  }
  if (!outputSlots.every(slot => validStack(slot, true))) {
    return failure("invalid_output_inventory");
  }

  const found = findRecipe(inputSlot.typeId, recipeRegistry);
  if (found.error) return failure(found.error);
  const { recipe, maxStackSize } = found;

  const nextSlots = outputSlots.map(cloneSlot);
  let remaining = recipe.count;

  // Fill compatible existing stacks first.
  for (let index = 0; index < nextSlots.length && remaining > 0; index += 1) {
    const slot = nextSlots[index];
    if (!slot || slot.typeId !== recipe.output) continue;
    const capacity = Math.max(0, Math.min(slot.maxAmount, maxStackSize) - slot.amount);
    const moved = Math.min(capacity, remaining);
    slot.amount += moved;
    remaining -= moved;
  }

  // Then use empty slots, respecting the recipe's output stack limit.
  for (let index = 0; index < nextSlots.length && remaining > 0; index += 1) {
    if (nextSlots[index] !== null) continue;
    const moved = Math.min(maxStackSize, remaining);
    nextSlots[index] = {
      typeId: recipe.output,
      amount: moved,
      maxAmount: maxStackSize,
    };
    remaining -= moved;
  }

  // No input consumption is proposed unless the complete output fits.
  if (remaining > 0) return failure("output_full");

  return {
    ok: true,
    inputAfter: inputSlot.amount === 1
      ? null
      : { ...inputSlot, amount: inputSlot.amount - 1 },
    outputAfter: nextSlots,
    produced: { typeId: recipe.output, amount: recipe.count },
  };
}

module.exports = { planGrind };

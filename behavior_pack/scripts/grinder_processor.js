"use strict";

/**
 * Engine-independent Grinder transaction planner.
 *
 * This module deliberately does not import Minecraft Script API. It computes
 * a safe inventory transition and can be unit-tested independently before a
 * Bedrock-specific storage adapter is selected.
 */

const DEFAULT_STACK_LIMIT = 64;

function cloneSlot(slot) {
  if (slot == null) return null;
  return {
    typeId: slot.typeId,
    amount: slot.amount,
    maxAmount: slot.maxAmount ?? DEFAULT_STACK_LIMIT,
  };
}

function planGrind(inputSlot, outputSlots, recipeRegistry) {
  if (!inputSlot || typeof inputSlot.typeId !== "string" ||
      !Number.isInteger(inputSlot.amount) || inputSlot.amount < 1) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!Array.isArray(outputSlots) || !recipeRegistry ||
      !Array.isArray(recipeRegistry.recipes)) {
    return { ok: false, reason: "invalid_inventory_or_registry" };
  }

  const recipe = recipeRegistry.recipes.find(entry =>
    entry && entry.input === inputSlot.typeId
  );
  if (!recipe || typeof recipe.output !== "string" ||
      !Number.isInteger(recipe.count) || recipe.count < 1) {
    return { ok: false, reason: "no_recipe" };
  }

  const nextSlots = outputSlots.map(cloneSlot);
  let remaining = recipe.count;

  // Fill compatible existing stacks first.
  for (let index = 0; index < nextSlots.length && remaining > 0; index += 1) {
    const slot = nextSlots[index];
    if (!slot || slot.typeId !== recipe.output) continue;
    const capacity = Math.max(0, slot.maxAmount - slot.amount);
    const moved = Math.min(capacity, remaining);
    slot.amount += moved;
    remaining -= moved;
  }

  // Then use empty slots, respecting the output item's stack limit.
  for (let index = 0; index < nextSlots.length && remaining > 0; index += 1) {
    if (nextSlots[index] !== null) continue;
    const moved = Math.min(DEFAULT_STACK_LIMIT, remaining);
    nextSlots[index] = {
      typeId: recipe.output,
      amount: moved,
      maxAmount: DEFAULT_STACK_LIMIT,
    };
    remaining -= moved;
  }

  // No mutation is committed unless the complete output fits.
  if (remaining > 0) {
    return { ok: false, reason: "output_full" };
  }

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

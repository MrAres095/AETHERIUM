"use strict";

/**
 * Engine-independent Grinder transaction planner.
 * Plans a complete inventory transition without mutating supplied slots.
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
    Number.isSafeInteger(slot.amount) && slot.amount > 0 &&
    Number.isSafeInteger(maxAmount) && maxAmount > 0 &&
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

/** Validate every mapping, not only the mapping selected by this input. */
function validateRecipeRegistry(registry) {
  if (!registry || !Array.isArray(registry.recipes)) {
    return "invalid_inventory_or_registry";
  }
  if (registry.recipes.length === 0) {
    return "invalid_recipe_registry";
  }

  const seenInputs = new Set();
  for (const recipe of registry.recipes) {
    if (!recipe || typeof recipe !== "object" || Array.isArray(recipe) ||
        typeof recipe.input !== "string" || !ITEM_ID.test(recipe.input) ||
        typeof recipe.output !== "string" || !ITEM_ID.test(recipe.output) ||
        !Number.isSafeInteger(recipe.count) || recipe.count < 1) {
      return "invalid_recipe_registry";
    }

    const maxStackSize = recipe.max_stack_size ?? DEFAULT_STACK_LIMIT;
    if (!Number.isSafeInteger(maxStackSize) || maxStackSize < 1 ||
        maxStackSize > DEFAULT_STACK_LIMIT) {
      return "invalid_recipe_registry";
    }
    if (seenInputs.has(recipe.input)) return "ambiguous_recipe";
    seenInputs.add(recipe.input);
  }
  return null;
}

function findRecipe(inputTypeId, registry) {
  return { recipe: registry.recipes.find(recipe => recipe.input === inputTypeId) || null };
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

  const registryError = validateRecipeRegistry(recipeRegistry);
  if (registryError) return failure(registryError);

  const { recipe } = findRecipe(inputSlot.typeId, recipeRegistry);
  if (!recipe) return failure("no_recipe");
  const maxStackSize = recipe.max_stack_size ?? DEFAULT_STACK_LIMIT;

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

  // No input consumption unless the complete output fits.
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

module.exports = { planGrind, validateRecipeRegistry };

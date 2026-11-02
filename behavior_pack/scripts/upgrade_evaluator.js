"use strict";

/**
 * Shared, engine-independent evaluator for the three machine upgrade slots.
 * This module calculates configuration only; a Bedrock runtime must apply the
 * returned values to a machine's actual processing and visual components.
 */

const SLOT_ROLES = Object.freeze(["speed", "yield", "energy"]);
const TIER_MULTIPLIERS = Object.freeze({
  speed: Object.freeze({ 1: 1.05, 2: 1.25, 3: 1.6 }),
  yield: Object.freeze({ 1: 1.05, 2: 1.25, 3: 1.5 }),
  energy: Object.freeze({ 1: 0.95, 2: 0.8, 3: 0.65 }),
});

function invalid(reason) {
  return { ok: false, reason };
}

/**
 * slots must contain exactly one module per role. Empty slots are represented
 * by null. A module is { role: "speed"|"yield"|"energy", tier: 1|2|3 }.
 */
function evaluateUpgrades(slots) {
  if (!Array.isArray(slots) || slots.length !== 3) {
    return invalid("invalid_upgrade_slots");
  }

  const installed = Object.fromEntries(SLOT_ROLES.map(role => [role, null]));
  for (const module of slots) {
    if (module === null) continue;
    if (!module || typeof module !== "object" ||
        !SLOT_ROLES.includes(module.role) ||
        !Number.isInteger(module.tier) || module.tier < 1 || module.tier > 3) {
      return invalid("invalid_upgrade_module");
    }
    if (installed[module.role] !== null) {
      return invalid("duplicate_upgrade_role");
    }
    installed[module.role] = module.tier;
  }

  const tiers = SLOT_ROLES.map(role => installed[role] ?? 0);
  const installedTiers = tiers.filter(tier => tier > 0);
  const averageTier = installedTiers.length
    ? installedTiers.reduce((sum, tier) => sum + tier, 0) / 3
    : 0;

  // Visual tier is based on all three slots. Ultimate is reserved for the
  // complete 3x Tier III configuration, exactly as specified for the project.
  const visualTier = tiers.every(tier => tier === 3)
    ? 3
    : tiers.every(tier => tier === 2)
      ? 2
      : tiers.every(tier => tier === 1) || installedTiers.length === 0
        ? 1
        : averageTier >= 1.5 ? 2 : 1;

  const multiplier = role => {
    const tier = installed[role];
    return tier === null ? 1 : TIER_MULTIPLIERS[role][tier];
  };

  return {
    ok: true,
    installed: { ...installed },
    speedMultiplier: multiplier("speed"),
    yieldMultiplier: multiplier("yield"),
    energyMultiplier: multiplier("energy"),
    averageTier,
    visualTier,
    ultimateEffects: visualTier === 3,
  };
}

module.exports = { evaluateUpgrades, SLOT_ROLES, TIER_MULTIPLIERS };

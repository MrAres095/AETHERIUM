"use strict";

const DRILL_MODES = Object.freeze({
  basic: Object.freeze({
    width: 1, height: 1, blocksPerAction: 1,
    energyPerBlock: 0, speedMultiplier: 1,
    veinMining: false, requiresBattery: false,
  }),
  advanced: Object.freeze({
    width: 3, height: 3, blocksPerAction: 9,
    energyPerBlock: 100, speedMultiplier: 1,
    veinMining: false, requiresBattery: true,
  }),
  ultimate: Object.freeze({
    width: 3, height: 3, blocksPerAction: 9,
    energyPerBlock: 100, speedMultiplier: 1.5,
    veinMining: true, requiresBattery: true,
  }),
});

const DRILL_MODULES = Object.freeze([
  "speed", "fortune", "silk_touch", "efficiency", "area", "energy_cell",
]);

function inspectDrillMode(mode) {
  const profile = DRILL_MODES[mode];
  if (!profile) return { ok: false, reason: "unknown_drill_mode" };
  return { ok: true, mode, ...profile };
}

/**
 * Resolve a single planned drill action. The caller supplies the number of
 * blocks that actually passed the world/permission/tool checks. The action
 * never charges for more blocks than the mode allows, and Basic remains free.
 */
function planDrillAction(mode, eligibleBlockCount) {
  const profile = DRILL_MODES[mode];
  if (!profile) return { ok: false, reason: "unknown_drill_mode" };
  if (!Number.isSafeInteger(eligibleBlockCount) || eligibleBlockCount < 0) {
    return { ok: false, reason: "invalid_eligible_block_count" };
  }
  const blockCount = Math.min(profile.blocksPerAction, eligibleBlockCount);
  return {
    ok: true,
    mode,
    blockCount,
    energyRequired: blockCount * profile.energyPerBlock,
    speedMultiplier: profile.speedMultiplier,
    veinMining: profile.veinMining,
    canRun: blockCount > 0,
  };
}

function validateDrillModules(modules) {
  if (!Array.isArray(modules)) return { ok: false, reason: "invalid_drill_modules" };
  const installed = new Set();
  for (const module of modules) {
    if (!DRILL_MODULES.includes(module)) {
      return { ok: false, reason: "unknown_drill_module", module };
    }
    if (installed.has(module)) {
      return { ok: false, reason: "duplicate_drill_module", module };
    }
    installed.add(module);
  }
  if (installed.has("fortune") && installed.has("silk_touch")) {
    return { ok: false, reason: "incompatible_drill_modules" };
  }
  return { ok: true, installed: [...installed] };
}

module.exports = { DRILL_MODES, DRILL_MODULES, inspectDrillMode, planDrillAction, validateDrillModules };

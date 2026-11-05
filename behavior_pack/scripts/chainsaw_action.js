"use strict";

const { runPoweredToolAction } = require("./powered_tool_action.js");

const CHAINSAW_ENERGY_PER_BLOCK = 150;
const CHAINSAW_VEIN_MAX_BLOCKS = 64;

/**
 * Plan one Chainsaw use. With Vein Miner disabled, only the targeted log is
 * included. When enabled, the runtime supplies the count of connected,
 * eligible log blocks found by its bounded tree scan.
 */
function planChainsawAction(veinMinerEnabled, eligibleBlockCount, maxBlocks = CHAINSAW_VEIN_MAX_BLOCKS) {
  if (typeof veinMinerEnabled !== "boolean") {
    return { ok: false, reason: "invalid_vein_miner_setting" };
  }
  if (!Number.isSafeInteger(eligibleBlockCount) || eligibleBlockCount < 0) {
    return { ok: false, reason: "invalid_eligible_block_count" };
  }
  if (!Number.isSafeInteger(maxBlocks) || maxBlocks < 1 || maxBlocks > CHAINSAW_VEIN_MAX_BLOCKS) {
    return { ok: false, reason: "invalid_vein_miner_limit" };
  }

  const limit = veinMinerEnabled ? maxBlocks : 1;
  const blockCount = Math.min(eligibleBlockCount, limit);
  return {
    ok: true,
    veinMinerEnabled,
    blockCount,
    energyRequired: blockCount * CHAINSAW_ENERGY_PER_BLOCK,
    canRun: blockCount > 0,
    maxBlocks: limit,
  };
}

/**
 * Run a prevalidated Chainsaw action through the shared persisted-energy gate.
 * The Bedrock runtime must supply the count of connected, valid log blocks
 * and perform the actual world edits/drop handling in the callback.
 */
function runChainsawAction(itemStack, veinMinerEnabled, eligibleBlockCount, action) {
  if (typeof action !== "function") {
    return { ok: false, reason: "invalid_tool_action" };
  }
  const plan = planChainsawAction(veinMinerEnabled, eligibleBlockCount);
  if (!plan.ok) return plan;
  if (!plan.canRun) return { ok: true, ran: false, reason: "no_eligible_blocks", plan };

  const powered = runPoweredToolAction(
    itemStack,
    "chainsaw",
    () => action(plan.blockCount, plan),
    plan.blockCount
  );
  return { ...powered, plan };
}

module.exports = {
  CHAINSAW_ENERGY_PER_BLOCK,
  CHAINSAW_VEIN_MAX_BLOCKS,
  planChainsawAction,
  runChainsawAction,
};

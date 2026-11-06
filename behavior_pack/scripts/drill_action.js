"use strict";

const { planDrillAction } = require("./drill_profiles.js");
const { runPoweredToolAction } = require("./powered_tool_action.js");
const { getVeinMinerEnabled } = require("./tool_settings.js");
const { scanConnectedBlocks, MAX_CONNECTED_BLOCKS } = require("./connected_block_scan.js");

/**
 * Ultimate Drill reads its saved Vein Miner preference when the final
 * argument is omitted. Basic/Advanced remain non-vein modes.
 */
function runDrillAction(itemStack, mode, eligibleBlockCount, action, veinMinerEnabled) {
  if (typeof action !== "function") return { ok: false, reason: "invalid_tool_action" };
  let enabled = veinMinerEnabled;
  if (enabled === undefined) {
    if (mode === "ultimate") {
      const saved = getVeinMinerEnabled(itemStack, "drill", mode);
      if (!saved.ok) return saved;
      enabled = saved.enabled;
    } else {
      enabled = false;
    }
  }
  const plan = planDrillAction(mode, eligibleBlockCount, enabled);
  if (!plan.ok) return plan;
  if (!plan.canRun) return { ok: true, ran: false, reason: "no_eligible_blocks", plan };
  if (mode === "basic") {
    try {
      return { ok: true, ran: true, consumed: 0, plan, actionResult: action(plan.blockCount, plan) };
    } catch {
      return { ok: false, ran: false, reason: "world_action_failed", plan };
    }
  }
  const powered = runPoweredToolAction(itemStack, "drill", () => action(plan.blockCount, plan), plan.blockCount);
  return { ...powered, plan };
}

/**
 * Scan a connected ore vein using the persisted Ultimate Drill setting.
 * The world adapter receives only the exact, bounded positions discovered.
 */
function runDrillVeinMinerScan(itemStack, scanOptions, action) {
  if (typeof action !== "function") return { ok: false, reason: "invalid_tool_action" };
  const saved = getVeinMinerEnabled(itemStack, "drill", "ultimate");
  if (!saved.ok) return saved;
  if (!saved.enabled) return { ok: true, ran: false, reason: "vein_miner_disabled" };
  if (!scanOptions || typeof scanOptions !== "object") return { ok: false, reason: "invalid_scan_options" };
  const scan = scanConnectedBlocks({
    ...scanOptions,
    connectivity: "face",
    maxBlocks: MAX_CONNECTED_BLOCKS,
  });
  if (!scan.ok) return scan;
  const result = runDrillAction(itemStack, "ultimate", scan.positions.length,
    (count, plan) => action(scan.positions.slice(0, count), plan), true);
  return { ...result, scan };
}

module.exports = { runDrillAction, runDrillVeinMinerScan };

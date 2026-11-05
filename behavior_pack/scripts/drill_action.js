"use strict";

const { planDrillAction } = require("./drill_profiles.js");
const { runPoweredToolAction } = require("./powered_tool_action.js");
const { getVeinMinerEnabled } = require("./tool_settings.js");

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

module.exports = { runDrillAction };

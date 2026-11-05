"use strict";

const { planDrillAction } = require("./drill_profiles.js");
const { runPoweredToolAction } = require("./powered_tool_action.js");

/**
 * Execute a prevalidated drill action through the shared battery safety gate.
 * The runtime must supply only blocks already checked for permissions and
 * tool compatibility; this adapter does not edit the world itself.
 */
function runDrillAction(itemStack, mode, eligibleBlockCount, action) {
  if (typeof action !== "function") {
    return { ok: false, reason: "invalid_tool_action" };
  }
  const plan = planDrillAction(mode, eligibleBlockCount);
  if (!plan.ok) return plan;
  if (!plan.canRun) return { ok: true, ran: false, reason: "no_eligible_blocks", plan };

  if (mode === "basic") {
    try {
      return { ok: true, ran: true, consumed: 0, plan, actionResult: action(plan.blockCount) };
    } catch {
      return { ok: false, ran: false, reason: "world_action_failed", plan };
    }
  }

  const powered = runPoweredToolAction(itemStack, "drill", () => action(plan.blockCount), plan.blockCount);
  return { ...powered, plan };
}

module.exports = { runDrillAction };

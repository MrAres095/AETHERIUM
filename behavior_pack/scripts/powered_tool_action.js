"use strict";

const { consumeToolEnergy } = require("./energy_ledger.js");
const { mutateToolBatteryItem } = require("./tool_battery_state.js");

/**
 * Spend and persist energy before a destructive world action is attempted.
 * This intentionally favors item/world safety over refunding energy when an
 * engine callback fails: a failed action can cost energy, but cannot duplicate
 * blocks or drops by replaying an uncommitted charge state.
 */
function runPoweredToolAction(itemStack, toolId, action, uses = 1) {
  if (typeof action !== "function") {
    return { ok: false, reason: "invalid_tool_action" };
  }

  const spent = mutateToolBatteryItem(itemStack, toolId,
    battery => consumeToolEnergy(battery, uses));

  if (!spent.ok) {
    return { ok: false, reason: spent.reason, battery: spent.battery };
  }
  if (!spent.operation.canRun) {
    return {
      ok: true,
      ran: false,
      reason: "insufficient_charge",
      required: spent.operation.required,
      stored: spent.battery.stored,
      battery: spent.battery,
    };
  }

  let actionResult;
  try {
    actionResult = action();
  } catch {
    return {
      ok: false,
      ran: false,
      reason: "world_action_failed_energy_spent",
      battery: spent.battery,
    };
  }

  return {
    ok: true,
    ran: true,
    consumed: spent.operation.consumed,
    battery: spent.battery,
    actionResult,
  };
}

module.exports = { runPoweredToolAction };

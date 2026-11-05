"use strict";

const { runPoweredToolAction } = require("./powered_tool_action.js");

/**
 * Run one chainsaw operation through the shared persisted-energy gate.
 * The runtime callback is responsible for checking the target block,
 * permissions, range, tool compatibility and vanilla drop behavior.
 *
 * One operation costs the Chainsaw profile's 150 AEU. Tree-felling,
 * multi-block cutting and speed behavior are intentionally left to the
 * eventual Bedrock runtime rather than guessed by this engine-independent
 * adapter.
 */
function runChainsawAction(itemStack, action) {
  if (typeof action !== "function") {
    return { ok: false, reason: "invalid_tool_action" };
  }
  return runPoweredToolAction(itemStack, "chainsaw", action, 1);
}

module.exports = { runChainsawAction };

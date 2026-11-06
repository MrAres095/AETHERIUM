"use strict";

const MAX_ACTION_BLOCKS = 64;

function validPosition(position) {
  return position && Number.isSafeInteger(position.x) &&
    Number.isSafeInteger(position.y) && Number.isSafeInteger(position.z);
}

function positionKey(position) {
  return position.x + "," + position.y + "," + position.z;
}

/**
 * Safety gate for a previously scanned list of coordinates.
 * It preflights every block and permission before making the first edit,
 * then revalidates each block/permission immediately before the edit.
 * The supplied breakBlock callback owns Bedrock-specific drops and effects.
 */
function executeScannedBlockAction(scan, options = {}) {
  const { getBlockAt, isEligible, canBreak, breakBlock } = options;
  if (!scan || scan.ok !== true || !Array.isArray(scan.positions) ||
      scan.positions.length < 1 || scan.positions.length > MAX_ACTION_BLOCKS) {
    return { ok: false, executed: 0, reason: "invalid_scan_result" };
  }
  if (typeof getBlockAt !== "function" || typeof isEligible !== "function" ||
      typeof canBreak !== "function" || typeof breakBlock !== "function") {
    return { ok: false, executed: 0, reason: "invalid_action_callbacks" };
  }

  const seen = new Set();
  const preflight = [];
  try {
    for (let index = 0; index < scan.positions.length; index++) {
      const position = scan.positions[index];
      if (!validPosition(position)) {
        return { ok: false, executed: 0, reason: "invalid_position", index };
      }
      const key = positionKey(position);
      if (seen.has(key)) {
        return { ok: false, executed: 0, reason: "duplicate_position", index };
      }
      seen.add(key);
      const block = getBlockAt(position.x, position.y, position.z);
      if (!block || !isEligible(block, position, index)) {
        return { ok: false, executed: 0, reason: "block_changed_or_ineligible", index };
      }
      if (canBreak(block, position, index) !== true) {
        return { ok: false, executed: 0, reason: "protection_denied", index };
      }
      preflight.push({ position: { x: position.x, y: position.y, z: position.z }, block });
    }
  } catch {
    return { ok: false, executed: 0, reason: "preflight_callback_failed" };
  }

  let executed = 0;
  for (let index = 0; index < preflight.length; index++) {
    const { position, block: expectedBlock } = preflight[index];
    try {
      const currentBlock = getBlockAt(position.x, position.y, position.z);
      if (!currentBlock || !isEligible(currentBlock, position, index)) {
        return { ok: false, executed, reason: "block_changed_during_action", index };
      }
      if (canBreak(currentBlock, position, index) !== true) {
        return { ok: false, executed, reason: "protection_changed_during_action", index };
      }
      if (breakBlock(position, currentBlock, expectedBlock) === false) {
        return { ok: false, executed, reason: "block_action_rejected", index };
      }
      executed++;
    } catch {
      return { ok: false, executed, reason: "block_action_failed", index };
    }
  }
  return { ok: true, executed };
}

module.exports = { MAX_ACTION_BLOCKS, executeScannedBlockAction };

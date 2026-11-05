"use strict";

const MAX_CONNECTED_BLOCKS = 64;
const DIRECTIONS = Object.freeze({
  face: Object.freeze([[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]),
  all: Object.freeze(Array.from({ length: 3 }, (_, ix) => ix - 1).flatMap(dx =>
    Array.from({ length: 3 }, (_, iy) => iy - 1).flatMap(dy =>
      Array.from({ length: 3 }, (_, iz) => iz - 1)
        .filter(dz => dx !== 0 || dy !== 0 || dz !== 0)
        .map(dz => [dx, dy, dz])))),
});

function validPosition(p) {
  return p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y) && Number.isSafeInteger(p.z);
}
function key(p) { return p.x + "," + p.y + "," + p.z; }

/** Read-only deterministic breadth-first scan; engine-specific callbacks are supplied by the runtime. */
function scanConnectedBlocks(options = {}) {
  const { origin, getBlockAt, isEligible, connectivity = "face", maxBlocks = MAX_CONNECTED_BLOCKS } = options;
  if (!validPosition(origin)) return { ok: false, reason: "invalid_origin" };
  if (typeof getBlockAt !== "function" || typeof isEligible !== "function") return { ok: false, reason: "invalid_scanner_callbacks" };
  if (!Object.prototype.hasOwnProperty.call(DIRECTIONS, connectivity)) return { ok: false, reason: "invalid_connectivity" };
  if (!Number.isSafeInteger(maxBlocks) || maxBlocks < 1 || maxBlocks > MAX_CONNECTED_BLOCKS) return { ok: false, reason: "invalid_block_limit" };

  const directions = DIRECTIONS[connectivity];
  const queue = [{ x: origin.x, y: origin.y, z: origin.z }];
  const visited = new Set();
  const positions = [];
  let originBlock;

  while (queue.length && positions.length < maxBlocks) {
    const p = queue.shift();
    const k = key(p);
    if (visited.has(k)) continue;
    visited.add(k);
    let block;
    try {
      block = getBlockAt(p.x, p.y, p.z);
      if (positions.length === 0) {
        originBlock = block;
        if (!block || !isEligible(block, block, p)) {
          return { ok: true, positions: [], visited: visited.size, reason: "origin_not_eligible" };
        }
      } else if (!block || !isEligible(block, originBlock, p)) {
        continue;
      }
    } catch {
      return { ok: false, reason: "scanner_callback_failed", visited: visited.size };
    }

    positions.push({ x: p.x, y: p.y, z: p.z });
    for (const [dx, dy, dz] of directions) {
      const next = { x: p.x + dx, y: p.y + dy, z: p.z + dz };
      if (!visited.has(key(next))) queue.push(next);
    }
  }
  return { ok: true, positions, visited: visited.size, truncated: positions.length === maxBlocks && queue.length > 0 };
}

module.exports = { MAX_CONNECTED_BLOCKS, scanConnectedBlocks };

"use strict";

const SIDES = Object.freeze(["north", "south", "east", "west", "up", "down"]);
const SIDE_OFFSETS = Object.freeze({
  north: Object.freeze({ x: 0, y: 0, z: -1 }),
  south: Object.freeze({ x: 0, y: 0, z: 1 }),
  east: Object.freeze({ x: 1, y: 0, z: 0 }),
  west: Object.freeze({ x: -1, y: 0, z: 0 }),
  up: Object.freeze({ x: 0, y: 1, z: 0 }),
  down: Object.freeze({ x: 0, y: -1, z: 0 }),
});

const DEFAULTS = Object.freeze({
  enabled: true,
  targetFace: "north",
  intervalTicks: 20,
  maxStacks: 4,
  maxItems: 64,
  filter: Object.freeze({ mode: "blacklist", itemIds: Object.freeze([]) }),
});

function isValidFilter(filter) {
  return !!filter &&
    (filter.mode === "whitelist" || filter.mode === "blacklist") &&
    Array.isArray(filter.itemIds) &&
    filter.itemIds.every(id => typeof id === "string" &&
      /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id)) &&
    new Set(filter.itemIds).size === filter.itemIds.length;
}

/**
 * Validates and returns a detached, serializable machine configuration.
 * Invalid values are rejected rather than silently changing player settings.
 */
function normalizeLogisticsConfig(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "invalid_config" };
  }
  const config = { ...DEFAULTS, ...input };
  if (typeof config.enabled !== "boolean") {
    return { ok: false, reason: "invalid_enabled_flag" };
  }
  if (!SIDES.includes(config.targetFace)) {
    return { ok: false, reason: "invalid_target_face" };
  }
  if (!Number.isSafeInteger(config.intervalTicks) ||
      config.intervalTicks < 1 || config.intervalTicks > 1200) {
    return { ok: false, reason: "invalid_interval" };
  }
  if (!Number.isSafeInteger(config.maxStacks) ||
      config.maxStacks < 1 || config.maxStacks > 16) {
    return { ok: false, reason: "invalid_stack_limit" };
  }
  if (!Number.isSafeInteger(config.maxItems) ||
      config.maxItems < 1 || config.maxItems > 256) {
    return { ok: false, reason: "invalid_item_limit" };
  }
  if (!isValidFilter(config.filter)) {
    return { ok: false, reason: "invalid_filter" };
  }
  return {
    ok: true,
    config: {
      enabled: config.enabled,
      targetFace: config.targetFace,
      intervalTicks: config.intervalTicks,
      maxStacks: config.maxStacks,
      maxItems: config.maxItems,
      filter: { mode: config.filter.mode, itemIds: [...config.filter.itemIds] },
    },
  };
}

function getAdjacentOffset(face) {
  const offset = SIDE_OFFSETS[face];
  return offset ? { ...offset } : null;
}

/** The caller supplies the world's tick count; no timers or engine globals are used. */
function shouldRunTransfer(tick, config) {
  if (!Number.isSafeInteger(tick) || tick < 0) return false;
  const normalized = normalizeLogisticsConfig(config);
  if (!normalized.ok || !normalized.config.enabled) return false;
  return tick % normalized.config.intervalTicks === 0;
}

module.exports = {
  SIDES,
  DEFAULTS,
  normalizeLogisticsConfig,
  getAdjacentOffset,
  shouldRunTransfer,
};

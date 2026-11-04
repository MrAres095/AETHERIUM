"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SIDES,
  normalizeLogisticsConfig,
  getAdjacentOffset,
  shouldRunTransfer,
} = require("../behavior_pack/scripts/logistics_config.js");

test("default logistics configuration is safe and serializable", () => {
  const result = normalizeLogisticsConfig();
  assert.equal(result.ok, true);
  assert.deepEqual(result.config, {
    enabled: true,
    targetFace: "north",
    intervalTicks: 20,
    maxStacks: 4,
    maxItems: 64,
    filter: { mode: "blacklist", itemIds: [] },
  });
});

test("all six adjacent faces map to one-block offsets", () => {
  assert.deepEqual(SIDES, ["north", "south", "east", "west", "up", "down"]);
  for (const face of SIDES) {
    const offset = getAdjacentOffset(face);
    assert.equal(Math.abs(offset.x) + Math.abs(offset.y) + Math.abs(offset.z), 1);
  }
  assert.equal(getAdjacentOffset("diagonal"), null);
});

test("player filter settings are copied and cannot mutate the input", () => {
  const ids = ["minecraft:iron_ingot", "minecraft:gold_ingot"];
  const input = { targetFace: "east", filter: { mode: "whitelist", itemIds: ids } };
  const result = normalizeLogisticsConfig(input);
  assert.equal(result.ok, true);
  result.config.filter.itemIds.push("minecraft:diamond");
  assert.deepEqual(ids, ["minecraft:iron_ingot", "minecraft:gold_ingot"]);
});

test("invalid sides, item identifiers and duplicate filter entries are rejected", () => {
  assert.equal(normalizeLogisticsConfig({ targetFace: "diagonal" }).reason, "invalid_target_face");
  assert.equal(normalizeLogisticsConfig({ filter: { mode: "whitelist", itemIds: ["iron_ingot"] } }).reason, "invalid_filter");
  assert.equal(normalizeLogisticsConfig({ filter: { mode: "blacklist", itemIds: ["minecraft:stone", "minecraft:stone"] } }).reason, "invalid_filter");
});

test("transfer limits and interval are bounded", () => {
  assert.equal(normalizeLogisticsConfig({ intervalTicks: 0 }).reason, "invalid_interval");
  assert.equal(normalizeLogisticsConfig({ intervalTicks: 1201 }).reason, "invalid_interval");
  assert.equal(normalizeLogisticsConfig({ maxStacks: 17 }).reason, "invalid_stack_limit");
  assert.equal(normalizeLogisticsConfig({ maxItems: 257 }).reason, "invalid_item_limit");
});

test("transfer scheduler respects enabled flag and configured interval", () => {
  const config = { enabled: true, intervalTicks: 20 };
  assert.equal(shouldRunTransfer(40, config), true);
  assert.equal(shouldRunTransfer(41, config), false);
  assert.equal(shouldRunTransfer(40, { ...config, enabled: false }), false);
  assert.equal(shouldRunTransfer(-1, config), false);
  assert.equal(shouldRunTransfer(1.5, config), false);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TOOL_SETTINGS_KEY, createDefaultToolSettings, serializeToolSettings,
  deserializeToolSettings, readToolSettingsFromItem, writeToolSettingsToItem,
  setVeinMinerEnabled, getVeinMinerEnabled,
} = require("../behavior_pack/scripts/tool_settings.js");

function makeItem(raw) {
  const props = new Map();
  if (raw !== undefined) props.set(TOOL_SETTINGS_KEY, raw);
  return {
    getDynamicProperty(key) { return props.get(key); },
    setDynamicProperty(key, value) { props.set(key, value); },
  };
}

test("new Chainsaw and Ultimate Drill settings default Vein Miner OFF", () => {
  assert.equal(createDefaultToolSettings("chainsaw").settings.veinMinerEnabled, false);
  assert.equal(createDefaultToolSettings("drill").settings.veinMinerEnabled, false);
  assert.equal(getVeinMinerEnabled(makeItem(), "chainsaw").enabled, false);
  assert.equal(getVeinMinerEnabled(makeItem(), "drill", "ultimate").enabled, false);
});
test("toggle persists on the ItemStack and survives a read", () => {
  const item = makeItem();
  assert.equal(setVeinMinerEnabled(item, "chainsaw", true).ok, true);
  assert.equal(getVeinMinerEnabled(item, "chainsaw").enabled, true);
});
test("toggle can be switched off again", () => {
  const item = makeItem();
  setVeinMinerEnabled(item, "drill", true, "ultimate");
  assert.equal(setVeinMinerEnabled(item, "drill", false, "ultimate").ok, true);
  assert.equal(getVeinMinerEnabled(item, "drill", "ultimate").enabled, false);
});
test("Basic and Advanced drills cannot enable or read Vein Miner", () => {
  const item = makeItem();
  assert.equal(setVeinMinerEnabled(item, "drill", true, "basic").reason, "vein_miner_unavailable");
  assert.equal(getVeinMinerEnabled(item, "drill", "advanced").reason, "vein_miner_unavailable");
});
test("missing state uses safe OFF default without writing to the item", () => {
  const item = makeItem();
  const result = readToolSettingsFromItem(item, "chainsaw");
  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.settings.veinMinerEnabled, false);
  assert.equal(item.getDynamicProperty(TOOL_SETTINGS_KEY), undefined);
});
test("wrong tool identity and unsupported tool are rejected", () => {
  const item = makeItem();
  setVeinMinerEnabled(item, "chainsaw", true);
  assert.equal(getVeinMinerEnabled(item, "drill").reason, "invalid_tool_settings");
  assert.equal(getVeinMinerEnabled(item, "pickaxe").reason, "unsupported_tool");
});
test("malformed, oversized and unsupported schema payloads are rejected", () => {
  assert.equal(deserializeToolSettings("{", "chainsaw").reason, "malformed_persistent_state");
  assert.equal(deserializeToolSettings("x".repeat(257), "chainsaw").reason, "invalid_persistent_state");
  assert.equal(deserializeToolSettings(JSON.stringify({schema:99,toolId:"chainsaw",veinMinerEnabled:true}), "chainsaw").reason, "invalid_tool_settings");
});
test("non-boolean toggle values are rejected without changing saved state", () => {
  const item = makeItem();
  assert.equal(setVeinMinerEnabled(item, "chainsaw", "yes").reason, "invalid_vein_miner_setting");
  assert.equal(getVeinMinerEnabled(item, "chainsaw").enabled, false);
});
test("invalid item adapters fail safely", () => {
  assert.equal(readToolSettingsFromItem({}, "chainsaw").reason, "item_dynamic_properties_unavailable");
  assert.equal(writeToolSettingsToItem({}, createDefaultToolSettings("chainsaw").settings, "chainsaw").reason, "item_dynamic_properties_unavailable");
});
test("serialization validates identity and settings before encoding", () => {
  const valid = createDefaultToolSettings("chainsaw").settings;
  assert.equal(JSON.parse(serializeToolSettings(valid, "chainsaw").state).veinMinerEnabled, false);
  assert.equal(serializeToolSettings(valid, "drill").reason, "invalid_tool_settings");
});

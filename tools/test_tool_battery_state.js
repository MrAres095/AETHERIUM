"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createToolBattery, consumeToolEnergy, chargeToolAtStation, createBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const {
  TOOL_BATTERY_STATE_KEY,
  serializeToolBattery,
  deserializeToolBattery,
  getToolBatteryItemProperty,
  readToolBatteryFromItem,
  writeToolBatteryToItem,
  mutateToolBatteryItem,
} = require("../behavior_pack/scripts/tool_battery_state.js");

test("charged battery retains exact AEU after serialization and restoration", () => {
  const original = createToolBattery("drill", 12345).battery;
  const saved = serializeToolBattery(original);
  assert.equal(saved.ok, true);
  const restored = deserializeToolBattery(saved.state, "drill");
  assert.equal(restored.ok, true);
  assert.equal(restored.created, false);
  assert.equal(restored.battery.stored, 12345);
  assert.equal(restored.battery.capacity, 20000);
});

test("empty state creates a new empty battery only when no saved state exists", () => {
  const restored = deserializeToolBattery(undefined, "chainsaw");
  assert.equal(restored.ok, true);
  assert.equal(restored.created, true);
  assert.equal(restored.battery.stored, 0);
});

test("removing, moving and reinserting a tool preserves its item-owned charge", () => {
  const charged = createToolBattery("drill", 8000).battery;
  const itemProperty = getToolBatteryItemProperty(charged);
  assert.equal(itemProperty.key, TOOL_BATTERY_STATE_KEY);

  // Moving the item between inventory slots does not alter its serialized item data.
  const removedFromSlot = itemProperty.value;
  const insertedIntoAnotherSlot = removedFromSlot;
  const restored = deserializeToolBattery(insertedIntoAnotherSlot, "drill");

  assert.equal(restored.ok, true);
  assert.equal(restored.battery.stored, 8000);
});

test("charge and use operations persist their returned battery state", () => {
  const station = createBattery(1, 1000).battery;
  const emptyTool = createToolBattery("drill", 0).battery;
  const charged = chargeToolAtStation(station, emptyTool, 200);
  assert.equal(charged.tool.stored, 200);

  const used = consumeToolEnergy(charged.tool, 1);
  assert.equal(used.canRun, true);
  assert.equal(used.battery.stored, 100);

  const saved = serializeToolBattery(used.battery);
  const restored = deserializeToolBattery(saved.state, "drill");
  assert.equal(restored.battery.stored, 100);
});

test("malformed, unsupported, mismatched and tampered states are rejected", () => {
  assert.equal(deserializeToolBattery("{", "drill").reason, "malformed_persistent_state");
  assert.equal(deserializeToolBattery(JSON.stringify({ schema: 99, toolId: "drill", stored: 5 }), "drill").reason,
    "unsupported_persistent_schema");
  assert.equal(deserializeToolBattery(JSON.stringify({ schema: 1, toolId: "chainsaw", stored: 5 }), "drill").reason,
    "tool_identity_mismatch");
  assert.equal(deserializeToolBattery(JSON.stringify({ schema: 1, toolId: "drill", stored: 20001 }), "drill").reason,
    "invalid_stored_energy");
  assert.equal(deserializeToolBattery({ schema: 1, toolId: "drill", stored: 5 }, "drill").reason,
    "invalid_persistent_state_type");
});

test("serialization refuses invalid or tampered in-memory batteries", () => {
  const battery = createToolBattery("drill", 500).battery;
  assert.equal(serializeToolBattery({ ...battery, capacity: 999999 }).reason, "invalid_tool_battery");
});


test("Bedrock ItemStack adapter stores and restores charge on the item itself", () => {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  const initial = createToolBattery("drill", 7654).battery;
  assert.equal(writeToolBatteryToItem(item, initial).ok, true);
  const restored = readToolBatteryFromItem(item, "drill");
  assert.equal(restored.ok, true);
  assert.equal(restored.battery.stored, 7654);
});

test("ItemStack energy mutation is saved after use and failed operations do not overwrite state", () => {
  const properties = new Map();
  const item = {
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
  writeToolBatteryToItem(item, createToolBattery("chainsaw", 900).battery);
  const used = mutateToolBatteryItem(item, "chainsaw", battery => consumeToolEnergy(battery, 1));
  assert.equal(used.ok, true);
  assert.equal(readToolBatteryFromItem(item, "chainsaw").battery.stored, 750);

  const beforeFailure = properties.get(TOOL_BATTERY_STATE_KEY);
  const failed = mutateToolBatteryItem(item, "chainsaw", () => ({ ok: false, reason: "no_energy" }));
  assert.equal(failed.ok, false);
  assert.equal(properties.get(TOOL_BATTERY_STATE_KEY), beforeFailure);
});

test("ItemStack adapter refuses unsupported objects and preserves state on write failure", () => {
  assert.equal(readToolBatteryFromItem({}, "drill").reason, "item_dynamic_properties_unavailable");
  assert.equal(writeToolBatteryToItem({}, createToolBattery("drill", 10).battery).reason,
    "item_dynamic_properties_unavailable");
  const item = {
    getDynamicProperty() { return undefined; },
    setDynamicProperty() { throw new Error("write rejected"); },
  };
  const result = mutateToolBatteryItem(item, "drill", battery => ({ ok: true, battery }));
  assert.equal(result.reason, "item_state_write_failed");
});

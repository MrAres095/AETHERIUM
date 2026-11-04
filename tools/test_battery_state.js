"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery, chargeBattery, dischargeBattery } = require("../behavior_pack/scripts/energy_ledger.js");
const {
  BATTERY_STATE_KEY,
  serializeBattery,
  deserializeBattery,
  readBatteryFromItem,
  writeBatteryToItem,
  mutateBatteryItem,
} = require("../behavior_pack/scripts/battery_state.js");

function makeItem(initial) {
  const properties = new Map(initial ? [[BATTERY_STATE_KEY, initial]] : []);
  return {
    properties,
    getDynamicProperty(key) { return properties.get(key); },
    setDynamicProperty(key, value) { properties.set(key, value); },
  };
}

test("battery charge survives removal and placement through item state", () => {
  const charged = chargeBattery(createBattery(1).battery, 500).battery;
  const droppedItem = makeItem();
  assert.equal(writeBatteryToItem(droppedItem, charged).ok, true);
  const placed = readBatteryFromItem(droppedItem, 1);
  assert.equal(placed.ok, true);
  assert.equal(placed.battery.stored, 500);
  assert.equal(placed.battery.capacity, 100000);
});

test("battery tiers cannot be swapped to inherit another tier's charge", () => {
  const item = makeItem(serializeBattery(createBattery(2, 42000).battery).state);
  assert.equal(readBatteryFromItem(item, 1).reason, "battery_tier_mismatch");
  assert.equal(readBatteryFromItem(item, 2).battery.stored, 42000);
});

test("missing state creates a fresh empty battery, malformed state never resets it", () => {
  assert.equal(deserializeBattery(undefined, 1).battery.stored, 0);
  assert.equal(deserializeBattery("{", 1).reason, "malformed_persistent_state");
  assert.equal(deserializeBattery(JSON.stringify({ schema: 99, tier: 1, stored: 500 }), 1).reason,
    "unsupported_persistent_schema");
});

test("invalid or oversized stored charge is rejected", () => {
  assert.equal(deserializeBattery(JSON.stringify({ schema: 1, tier: 1, stored: 100001 }), 1)
    .reason, "invalid_stored_energy");
  assert.equal(deserializeBattery("x".repeat(4097), 1).reason, "battery_state_too_large");
  assert.equal(serializeBattery({ ...createBattery(1).battery, capacity: 1 }).reason, "invalid_battery");
});

test("mutations persist charge changes on the same item", () => {
  const item = makeItem(serializeBattery(createBattery(1, 500).battery).state);
  const used = mutateBatteryItem(item, 1, battery => dischargeBattery(battery, 200));
  assert.equal(used.ok, true);
  assert.equal(used.battery.stored, 300);
  assert.equal(readBatteryFromItem(item, 1).battery.stored, 300);
});

test("failed mutation and failed property writes do not claim persistence", () => {
  const item = makeItem(serializeBattery(createBattery(1, 300).battery).state);
  const before = item.properties.get(BATTERY_STATE_KEY);
  assert.equal(mutateBatteryItem(item, 1, () => { throw new Error("no"); }).reason,
    "battery_operation_failed");
  assert.equal(item.properties.get(BATTERY_STATE_KEY), before);
  const broken = {
    getDynamicProperty() { return before; },
    setDynamicProperty() { throw new Error("read only"); },
  };
  assert.equal(mutateBatteryItem(broken, 1, battery => chargeBattery(battery, 50))
    .reason, "item_state_write_failed");
  assert.equal(item.properties.get(BATTERY_STATE_KEY), before);
});

test("battery item adapters fail closed when dynamic properties are unavailable", () => {
  assert.equal(readBatteryFromItem({}, 1).reason, "item_dynamic_properties_unavailable");
  assert.equal(writeBatteryToItem({}, createBattery(1).battery).reason,
    "item_dynamic_properties_unavailable");
});

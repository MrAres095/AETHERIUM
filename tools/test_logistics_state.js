"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STATE_VERSION,
  BUFFER_SLOT_COUNT,
  createLogisticsMachineState,
  serializeLogisticsMachineState,
  deserializeLogisticsMachineState,
  updateLogisticsMachineConfig,
  updateLogisticsMachineBuffer,
} = require("../behavior_pack/scripts/logistics_state.js");

test("creates an empty persistent state for either logistics machine", () => {
  for (const id of ["aetherium:item_extractor", "aetherium:item_inserter"]) {
    const result = createLogisticsMachineState(id);
    assert.equal(result.ok, true);
    assert.equal(result.state.version, STATE_VERSION);
    assert.equal(result.state.bufferSlots.length, BUFFER_SLOT_COUNT);
    assert.ok(result.state.bufferSlots.every(slot => slot === null));
  }
});

test("unknown machine identifiers and malformed buffers are rejected", () => {
  assert.equal(createLogisticsMachineState("aetherium:unknown").reason, "unknown_machine_id");
  assert.equal(createLogisticsMachineState("aetherium:item_extractor", {
    bufferSlots: [null],
  }).reason, "invalid_buffer_slot_count");
  const slots = Array(BUFFER_SLOT_COUNT).fill(null);
  slots[2] = { typeId: "minecraft:stone", amount: 65 };
  assert.equal(createLogisticsMachineState("aetherium:item_extractor", {
    bufferSlots: slots,
  }).reason, "invalid_buffer_slot");
});

test("state serialization round-trips configuration and buffered items", () => {
  const slots = Array(BUFFER_SLOT_COUNT).fill(null);
  slots[0] = { typeId: "minecraft:iron_ingot", amount: 12, maxAmount: 64 };
  const created = createLogisticsMachineState("aetherium:item_inserter", {
    config: {
      targetFace: "west",
      filter: { mode: "whitelist", itemIds: ["minecraft:iron_ingot"] },
    },
    bufferSlots: slots,
  });
  const encoded = serializeLogisticsMachineState(created.state);
  assert.equal(encoded.ok, true);
  const decoded = deserializeLogisticsMachineState(encoded.value);
  assert.deepEqual(decoded, created);
});

test("mutating a returned state never changes the original state", () => {
  const created = createLogisticsMachineState("aetherium:item_extractor");
  const slots = Array(BUFFER_SLOT_COUNT).fill(null);
  slots[0] = { typeId: "minecraft:coal", amount: 8 };
  const updated = updateLogisticsMachineBuffer(created.state, slots);
  assert.equal(updated.ok, true);
  updated.state.bufferSlots[0].amount = 1;
  assert.equal(created.state.bufferSlots[0], null);
  assert.equal(slots[0].amount, 8);
});

test("config updates preserve the existing buffer", () => {
  const slots = Array(BUFFER_SLOT_COUNT).fill(null);
  slots[4] = { typeId: "minecraft:gold_ingot", amount: 3 };
  const created = createLogisticsMachineState("aetherium:item_extractor", { bufferSlots: slots });
  const updated = updateLogisticsMachineConfig(created.state, { targetFace: "up" });
  assert.equal(updated.ok, true);
  assert.equal(updated.state.config.targetFace, "up");
  assert.deepEqual(updated.state.bufferSlots, created.state.bufferSlots);
});

test("buffer updates preserve the machine configuration", () => {
  const created = createLogisticsMachineState("aetherium:item_inserter", {
    config: { targetFace: "south", maxItems: 24 },
  });
  const slots = Array(BUFFER_SLOT_COUNT).fill(null);
  slots[1] = { typeId: "minecraft:oak_log", amount: 5 };
  const updated = updateLogisticsMachineBuffer(created.state, slots);
  assert.equal(updated.ok, true);
  assert.equal(updated.state.config.targetFace, "south");
  assert.equal(updated.state.config.maxItems, 24);
});

test("corrupt, oversized and unsupported-version states fail closed", () => {
  assert.equal(deserializeLogisticsMachineState("{").reason, "malformed_serialized_state");
  assert.equal(deserializeLogisticsMachineState("x".repeat(65537)).reason, "invalid_serialized_state");
  const future = JSON.stringify({ version: STATE_VERSION + 1 });
  assert.equal(deserializeLogisticsMachineState(future).reason, "unsupported_state_version");
});

test("invalid configuration updates leave no partially modified state", () => {
  const created = createLogisticsMachineState("aetherium:item_extractor");
  const result = updateLogisticsMachineConfig(created.state, { targetFace: "diagonal" });
  assert.equal(result.ok, false);
  assert.equal(created.state.config.targetFace, "north");
});

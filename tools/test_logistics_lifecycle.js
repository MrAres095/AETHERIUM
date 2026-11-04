"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogisticsMachineState, deserializeLogisticsMachineState } =
  require("../behavior_pack/scripts/logistics_state.js");
const {
  handOffLogisticsStateOnBreak,
  restoreLogisticsStateOnPlacement,
} = require("../behavior_pack/scripts/logistics_lifecycle.js");

function lifecycleAdapters(initialPayload = null, initialState = null) {
  const events = [];
  let payload = initialPayload;
  let state = initialState;
  const droppedItem = {
    writePayload(value) { events.push("write-payload"); payload = value; },
    readPayload() { events.push("read-payload"); return payload; },
    clearPayload() { events.push("clear-payload"); payload = null; },
    payload() { return payload; },
  };
  const machineStorage = {
    clearState() { events.push("clear-state"); state = null; },
    writeState(value) { events.push("write-state"); state = value; },
    state() { return state; },
  };
  return { events, droppedItem, machineStorage };
}

test("breaking writes the item payload before clearing machine storage", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    bufferSlots: [{ typeId: "minecraft:iron_ingot", amount: 9 }, ...Array(8).fill(null)],
  }).state;
  const adapters = lifecycleAdapters(null, "saved");
  const result = handOffLogisticsStateOnBreak(state, adapters.droppedItem, adapters.machineStorage);
  assert.equal(result.ok, true);
  assert.deepEqual(adapters.events, ["write-payload", "clear-state"]);
  assert.equal(adapters.machineStorage.state(), null);
  assert.ok(adapters.droppedItem.payload());
});

test("failed payload write leaves machine storage untouched", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const adapters = lifecycleAdapters(null, "saved");
  adapters.droppedItem.writePayload = () => { throw new Error("inventory full"); };
  const result = handOffLogisticsStateOnBreak(state, adapters.droppedItem, adapters.machineStorage);
  assert.equal(result.reason, "drop_payload_write_failed");
  assert.equal(adapters.machineStorage.state(), "saved");
});

test("failed state clear compensates by removing the staged drop payload", () => {
  const state = createLogisticsMachineState("aetherium:item_inserter").state;
  const adapters = lifecycleAdapters(null, "saved");
  adapters.machineStorage.clearState = () => { throw new Error("storage error"); };
  const result = handOffLogisticsStateOnBreak(state, adapters.droppedItem, adapters.machineStorage);
  assert.equal(result.reason, "machine_state_clear_failed");
  assert.equal(result.rolledBack, true);
  assert.equal(adapters.droppedItem.payload(), null);
});

test("placement writes validated state before consuming the item payload", () => {
  const state = createLogisticsMachineState("aetherium:item_inserter", {
    config: { targetFace: "south" },
    bufferSlots: [{ typeId: "minecraft:coal", amount: 12 }, ...Array(8).fill(null)],
  }).state;
  const source = lifecycleAdapters();
  const payload = require("../behavior_pack/scripts/logistics_state.js")
    .createLogisticsDropPayload(state);
  source.droppedItem.writePayload(payload.value);
  source.events.length = 0;

  const result = restoreLogisticsStateOnPlacement(
    source.droppedItem, source.machineStorage, "aetherium:item_inserter",
  );
  assert.equal(result.ok, true);
  assert.deepEqual(source.events, ["read-payload", "write-state", "clear-payload"]);
  const restored = deserializeLogisticsMachineState(source.machineStorage.state());
  assert.deepEqual(restored.state, state);
  assert.equal(source.droppedItem.payload(), null);
});

test("placement refuses wrong machine type and does not write or consume payload", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const payload = require("../behavior_pack/scripts/logistics_state.js")
    .createLogisticsDropPayload(state);
  const adapters = lifecycleAdapters(payload.value);
  const result = restoreLogisticsStateOnPlacement(
    adapters.droppedItem, adapters.machineStorage, "aetherium:item_inserter",
  );
  assert.equal(result.reason, "drop_machine_type_mismatch");
  assert.deepEqual(adapters.events, ["read-payload"]);
});

test("placement storage failure preserves the item payload for retry", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const payload = require("../behavior_pack/scripts/logistics_state.js")
    .createLogisticsDropPayload(state);
  const adapters = lifecycleAdapters(payload.value);
  adapters.machineStorage.writeState = () => { throw new Error("write failed"); };
  const result = restoreLogisticsStateOnPlacement(
    adapters.droppedItem, adapters.machineStorage, "aetherium:item_extractor",
  );
  assert.equal(result.reason, "machine_state_write_failed");
  assert.ok(adapters.droppedItem.payload());
  assert.deepEqual(adapters.events, ["read-payload"]);
});

test("payload clear failure is reported for explicit placement reconciliation", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const payload = require("../behavior_pack/scripts/logistics_state.js")
    .createLogisticsDropPayload(state);
  const adapters = lifecycleAdapters(payload.value);
  adapters.droppedItem.clearPayload = () => { throw new Error("cannot clear"); };
  const result = restoreLogisticsStateOnPlacement(
    adapters.droppedItem, adapters.machineStorage, "aetherium:item_extractor",
  );
  assert.equal(result.reason, "placement_reconciliation_required");
  assert.equal(result.stateWritten, true);
  assert.equal(result.payloadMayRemain, true);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogisticsMachineState } = require("../behavior_pack/scripts/logistics_state.js");
const { runLogisticsMachineCycle } = require("../behavior_pack/scripts/logistics_machine.js");

function adapter(initial) {
  let slots = initial.map(slot => slot ? { ...slot } : null);
  return {
    readSlots() { return slots.map(slot => slot ? { ...slot } : null); },
    writeSlots(next) { slots = next.map(slot => slot ? { ...slot } : null); },
    snapshot() { return slots.map(slot => slot ? { ...slot } : null); },
  };
}

const empty = () => Array(9).fill(null);

test("extractor pulls existing items from the configured adjacent inventory into its buffer", () => {
  const sourceSlots = empty();
  sourceSlots[0] = { typeId: "minecraft:iron_ingot", amount: 12 };
  const adjacent = adapter(sourceSlots);
  const buffer = adapter(empty());
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { targetFace: "east", intervalTicks: 1, maxItems: 8 },
  }).state;

  const result = runLogisticsMachineCycle(state, 1, buffer, (face, offset) => {
    assert.equal(face, "east");
    assert.deepEqual(offset, { x: 1, y: 0, z: 0 });
    return adjacent;
  });

  assert.equal(result.ok, true);
  assert.equal(result.movedItems, 8);
  assert.equal(adjacent.snapshot()[0].amount, 4);
  assert.equal(buffer.snapshot()[0].amount, 8);
  assert.equal(result.state.bufferSlots[0].amount, 8);
});

test("inserter pushes buffered items into the configured adjacent inventory", () => {
  const bufferSlots = empty();
  bufferSlots[0] = { typeId: "minecraft:coal", amount: 10 };
  const buffer = adapter(bufferSlots);
  const adjacent = adapter(empty());
  const state = createLogisticsMachineState("aetherium:item_inserter", {
    config: { targetFace: "up", intervalTicks: 1, maxItems: 6 },
    bufferSlots,
  }).state;

  const result = runLogisticsMachineCycle(state, 2, buffer, () => adjacent);
  assert.equal(result.ok, true);
  assert.equal(result.movedItems, 6);
  assert.equal(buffer.snapshot()[0].amount, 4);
  assert.equal(adjacent.snapshot()[0].amount, 6);
  assert.equal(result.state.bufferSlots[0].amount, 4);
});

test("filter and stack limits are respected by the machine cycle", () => {
  const sourceSlots = empty();
  sourceSlots[0] = { typeId: "minecraft:stone", amount: 16 };
  sourceSlots[1] = { typeId: "minecraft:iron_ingot", amount: 16 };
  const adjacent = adapter(sourceSlots);
  const buffer = adapter(empty());
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: {
      intervalTicks: 1,
      maxStacks: 1,
      maxItems: 64,
      filter: { mode: "whitelist", itemIds: ["minecraft:iron_ingot"] },
    },
  }).state;

  const result = runLogisticsMachineCycle(state, 1, buffer, () => adjacent);
  assert.equal(result.ok, true);
  assert.equal(result.movedItems, 16);
  assert.equal(adjacent.snapshot()[0].amount, 16);
  assert.equal(adjacent.snapshot()[1], null);
  assert.equal(buffer.snapshot()[0].typeId, "minecraft:iron_ingot");
});

test("disabled and not-due machines do not inspect or mutate inventories", () => {
  const source = adapter(empty());
  const buffer = adapter(empty());
  const disabled = createLogisticsMachineState("aetherium:item_extractor", {
    config: { enabled: false },
  }).state;
  assert.equal(runLogisticsMachineCycle(disabled, 20, buffer, () => {
    assert.fail("disabled machine must not resolve a neighbor");
  }).reason, "disabled");

  const scheduled = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 20 },
  }).state;
  assert.equal(runLogisticsMachineCycle(scheduled, 19, buffer, () => source).reason, "not_due");
  assert.deepEqual(source.snapshot(), empty());
});

test("missing neighbor, empty inventories and invalid adapters fail safely", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 1 },
  }).state;
  const buffer = adapter(empty());
  assert.equal(runLogisticsMachineCycle(state, 1, buffer, () => null).reason, "no_adjacent_inventory");
  assert.equal(runLogisticsMachineCycle(state, 1, buffer, () => adapter(empty())).reason, "nothing_to_transfer");
  assert.equal(runLogisticsMachineCycle(state, 1, {}, () => null).reason, "invalid_buffer_adapter");
});

test("resolver exceptions and same-adapter transfers are rejected", () => {
  const state = createLogisticsMachineState("aetherium:item_inserter", {
    config: { intervalTicks: 1 },
  }).state;
  const buffer = adapter(empty());
  assert.equal(runLogisticsMachineCycle(state, 1, buffer, () => {
    throw new Error("lookup");
  }).reason, "adjacent_inventory_lookup_failed");
  assert.equal(runLogisticsMachineCycle(state, 1, buffer, () => buffer).reason, "same_inventory_adapter");
});

test("invalid machine state and invalid tick do not mutate inventory", () => {
  const buffer = adapter(empty());
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 1 },
  }).state;
  assert.equal(runLogisticsMachineCycle({ ...state, version: 999 }, 1, buffer, () => null).reason,
    "unsupported_state_version");
  assert.equal(runLogisticsMachineCycle(state, -1, buffer, () => null).reason, "invalid_tick");
});


test("returned buffer state can be serialized and restored after an extractor cycle", () => {
  const { serializeLogisticsMachineState, deserializeLogisticsMachineState } =
    require("../behavior_pack/scripts/logistics_state.js");
  const sourceSlots = empty();
  sourceSlots[0] = { typeId: "minecraft:copper_ingot", amount: 5 };
  const adjacent = adapter(sourceSlots);
  const buffer = adapter(empty());
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 1 },
  }).state;

  const cycle = runLogisticsMachineCycle(state, 1, buffer, () => adjacent);
  assert.equal(cycle.ok, true);
  const encoded = serializeLogisticsMachineState(cycle.state);
  assert.equal(encoded.ok, true);
  const restored = deserializeLogisticsMachineState(encoded.value);
  assert.equal(restored.ok, true);
  assert.equal(restored.state.bufferSlots[0].typeId, "minecraft:copper_ingot");
  assert.equal(restored.state.bufferSlots[0].amount, 5);
});

test("a no-op cycle returns the unchanged validated machine state", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 20 },
  }).state;
  const buffer = adapter(empty());
  const result = runLogisticsMachineCycle(state, 19, buffer, () => {
    assert.fail("not-due cycle must not query adjacent inventory");
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "not_due");
  assert.deepEqual(result.state.bufferSlots, empty());
});


test("stale buffer adapter is rejected before any adjacent inventory is inspected", () => {
  const sourceSlots = empty();
  sourceSlots[0] = { typeId: "minecraft:iron_ingot", amount: 8 };
  const adjacent = adapter(sourceSlots);
  const staleBuffer = adapter(empty());
  const savedSlots = empty();
  savedSlots[0] = { typeId: "minecraft:gold_ingot", amount: 3 };
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 1 },
    bufferSlots: savedSlots,
  }).state;

  const result = runLogisticsMachineCycle(state, 1, staleBuffer, () => {
    assert.fail("out-of-sync buffer must stop before neighbor lookup");
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "buffer_state_out_of_sync");
  assert.equal(adjacent.snapshot()[0].amount, 8);
  assert.deepEqual(staleBuffer.snapshot(), empty());
});

test("buffer adapter read failure is rejected before transfer", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: { intervalTicks: 1 },
  }).state;
  const brokenBuffer = {
    readSlots() { throw new Error("read failed"); },
    writeSlots() { assert.fail("must not write"); },
  };
  const result = runLogisticsMachineCycle(state, 1, brokenBuffer, () => {
    assert.fail("must not inspect neighbor");
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "buffer_snapshot_read_failed");
});

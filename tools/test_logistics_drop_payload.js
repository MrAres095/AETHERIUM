"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createLogisticsMachineState,
  createLogisticsDropPayload,
  restoreLogisticsDropPayload,
} = require("../behavior_pack/scripts/logistics_state.js");

test("drop payload preserves machine type, settings and buffered items", () => {
  const slots = Array(9).fill(null);
  slots[3] = { typeId: "minecraft:diamond", amount: 7, maxAmount: 64 };
  const state = createLogisticsMachineState("aetherium:item_extractor", {
    config: {
      targetFace: "west",
      intervalTicks: 5,
      filter: { mode: "whitelist", itemIds: ["minecraft:diamond"] },
    },
    bufferSlots: slots,
  });
  const payload = createLogisticsDropPayload(state.state);
  assert.equal(payload.ok, true);

  const restored = restoreLogisticsDropPayload(payload.value, "aetherium:item_extractor");
  assert.deepEqual(restored, state);
});

test("drop payload cannot be restored into a different machine type", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const payload = createLogisticsDropPayload(state);
  assert.equal(
    restoreLogisticsDropPayload(payload.value, "aetherium:item_inserter").reason,
    "drop_machine_type_mismatch",
  );
});

test("malformed, oversized and unsupported drop payloads fail closed", () => {
  assert.equal(restoreLogisticsDropPayload("{").reason, "malformed_drop_payload");
  assert.equal(restoreLogisticsDropPayload("x".repeat(65537)).reason, "invalid_drop_payload");
  assert.equal(
    restoreLogisticsDropPayload(JSON.stringify({ formatVersion: 99, machineId: "aetherium:item_extractor", state: "{}" })).reason,
    "unsupported_drop_payload",
  );
});

test("tampered embedded state and mismatched embedded machine IDs are rejected", () => {
  const state = createLogisticsMachineState("aetherium:item_extractor").state;
  const payload = createLogisticsDropPayload(state);
  const parsed = JSON.parse(payload.value);
  parsed.state = JSON.stringify({ version: 1, machineId: "aetherium:item_inserter" });
  assert.equal(
    restoreLogisticsDropPayload(JSON.stringify(parsed)).reason,
    "drop_machine_state_mismatch",
  );
});

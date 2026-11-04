"use strict";

const { normalizeLogisticsConfig } = require("./logistics_config.js");

const STATE_VERSION = 1;
const BUFFER_SLOT_COUNT = 9;
const MACHINE_IDS = Object.freeze([
  "aetherium:item_extractor",
  "aetherium:item_inserter",
]);
const ITEM_ID_PATTERN = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

function cloneSlots(slots) {
  return slots.map(slot => slot ? {
    typeId: slot.typeId,
    amount: slot.amount,
    maxAmount: slot.maxAmount ?? 64,
    ...(Array.isArray(slot.tags) ? { tags: [...slot.tags] } : {}),
  } : null);
}

function validateBufferSlots(slots) {
  if (!Array.isArray(slots) || slots.length !== BUFFER_SLOT_COUNT) {
    return { ok: false, reason: "invalid_buffer_slot_count" };
  }
  for (const slot of slots) {
    if (slot === null) continue;
    if (!slot || typeof slot !== "object" ||
        typeof slot.typeId !== "string" || !ITEM_ID_PATTERN.test(slot.typeId) ||
        !Number.isSafeInteger(slot.amount) || slot.amount < 1 ||
        !Number.isSafeInteger(slot.maxAmount ?? 64) ||
        (slot.maxAmount ?? 64) < 1 || (slot.maxAmount ?? 64) > 64 ||
        slot.amount > (slot.maxAmount ?? 64) ||
        (slot.tags !== undefined &&
          (!Array.isArray(slot.tags) || !slot.tags.every(tag => typeof tag === "string")))) {
      return { ok: false, reason: "invalid_buffer_slot" };
    }
  }
  return { ok: true };
}

function createLogisticsMachineState(machineId, options = {}) {
  if (!MACHINE_IDS.includes(machineId)) {
    return { ok: false, reason: "unknown_machine_id" };
  }
  const normalized = normalizeLogisticsConfig(options.config);
  if (!normalized.ok) return normalized;
  const bufferSlots = options.bufferSlots ?? Array(BUFFER_SLOT_COUNT).fill(null);
  const validBuffer = validateBufferSlots(bufferSlots);
  if (!validBuffer.ok) return validBuffer;
  return {
    ok: true,
    state: {
      version: STATE_VERSION,
      machineId,
      config: normalized.config,
      bufferSlots: cloneSlots(bufferSlots),
    },
  };
}

function validateState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "invalid_state" };
  }
  if (input.version !== STATE_VERSION) {
    return { ok: false, reason: "unsupported_state_version" };
  }
  return createLogisticsMachineState(input.machineId, {
    config: input.config,
    bufferSlots: input.bufferSlots,
  });
}

/** Produces a stable JSON value suitable for a Bedrock dynamic-property adapter. */
function serializeLogisticsMachineState(input) {
  const validated = validateState(input);
  if (!validated.ok) return validated;
  try {
    return { ok: true, value: JSON.stringify(validated.state) };
  } catch {
    return { ok: false, reason: "state_serialization_failed" };
  }
}

function deserializeLogisticsMachineState(serialized) {
  if (typeof serialized !== "string" || serialized.length === 0 ||
      serialized.length > 65536) {
    return { ok: false, reason: "invalid_serialized_state" };
  }
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: "malformed_serialized_state" };
  }
  return validateState(parsed);
}

function updateLogisticsMachineConfig(input, config) {
  const validated = validateState(input);
  if (!validated.ok) return validated;
  return createLogisticsMachineState(validated.state.machineId, {
    config,
    bufferSlots: validated.state.bufferSlots,
  });
}

function updateLogisticsMachineBuffer(input, bufferSlots) {
  const validated = validateState(input);
  if (!validated.ok) return validated;
  return createLogisticsMachineState(validated.state.machineId, {
    config: validated.state.config,
    bufferSlots,
  });
}

module.exports = {
  STATE_VERSION,
  BUFFER_SLOT_COUNT,
  MACHINE_IDS,
  createLogisticsMachineState,
  validateBufferSlots,
  serializeLogisticsMachineState,
  deserializeLogisticsMachineState,
  updateLogisticsMachineConfig,
  updateLogisticsMachineBuffer,
};

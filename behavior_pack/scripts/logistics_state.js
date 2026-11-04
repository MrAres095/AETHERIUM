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


const DROP_PAYLOAD_VERSION = 1;
const MAX_DROP_PAYLOAD_LENGTH = 65536;

/**
 * Creates a portable, versioned payload for a machine item when the block is
 * broken. The Bedrock adapter must attach this value to the dropped item
 * before removing the block's saved state.
 */
function createLogisticsDropPayload(input) {
  const validated = validateState(input);
  if (!validated.ok) return validated;
  const encoded = serializeLogisticsMachineState(validated.state);
  if (!encoded.ok) return encoded;
  const payload = JSON.stringify({
    formatVersion: DROP_PAYLOAD_VERSION,
    machineId: validated.state.machineId,
    state: encoded.value,
  });
  if (payload.length > MAX_DROP_PAYLOAD_LENGTH) {
    return { ok: false, reason: "drop_payload_too_large" };
  }
  return { ok: true, value: payload };
}

/**
 * Validates a dropped-item payload before a placement adapter restores it.
 * expectedMachineId prevents an Extractor payload being applied to an Inserter.
 */
function restoreLogisticsDropPayload(serialized, expectedMachineId) {
  if (typeof serialized !== "string" || serialized.length === 0 ||
      serialized.length > MAX_DROP_PAYLOAD_LENGTH) {
    return { ok: false, reason: "invalid_drop_payload" };
  }
  let payload;
  try {
    payload = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: "malformed_drop_payload" };
  }
  if (!payload || typeof payload !== "object" ||
      payload.formatVersion !== DROP_PAYLOAD_VERSION ||
      typeof payload.machineId !== "string" ||
      typeof payload.state !== "string") {
    return { ok: false, reason: "unsupported_drop_payload" };
  }
  if (expectedMachineId !== undefined && payload.machineId !== expectedMachineId) {
    return { ok: false, reason: "drop_machine_type_mismatch" };
  }
  const restored = deserializeLogisticsMachineState(payload.state);
  if (!restored.ok) return restored;
  if (restored.state.machineId !== payload.machineId) {
    return { ok: false, reason: "drop_machine_state_mismatch" };
  }
  return restored;
}

module.exports = {
  STATE_VERSION,
  DROP_PAYLOAD_VERSION,
  BUFFER_SLOT_COUNT,
  MACHINE_IDS,
  createLogisticsMachineState,
  validateState,
  validateBufferSlots,
  serializeLogisticsMachineState,
  deserializeLogisticsMachineState,
  updateLogisticsMachineConfig,
  updateLogisticsMachineBuffer,
  createLogisticsDropPayload,
  restoreLogisticsDropPayload,
};

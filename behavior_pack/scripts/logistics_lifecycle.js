"use strict";

const {
  createLogisticsDropPayload,
  restoreLogisticsDropPayload,
  serializeLogisticsMachineState,
} = require("./logistics_state.js");

/**
 * Engine-independent break hand-off.
 * The dropped item receives its payload before the machine storage is cleared.
 * Adapters must be synchronous. If clearing storage fails, the payload is
 * removed again where possible; failed compensation is reported explicitly.
 */
function handOffLogisticsStateOnBreak(machineState, droppedItem, machineStorage) {
  if (!droppedItem || typeof droppedItem.writePayload !== "function" ||
      typeof droppedItem.clearPayload !== "function" ||
      !machineStorage || typeof machineStorage.clearState !== "function") {
    return { ok: false, reason: "invalid_lifecycle_adapter" };
  }

  const payload = createLogisticsDropPayload(machineState);
  if (!payload.ok) return payload;

  try {
    droppedItem.writePayload(payload.value);
  } catch {
    return { ok: false, reason: "drop_payload_write_failed" };
  }

  try {
    machineStorage.clearState();
  } catch {
    try {
      droppedItem.clearPayload();
      return { ok: false, reason: "machine_state_clear_failed", rolledBack: true };
    } catch {
      return {
        ok: false,
        reason: "break_handoff_recovery_required",
        payloadWritten: true,
        machineStateMayStillExist: true,
      };
    }
  }

  return { ok: true, payloadWritten: true, machineStateCleared: true };
}

/**
 * Engine-independent placement hand-off.
 * Machine storage is written before the item payload is consumed. If payload
 * clearing fails, the caller must reconcile before allowing another placement.
 */
function restoreLogisticsStateOnPlacement(droppedItem, machineStorage, expectedMachineId) {
  if (!droppedItem || typeof droppedItem.readPayload !== "function" ||
      typeof droppedItem.clearPayload !== "function" ||
      !machineStorage || typeof machineStorage.writeState !== "function") {
    return { ok: false, reason: "invalid_lifecycle_adapter" };
  }

  let rawPayload;
  try {
    rawPayload = droppedItem.readPayload();
  } catch {
    return { ok: false, reason: "drop_payload_read_failed" };
  }
  if (rawPayload === undefined || rawPayload === null || rawPayload === "") {
    return { ok: false, reason: "no_drop_payload" };
  }

  const restored = restoreLogisticsDropPayload(rawPayload, expectedMachineId);
  if (!restored.ok) return restored;
  const encoded = serializeLogisticsMachineState(restored.state);
  if (!encoded.ok) return encoded;

  try {
    machineStorage.writeState(encoded.value);
  } catch {
    return { ok: false, reason: "machine_state_write_failed" };
  }

  try {
    droppedItem.clearPayload();
  } catch {
    return {
      ok: false,
      reason: "placement_reconciliation_required",
      stateWritten: true,
      payloadMayRemain: true,
      state: restored.state,
    };
  }

  return { ok: true, state: restored.state, stateWritten: true, payloadConsumed: true };
}

module.exports = {
  handOffLogisticsStateOnBreak,
  restoreLogisticsStateOnPlacement,
};

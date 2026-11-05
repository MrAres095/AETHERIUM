"use strict";

const { validateBattery, chargeBattery, dischargeBattery } = require("./energy_ledger.js");
const { findPowerPath, calculatePowerDelivery } = require("./power_network.js");

function maxDeliverable(path, requestedLimit, sourceBudget) {
  let low = 0;
  let high = requestedLimit;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const plan = calculatePowerDelivery(path, middle);
    const fits = plan.ok && plan.sourceRequired <= sourceBudget;
    if (fits) low = middle;
    else high = middle - 1;
  }
  return low;
}

/**
 * A local battery buffer at the consumer node smooths cable bottlenecks.
 * Cable delivery serves the load first; the buffer covers the remaining demand.
 * Spare cable/source capacity can recharge the buffer after the load is served.
 * The returned battery is a new snapshot; callers must persist it.
 */
function routePowerWithBuffer(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "invalid_buffer_route_input" };
  }
  const { cables, from, to, requestedAtDestination, availableSourceEnergy, buffer } = input;
  if (!Number.isSafeInteger(requestedAtDestination) || requestedAtDestination < 0
    || !Number.isSafeInteger(availableSourceEnergy) || availableSourceEnergy < 0) {
    return { ok: false, reason: "invalid_energy_request" };
  }
  if (!validateBattery(buffer)) return { ok: false, reason: "invalid_buffer_battery" };
  const route = findPowerPath(cables, from, to);
  if (!route.ok) return route;

  const cableDelivered = route.path.length === 0
    ? Math.min(requestedAtDestination, availableSourceEnergy)
    : maxDeliverable(route.path, requestedAtDestination, availableSourceEnergy);
  const cablePlan = route.path.length === 0
    ? { ok: true, sourceRequired: cableDelivered, totalLoss: 0, flows: [] }
    : calculatePowerDelivery(route.path, cableDelivered);
  if (!cablePlan.ok) return cablePlan;

  const shortfall = requestedAtDestination - cableDelivered;
  const discharge = dischargeBattery(buffer, shortfall);
  if (!discharge.ok) return { ok: false, reason: "buffer_discharge_failed" };
  const delivered = cableDelivered + discharge.delivered;
  const unmet = requestedAtDestination - delivered;

  const sourceRemaining = availableSourceEnergy - cablePlan.sourceRequired;
  const remainingCableCapacity = route.path.map((cable, index) => ({
    ...cable,
    maxTransferPerTick: cable.maxTransferPerTick - (cablePlan.flows[index]?.input ?? 0),
  }));
  let nextBuffer = discharge.battery;
  let bufferCharged = 0;
  let chargeCablePlan = { sourceRequired: 0, totalLoss: 0, flows: [] };
  if (sourceRemaining > 0 && nextBuffer.stored < nextBuffer.capacity) {
    const room = Math.min(nextBuffer.maxInputPerTick, nextBuffer.capacity - nextBuffer.stored);
    const hasCableCapacity = remainingCableCapacity.every(cable => cable.maxTransferPerTick > 0);
    const chargeDelivery = route.path.length === 0
      ? Math.min(room, sourceRemaining)
      : hasCableCapacity ? maxDeliverable(remainingCableCapacity, room, sourceRemaining) : 0;
    if (chargeDelivery > 0) {
      chargeCablePlan = route.path.length === 0
        ? { ok: true, sourceRequired: chargeDelivery, totalLoss: 0, flows: [] }
        : calculatePowerDelivery(remainingCableCapacity, chargeDelivery);
      if (!chargeCablePlan.ok) return chargeCablePlan;
      const charge = chargeBattery(nextBuffer, chargeDelivery);
      if (!charge.ok) return { ok: false, reason: "buffer_charge_failed" };
      nextBuffer = charge.battery;
      bufferCharged = charge.accepted;
    }
  }

  return {
    ok: true, nodes: route.nodes, path: route.path.map(cable => cable.id),
    requestedAtDestination, cableDelivered, bufferDelivered: discharge.delivered,
    delivered, unmet, powered: unmet === 0,
    cableSourceRequired: cablePlan.sourceRequired, cableLoss: cablePlan.totalLoss,
    bufferCharged, chargeSourceRequired: chargeCablePlan.sourceRequired,
    chargeCableLoss: chargeCablePlan.totalLoss,
    unusedSourceEnergy: sourceRemaining - chargeCablePlan.sourceRequired,
    buffer: nextBuffer,
  };
}

module.exports = { routePowerWithBuffer };

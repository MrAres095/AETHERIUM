"use strict";

const BATTERY_TIERS = Object.freeze({
  1: Object.freeze({ capacity: 100000, maxInputPerTick: 500, maxOutputPerTick: 500 }),
  2: Object.freeze({ capacity: 500000, maxInputPerTick: 2500, maxOutputPerTick: 2500 }),
  3: Object.freeze({ capacity: 2500000, maxInputPerTick: 10000, maxOutputPerTick: 10000 }),
});

function isSafeNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function createBattery(tier, stored = 0) {
  const spec = BATTERY_TIERS[tier];
  if (!spec) return { ok: false, reason: "invalid_battery_tier" };
  if (!isSafeNonNegativeInteger(stored) || stored > spec.capacity) {
    return { ok: false, reason: "invalid_stored_energy" };
  }
  return { ok: true, battery: {
    tier, capacity: spec.capacity, maxInputPerTick: spec.maxInputPerTick,
    maxOutputPerTick: spec.maxOutputPerTick, stored,
  } };
}

function validateBattery(battery) {
  if (!battery || !BATTERY_TIERS[battery.tier]) return false;
  const spec = BATTERY_TIERS[battery.tier];
  return battery.capacity === spec.capacity
    && battery.maxInputPerTick === spec.maxInputPerTick
    && battery.maxOutputPerTick === spec.maxOutputPerTick
    && isSafeNonNegativeInteger(battery.stored) && battery.stored <= spec.capacity;
}

function chargeBattery(battery, requested) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const accepted = Math.min(requested, battery.maxInputPerTick, battery.capacity - battery.stored);
  return { ok: true, accepted, rejected: requested - accepted,
    battery: { ...battery, stored: battery.stored + accepted } };
}

function dischargeBattery(battery, requested) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const delivered = Math.min(requested, battery.maxOutputPerTick, battery.stored);
  return { ok: true, delivered, unmet: requested - delivered,
    battery: { ...battery, stored: battery.stored - delivered } };
}

function transferEnergy(source, destination, requested) {
  if (!validateBattery(source) || !validateBattery(destination)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const amount = Math.min(requested, source.maxOutputPerTick, source.stored,
    destination.maxInputPerTick, destination.capacity - destination.stored);
  return { ok: true, transferred: amount,
    source: { ...source, stored: source.stored - amount },
    destination: { ...destination, stored: destination.stored + amount } };
}

// One wireless segment consumes extra source energy to cover transmission loss.
// Relay batteries are ordinary batteries: call this once per hop, using each relay
// as the destination of one hop and the source of the next.
function transferWirelessHop(source, destination, requestedDelivery, lossPercent = 5) {
  if (!validateBattery(source) || !validateBattery(destination)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requestedDelivery)) return { ok: false, reason: "invalid_energy_amount" };
  if (!Number.isFinite(lossPercent) || lossPercent < 0 || lossPercent >= 100) {
    return { ok: false, reason: "invalid_loss_percent" };
  }
  if (requestedDelivery === 0) {
    return { ok: true, sent: 0, delivered: 0, lost: 0, source: { ...source }, destination: { ...destination } };
  }
  const efficiency = (100 - lossPercent) / 100;
  const sourceLimitedDelivery = Math.floor(Math.min(source.maxOutputPerTick, source.stored) * efficiency);
  const destinationLimitedDelivery = Math.min(
    destination.maxInputPerTick,
    destination.capacity - destination.stored
  );
  const maxDeliverable = Math.min(sourceLimitedDelivery, destinationLimitedDelivery);
  const delivered = Math.min(requestedDelivery, maxDeliverable);
  const sent = Math.ceil(delivered / efficiency);
  const lost = sent - delivered;
  return {
    ok: true, sent, delivered, lost, unmet: requestedDelivery - delivered,
    source: { ...source, stored: source.stored - sent },
    destination: { ...destination, stored: destination.stored + delivered },
  };
}

function validateWirelessRoute(nodes, maxSegmentLength = 16) {
  if (!Array.isArray(nodes) || nodes.length < 2) return { ok: false, reason: "route_requires_transmitter_and_receiver" };
  if (!Number.isSafeInteger(maxSegmentLength) || maxSegmentLength < 1) return { ok: false, reason: "invalid_segment_length" };
  const dimension = nodes[0] && nodes[0].dimension;
  for (const node of nodes) {
    if (!node || typeof node.dimension !== "string"
      || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)
      || node.dimension !== dimension) return { ok: false, reason: "invalid_or_cross_dimension_route" };
  }
  for (let i = 1; i < nodes.length; i += 1) {
    const a = nodes[i - 1], b = nodes[i];
    const distanceSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
    if (distanceSquared > maxSegmentLength ** 2) return { ok: false, reason: "segment_out_of_range", segment: i - 1 };
  }
  return { ok: true, segments: nodes.length - 1, maxSegmentLength };
}

module.exports = {
  BATTERY_TIERS, createBattery, validateBattery, chargeBattery, dischargeBattery,
  transferEnergy, transferWirelessHop, validateWirelessRoute,
};

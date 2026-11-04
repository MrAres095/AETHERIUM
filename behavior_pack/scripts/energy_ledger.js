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
  return {
    ok: true,
    battery: {
      tier,
      capacity: spec.capacity,
      maxInputPerTick: spec.maxInputPerTick,
      maxOutputPerTick: spec.maxOutputPerTick,
      stored,
    },
  };
}

function validateBattery(battery) {
  if (!battery || !BATTERY_TIERS[battery.tier]) return false;
  const spec = BATTERY_TIERS[battery.tier];
  return battery.capacity === spec.capacity
    && battery.maxInputPerTick === spec.maxInputPerTick
    && battery.maxOutputPerTick === spec.maxOutputPerTick
    && isSafeNonNegativeInteger(battery.stored)
    && battery.stored <= spec.capacity;
}

function chargeBattery(battery, requested) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const accepted = Math.min(requested, battery.maxInputPerTick, battery.capacity - battery.stored);
  return {
    ok: true,
    accepted,
    rejected: requested - accepted,
    battery: { ...battery, stored: battery.stored + accepted },
  };
}

function dischargeBattery(battery, requested) {
  if (!validateBattery(battery)) return { ok: false, reason: "invalid_battery" };
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const delivered = Math.min(requested, battery.maxOutputPerTick, battery.stored);
  return {
    ok: true,
    delivered,
    unmet: requested - delivered,
    battery: { ...battery, stored: battery.stored - delivered },
  };
}

// Transfer is atomic from the caller's perspective: both returned snapshots are new,
// and the source is never debited for energy the destination cannot accept.
function transferEnergy(source, destination, requested) {
  if (!validateBattery(source) || !validateBattery(destination)) {
    return { ok: false, reason: "invalid_battery" };
  }
  if (!isSafeNonNegativeInteger(requested)) return { ok: false, reason: "invalid_energy_amount" };
  const amount = Math.min(
    requested,
    source.maxOutputPerTick,
    source.stored,
    destination.maxInputPerTick,
    destination.capacity - destination.stored,
  );
  return {
    ok: true,
    transferred: amount,
    source: { ...source, stored: source.stored - amount },
    destination: { ...destination, stored: destination.stored + amount },
  };
}

function validateWirelessRoute(nodes, maxSegmentLength = 16) {
  if (!Array.isArray(nodes) || nodes.length < 2) {
    return { ok: false, reason: "route_requires_transmitter_and_receiver" };
  }
  if (!Number.isSafeInteger(maxSegmentLength) || maxSegmentLength < 1) {
    return { ok: false, reason: "invalid_segment_length" };
  }
  const dimension = nodes[0] && nodes[0].dimension;
  for (const node of nodes) {
    if (!node || typeof node.dimension !== "string"
      || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)
      || node.dimension !== dimension) {
      return { ok: false, reason: "invalid_or_cross_dimension_route" };
    }
  }
  for (let i = 1; i < nodes.length; i += 1) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const distanceSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
    if (distanceSquared > maxSegmentLength ** 2) {
      return { ok: false, reason: "segment_out_of_range", segment: i - 1 };
    }
  }
  return { ok: true, segments: nodes.length - 1, maxSegmentLength };
}

module.exports = {
  BATTERY_TIERS,
  createBattery,
  validateBattery,
  chargeBattery,
  dischargeBattery,
  transferEnergy,
  validateWirelessRoute,
};

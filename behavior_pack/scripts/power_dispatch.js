"use strict";

const { validateBattery, chargeBattery, dischargeBattery } = require("./energy_ledger.js");

function isEnergy(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Allocate one network tick: internal plant load, prioritized machine demand,
 * battery discharge for shortages, then battery charging from true surplus.
 * Lower machine priority numbers are served first; ties use stable IDs.
 */
function dispatchPowerTick(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "invalid_dispatch_input" };
  }
  const generators = input.generators ?? [];
  const batteries = input.batteries ?? [];
  const machines = input.machines ?? [];
  const internalLoad = input.internalLoadPerTick ?? 0;
  if (!Array.isArray(generators) || !Array.isArray(batteries) || !Array.isArray(machines)) {
    return { ok: false, reason: "invalid_dispatch_collections" };
  }
  if (!isEnergy(internalLoad)) return { ok: false, reason: "invalid_internal_load" };

  let grossGeneration = 0;
  for (const generator of generators) {
    if (!generator || typeof generator.id !== "string" || !generator.id
      || !isEnergy(generator.outputPerTick)) {
      return { ok: false, reason: "invalid_generator" };
    }
    grossGeneration += generator.outputPerTick;
    if (!Number.isSafeInteger(grossGeneration)) return { ok: false, reason: "energy_total_overflow" };
  }

  const seenBatteryIds = new Set();
  const workingBatteries = [];
  for (const entry of batteries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || seenBatteryIds.has(entry.id)
      || !validateBattery(entry.battery)) {
      return { ok: false, reason: "invalid_or_duplicate_battery" };
    }
    seenBatteryIds.add(entry.id);
    workingBatteries.push({ id: entry.id, battery: { ...entry.battery } });
  }

  const seenMachineIds = new Set();
  const orderedMachines = [];
  for (const machine of machines) {
    if (!machine || typeof machine.id !== "string" || !machine.id
      || seenMachineIds.has(machine.id) || !isEnergy(machine.demandPerTick)
      || (machine.priority !== undefined && !Number.isSafeInteger(machine.priority))) {
      return { ok: false, reason: "invalid_or_duplicate_machine" };
    }
    seenMachineIds.add(machine.id);
    orderedMachines.push({
      id: machine.id,
      demandPerTick: machine.demandPerTick,
      priority: machine.priority ?? 100,
    });
  }
  orderedMachines.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const internalSupplied = Math.min(grossGeneration, internalLoad);
  const internalUnmet = internalLoad - internalSupplied;
  let generationRemaining = Math.max(0, grossGeneration - internalLoad);
  let totalBatteryDischarged = 0;
  let totalMachineDelivered = 0;
  const machineResults = [];

  for (const machine of orderedMachines) {
    let remaining = machine.demandPerTick;
    const fromGeneration = Math.min(remaining, generationRemaining);
    generationRemaining -= fromGeneration;
    remaining -= fromGeneration;
    let fromBatteries = 0;

    for (const entry of workingBatteries) {
      if (remaining === 0) break;
      const result = dischargeBattery(entry.battery, remaining);
      if (!result.ok) return { ok: false, reason: "battery_discharge_failed", batteryId: entry.id };
      entry.battery = result.battery;
      fromBatteries += result.delivered;
      totalBatteryDischarged += result.delivered;
      remaining -= result.delivered;
    }

    const delivered = machine.demandPerTick - remaining;
    totalMachineDelivered += delivered;
    machineResults.push({
      id: machine.id, requested: machine.demandPerTick, delivered,
      fromGeneration, fromBatteries, unmet: remaining, powered: remaining === 0,
    });
  }

  let totalBatteryCharged = 0;
  let unacceptedSurplus = generationRemaining;
  for (const entry of workingBatteries) {
    if (unacceptedSurplus === 0) break;
    const result = chargeBattery(entry.battery, unacceptedSurplus);
    if (!result.ok) return { ok: false, reason: "battery_charge_failed", batteryId: entry.id };
    entry.battery = result.battery;
    totalBatteryCharged += result.accepted;
    unacceptedSurplus -= result.accepted;
  }

  const machineUnmet = machineResults.reduce((sum, item) => sum + item.unmet, 0);
  return {
    ok: true, grossGeneration, internalLoad, internalSupplied, internalUnmet,
    netGenerationAvailable: Math.max(0, grossGeneration - internalLoad),
    machineDemand: machineResults.reduce((sum, item) => sum + item.requested, 0),
    machineDelivered: totalMachineDelivered, machineUnmet,
    totalBatteryDischarged, totalBatteryCharged, unusedGeneration: unacceptedSurplus,
    machines: machineResults, batteries: workingBatteries,
  };
}

module.exports = { dispatchPowerTick };

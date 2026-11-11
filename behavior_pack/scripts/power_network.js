"use strict";

const MAX_EFFICIENCY_BPS = 10000;

function validId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCables(cables) {
  if (!Array.isArray(cables)) return { ok: false, reason: "invalid_cable_collection" };
  const ids = new Set();
  for (const cable of cables) {
    if (!cable || !validId(cable.id) || ids.has(cable.id)
      || !validId(cable.from) || !validId(cable.to) || cable.from === cable.to
      || !Number.isSafeInteger(cable.maxTransferPerTick) || cable.maxTransferPerTick <= 0
      || !Number.isSafeInteger(cable.efficiencyBps)
      || cable.efficiencyBps < 1 || cable.efficiencyBps > MAX_EFFICIENCY_BPS) {
      return { ok: false, reason: "invalid_or_duplicate_cable" };
    }
    ids.add(cable.id);
  }
  return { ok: true };
}

/** Find a deterministic shortest path through an undirected cable graph. */
function findPowerPath(cables, from, to) {
  const validation = validateCables(cables);
  if (!validation.ok) return validation;
  if (!validId(from) || !validId(to)) return { ok: false, reason: "invalid_endpoint" };
  if (from === to) return { ok: true, path: [], nodes: [from] };

  const adjacency = new Map();
  for (const cable of cables) {
    if (!adjacency.has(cable.from)) adjacency.set(cable.from, []);
    if (!adjacency.has(cable.to)) adjacency.set(cable.to, []);
    adjacency.get(cable.from).push({ cable, next: cable.to });
    adjacency.get(cable.to).push({ cable, next: cable.from });
  }
  for (const edges of adjacency.values()) {
    edges.sort((a, b) => a.cable.id.localeCompare(b.cable.id) || a.next.localeCompare(b.next));
  }

  const queue = [from];
  const visited = new Set([from]);
  const previous = new Map();
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];
    for (const edge of adjacency.get(node) ?? []) {
      if (visited.has(edge.next)) continue;
      visited.add(edge.next);
      previous.set(edge.next, { node, cable: edge.cable });
      if (edge.next === to) {
        const path = [];
        const nodes = [to];
        let cursor = to;
        while (cursor !== from) {
          const step = previous.get(cursor);
          path.push(step.cable);
          cursor = step.node;
          nodes.push(cursor);
        }
        path.reverse();
        nodes.reverse();
        return { ok: true, path, nodes };
      }
      queue.push(edge.next);
    }
  }
  return { ok: false, reason: "no_power_path" };
}

/**
 * Work backwards from the requested destination energy so each cable's loss is
 * accounted for. maxTransferPerTick limits energy entering that cable.
 */
function calculatePowerDelivery(path, requestedAtDestination) {
  if (!Array.isArray(path)) return { ok: false, reason: "invalid_power_path" };
  if (!Number.isSafeInteger(requestedAtDestination) || requestedAtDestination < 0) {
    return { ok: false, reason: "invalid_energy_request" };
  }
  const validation = validateCables(path);
  if (!validation.ok) return validation;
  if (requestedAtDestination === 0) {
    return { ok: true, requestedAtDestination: 0, sourceRequired: 0, totalLoss: 0, flows: [] };
  }

  let requiredAtSource = requestedAtDestination;
  const reverseFlows = [];
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const cable = path[index];
    // Split quotient and remainder so the scaled multiplication stays exact
    // and does not round a safe integer down near Number.MAX_SAFE_INTEGER.
    const whole = Math.floor(requiredAtSource / cable.efficiencyBps);
    const remainder = requiredAtSource % cable.efficiencyBps;
    const base = whole * 10000;
    if (!Number.isSafeInteger(base)) return { ok: false, reason: "energy_total_overflow" };
    const fractional = Math.ceil((remainder * 10000) / cable.efficiencyBps);
    const input = base + fractional;
    if (!Number.isSafeInteger(input)) return { ok: false, reason: "energy_total_overflow" };
    if (input > cable.maxTransferPerTick) {
      return { ok: false, reason: "cable_overloaded", cableId: cable.id,
        requiredInput: input, maxTransferPerTick: cable.maxTransferPerTick };
    }
    reverseFlows.push({ cableId: cable.id, input, output: requiredAtSource, loss: input - requiredAtSource });
    requiredAtSource = input;
  }
  const flows = reverseFlows.reverse();
  const totalLoss = requiredAtSource - requestedAtDestination;
  return { ok: true, requestedAtDestination, sourceRequired: requiredAtSource, totalLoss, flows };
}

function routePowerDelivery(cables, from, to, requestedAtDestination) {
  const route = findPowerPath(cables, from, to);
  if (!route.ok) return route;
  if (route.path.length === 0) {
    if (!Number.isSafeInteger(requestedAtDestination) || requestedAtDestination < 0) {
      return { ok: false, reason: "invalid_energy_request" };
    }
    return { ok: true, nodes: route.nodes, path: [], requestedAtDestination,
      sourceRequired: requestedAtDestination, totalLoss: 0, flows: [] };
  }
  const delivery = calculatePowerDelivery(route.path, requestedAtDestination);
  if (!delivery.ok) return delivery;
  return { ...delivery, nodes: route.nodes, path: route.path.map(cable => cable.id) };
}

module.exports = { validateCables, findPowerPath, calculatePowerDelivery, routePowerDelivery };

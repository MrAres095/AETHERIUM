"use strict";

const activeAdapters = new WeakSet();

function cloneSlots(slots) {
  return slots.map(slot => slot ? { ...slot, tags: Array.isArray(slot.tags) ? [...slot.tags] : slot.tags } : null);
}

function validSlots(slots) {
  return Array.isArray(slots) && slots.every(slot =>
    slot === null || (slot && typeof slot === "object" &&
      typeof slot.typeId === "string" && slot.typeId.length > 0 &&
      Number.isSafeInteger(slot.amount) && slot.amount > 0 &&
      Number.isSafeInteger(slot.maxAmount ?? 64) &&
      (slot.maxAmount ?? 64) > 0 &&
      slot.amount <= (slot.maxAmount ?? 64) &&
      (slot.tags === undefined || (Array.isArray(slot.tags) &&
        slot.tags.every(tag => typeof tag === "string"))))
  );
}

function matchesFilter(slot, filter = { mode: "whitelist", itemIds: [] }) {
  if (!filter || !["whitelist", "blacklist"].includes(filter.mode) ||
      !Array.isArray(filter.itemIds) ||
      !filter.itemIds.every(id => typeof id === "string")) return false;
  const matched = filter.itemIds.includes(slot.typeId);
  return filter.mode === "whitelist" ? matched : !matched;
}

/**
 * Plans a bounded item transfer without mutating caller-owned slot arrays.
 * The plan only moves existing stacks; it never creates or discards items.
 */
function planItemTransfer(sourceSlots, destinationSlots, options = {}) {
  if (!validSlots(sourceSlots) || !validSlots(destinationSlots)) {
    return { ok: false, reason: "invalid_inventory_snapshot" };
  }
  const maxStacks = options.maxStacks ?? 4;
  const maxItems = options.maxItems ?? 64;
  if (!Number.isSafeInteger(maxStacks) || maxStacks < 1 ||
      !Number.isSafeInteger(maxItems) || maxItems < 1) {
    return { ok: false, reason: "invalid_transfer_limits" };
  }
  const filter = options.filter ?? { mode: "blacklist", itemIds: [] };
  if (!filter || !["whitelist", "blacklist"].includes(filter.mode) ||
      !Array.isArray(filter.itemIds) ||
      !filter.itemIds.every(id => typeof id === "string")) {
    return { ok: false, reason: "invalid_filter" };
  }
  const acceptedItemIds = options.acceptedItemIds;
  if (acceptedItemIds !== undefined &&
      (!Array.isArray(acceptedItemIds) ||
       !acceptedItemIds.every(id => typeof id === "string"))) {
    return { ok: false, reason: "invalid_destination_filter" };
  }

  const sourceAfter = cloneSlots(sourceSlots);
  const destinationAfter = cloneSlots(destinationSlots);
  let movedItems = 0;
  let movedStacks = 0;

  for (let sourceIndex = 0; sourceIndex < sourceAfter.length &&
       movedStacks < maxStacks && movedItems < maxItems; sourceIndex++) {
    const source = sourceAfter[sourceIndex];
    if (!source || !matchesFilter(source, filter)) continue;
    if (acceptedItemIds && !acceptedItemIds.includes(source.typeId)) continue;

    let remaining = Math.min(source.amount, maxItems - movedItems);
    const maxAmount = source.maxAmount ?? 64;
    for (let destinationIndex = 0;
         destinationIndex < destinationAfter.length && remaining > 0;
         destinationIndex++) {
      const target = destinationAfter[destinationIndex];
      if (target && target.typeId !== source.typeId) continue;
      if (target && (target.maxAmount ?? 64) !== maxAmount) continue;
      const capacity = target ? maxAmount - target.amount : maxAmount;
      if (capacity <= 0) continue;
      const amount = Math.min(capacity, remaining);
      if (target) target.amount += amount;
      else destinationAfter[destinationIndex] = {
        typeId: source.typeId, amount, maxAmount,
        ...(Array.isArray(source.tags) ? { tags: [...source.tags] } : {}),
      };
      remaining -= amount;
      movedItems += amount;
    }

    const movedFromStack = Math.min(source.amount, maxItems - (movedItems - (source.amount - remaining)));
    const transferred = Math.min(source.amount, Math.min(maxItems, source.amount) - remaining);
    if (transferred > 0) {
      source.amount -= transferred;
      if (source.amount === 0) sourceAfter[sourceIndex] = null;
      movedStacks += 1;
    }
  }

  if (movedItems === 0) return { ok: false, reason: "no_transferable_items" };
  return { ok: true, sourceAfter, destinationAfter, movedItems, movedStacks };
}

/**
 * Synchronous transaction adapter. Destination is written before source
 * removal; on source failure, destination is restored. This is not crash-safe:
 * adapters must not yield and must provide atomic slot-array writes.
 */
function executeItemTransfer(source, destination, options = {}) {
  const methods = ["readSlots", "writeSlots"];
  if (!source || !destination || source === destination ||
      methods.some(name => typeof source[name] !== "function") ||
      methods.some(name => typeof destination[name] !== "function")) {
    return { ok: false, reason: "invalid_inventory_adapter" };
  }
  if (activeAdapters.has(source) || activeAdapters.has(destination)) {
    return { ok: false, reason: "transaction_in_progress" };
  }
  activeAdapters.add(source);
  activeAdapters.add(destination);
  try {
    let sourceBefore;
    let destinationBefore;
    try {
      sourceBefore = cloneSlots(source.readSlots());
      destinationBefore = cloneSlots(destination.readSlots());
    } catch {
      return { ok: false, reason: "inventory_read_failed" };
    }
    const plan = planItemTransfer(sourceBefore, destinationBefore, options);
    if (!plan.ok) return plan;
    try {
      destination.writeSlots(plan.destinationAfter);
    } catch {
      try {
        destination.writeSlots(destinationBefore);
        return { ok: false, reason: "destination_write_failed_rolled_back" };
      } catch {
        return { ok: false, reason: "destination_write_failed_rollback_failed" };
      }
    }
    try {
      source.writeSlots(plan.sourceAfter);
    } catch {
      try {
        destination.writeSlots(destinationBefore);
        return { ok: false, reason: "source_write_failed_rolled_back" };
      } catch {
        return { ok: false, reason: "source_write_failed_rollback_failed" };
      }
    }
    return {
      ok: true,
      movedItems: plan.movedItems,
      movedStacks: plan.movedStacks,
    };
  } finally {
    activeAdapters.delete(source);
    activeAdapters.delete(destination);
  }
}

module.exports = { planItemTransfer, executeItemTransfer };

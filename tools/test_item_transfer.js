"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { planItemTransfer, executeItemTransfer } = require("../behavior_pack/scripts/item_transfer.js");

function adapter(slots, failWriteCount = 0) {
  let failuresRemaining = failWriteCount;
  return {
    slots: slots.map(x => x ? { ...x } : null),
    readSlots() { return this.slots.map(x => x ? { ...x } : null); },
    writeSlots(next) {
      if (failuresRemaining > 0) { failuresRemaining -= 1; throw new Error("write failed"); }
      this.slots = next.map(x => x ? { ...x } : null);
    },
  };
}

test("extractor transfers existing items into a compatible partial stack", () => {
  const result = planItemTransfer(
    [{ typeId: "minecraft:iron_ingot", amount: 20 }],
    [{ typeId: "minecraft:iron_ingot", amount: 60 }, null],
    { maxItems: 64, filter: { mode: "whitelist", itemIds: ["minecraft:iron_ingot"] } }
  );
  assert.equal(result.ok, true);
  assert.equal(result.movedItems, 20);
  assert.equal(result.movedStacks, 1);
  assert.equal(result.sourceAfter[0], null);
  assert.equal(result.destinationAfter[0].amount, 64);
  assert.equal(result.destinationAfter[1].amount, 16);
});

test("inserter respects blacklist, destination acceptance and transfer cap", () => {
  const result = planItemTransfer(
    [{ typeId: "minecraft:coal", amount: 64 }, { typeId: "minecraft:oak_log", amount: 64 }],
    [null, null],
    { maxItems: 12, acceptedItemIds: ["minecraft:oak_log"], filter: { mode: "blacklist", itemIds: ["minecraft:diamond"] } }
  );
  assert.equal(result.ok, true);
  assert.equal(result.movedItems, 12);
  assert.equal(result.sourceAfter[0].amount, 64);
  assert.equal(result.sourceAfter[1].amount, 52);
});

test("full or incompatible destination never consumes source", () => {
  const result = planItemTransfer(
    [{ typeId: "minecraft:iron_ingot", amount: 10 }],
    [{ typeId: "minecraft:stone", amount: 64 }],
  );
  assert.deepEqual(result, { ok: false, reason: "no_transferable_items" });
});

test("invalid snapshots and filters are rejected", () => {
  assert.equal(planItemTransfer([{}], [null]).reason, "invalid_inventory_snapshot");
  assert.equal(planItemTransfer([null], [null], { filter: { mode: "wildcard", itemIds: [] } }).reason, "invalid_filter");
});

test("transaction writes destination before consuming source", () => {
  const source = adapter([{ typeId: "minecraft:coal", amount: 8 }]);
  const destination = adapter([null]);
  const result = executeItemTransfer(source, destination);
  assert.deepEqual(result, { ok: true, movedItems: 8, movedStacks: 1 });
  assert.equal(source.slots[0], null);
  assert.equal(destination.slots[0].amount, 8);
});

test("source write failure rolls destination back", () => {
  const source = adapter([{ typeId: "minecraft:coal", amount: 8 }], 1);
  const destination = adapter([null]);
  const result = executeItemTransfer(source, destination);
  assert.deepEqual(result, { ok: false, reason: "source_write_failed_rolled_back" });
  assert.equal(destination.slots[0], null);
  assert.equal(source.slots[0].amount, 8);
});

test("destination write failure leaves source untouched", () => {
  const source = adapter([{ typeId: "minecraft:coal", amount: 8 }]);
  const destination = adapter([null], 1);
  assert.equal(executeItemTransfer(source, destination).reason, "destination_write_failed_rolled_back");
  assert.equal(source.slots[0].amount, 8);
});

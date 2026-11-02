"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { executeGrind } = require("../behavior_pack/scripts/grinder_transaction.js");

const recipes = { recipes: [
  { input: "minecraft:iron_ore", output: "minecraft:raw_iron", count: 2 },
] };

function makeStorage(input, outputs) {
  return {
    input: input && { ...input },
    outputs: outputs.map(slot => slot && { ...slot }),
    failInputWrite: false,
    failOutputWrite: false,
    readInput() { return this.input && { ...this.input }; },
    readOutputs() { return this.outputs.map(slot => slot && { ...slot }); },
    writeInput(value) {
      if (this.failInputWrite) throw new Error("simulated input write failure");
      this.input = value && { ...value };
    },
    writeOutputs(value) {
      if (this.failOutputWrite) throw new Error("simulated output write failure");
      this.outputs = value.map(slot => slot && { ...slot });
    },
  };
}

test("commits output and consumes exactly one input", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 2 }, [null]);
  const result = executeGrind(store, recipes);
  assert.deepEqual(result, { ok: true, produced: { typeId: "minecraft:raw_iron", amount: 2 } });
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0].amount, 2);
});

test("does not change storage if output write fails", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  store.failOutputWrite = true;
  assert.equal(executeGrind(store, recipes).reason, "output_write_failed");
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0], null);
});

test("rolls output back if input consumption fails", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  store.failInputWrite = true;
  assert.equal(executeGrind(store, recipes).reason, "input_write_failed_rolled_back");
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0], null);
});

test("reports rollback failure instead of claiming a safe commit", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  store.failInputWrite = true;
  let writes = 0;
  const original = store.writeOutputs.bind(store);
  store.writeOutputs = value => {
    writes += 1;
    if (writes === 2) throw new Error("rollback failure");
    original(value);
  };
  assert.equal(executeGrind(store, recipes).reason, "rollback_failed");
});

test("rejects invalid adapters and full output storage", () => {
  assert.equal(executeGrind({}, recipes).reason, "invalid_storage_adapter");
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [
    { typeId: "minecraft:stone", amount: 64 },
  ]);
  assert.equal(executeGrind(store, recipes).reason, "output_full");
  assert.equal(store.input.amount, 1);
});

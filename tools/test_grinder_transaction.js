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
  let writes = 0;
  const original = store.writeOutputs.bind(store);
  store.writeOutputs = value => {
    writes += 1;
    if (writes === 1) throw new Error("simulated first output write failure");
    original(value);
  };
  assert.equal(executeGrind(store, recipes).reason, "output_write_failed_rolled_back");
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0], null);
});

test("restores the output snapshot when a multi-slot output write partially fails", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null, null]);
  let writes = 0;
  store.writeOutputs = value => {
    writes += 1;
    if (writes === 1) {
      store.outputs[0] = { typeId: "minecraft:raw_iron", amount: 1 };
      throw new Error("simulated partial output write");
    }
    store.outputs = value.map(slot => slot && { ...slot });
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.reason, "output_write_failed_rolled_back");
  assert.equal(store.input.amount, 1);
  assert.deepEqual(store.outputs, [null, null]);
});

test("reports when a partially failed output write cannot be rolled back", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  store.writeOutputs = () => {
    store.outputs[0] = { typeId: "minecraft:raw_iron", amount: 1 };
    throw new Error("simulated partial output write and rollback failure");
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.reason, "output_write_failed_rollback_failed");
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0].amount, 1);
});

test("restores both snapshots when input commit fails before mutation", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  let writes = 0;
  const original = store.writeInput.bind(store);
  store.writeInput = value => {
    writes += 1;
    if (writes === 1) throw new Error("simulated input write failure");
    original(value);
  };
  assert.equal(executeGrind(store, recipes).reason, "input_write_failed_rolled_back");
  assert.equal(store.input.amount, 1);
  assert.equal(store.outputs[0], null);
});

test("restores input and output when input write partially mutates then throws", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 2 }, [null]);
  let writes = 0;
  const original = store.writeInput.bind(store);
  store.writeInput = value => {
    writes += 1;
    if (writes === 1) {
      store.input = value && { ...value };
      throw new Error("simulated partial input write");
    }
    original(value);
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.reason, "input_write_failed_rolled_back");
  assert.deepEqual(store.input, { typeId: "minecraft:iron_ore", amount: 2 });
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

test("copies live adapter snapshots before writes can mutate them", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  store.readInput = () => store.input;
  store.readOutputs = () => store.outputs;
  let writes = 0;
  store.writeOutputs = value => {
    writes += 1;
    if (writes === 1) {
      store.outputs[0] = { typeId: "minecraft:raw_iron", amount: 2 };
      throw new Error("partial write after mutating live output");
    }
    store.outputs = value.map(slot => slot && { ...slot });
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.reason, "output_write_failed_rolled_back");
  assert.equal(store.input.amount, 1);
  assert.deepEqual(store.outputs, [null]);
});

test("copies the live input snapshot before a partial input write", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 2 }, [null]);
  store.readInput = () => store.input;
  store.writeInput = value => {
    store.input.amount = value.amount;
    throw new Error("partial input write after mutating live input");
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.reason, "input_write_failed_rolled_back");
  assert.deepEqual(store.input, { typeId: "minecraft:iron_ore", amount: 2 });
  assert.deepEqual(store.outputs, [null]);
});

test("rejects invalid adapters and full output storage", () => {
  assert.equal(executeGrind({}, recipes).reason, "invalid_storage_adapter");
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [
    { typeId: "minecraft:stone", amount: 64 },
  ]);
  assert.equal(executeGrind(store, recipes).reason, "output_full");
  assert.equal(store.input.amount, 1);
});

test("reports storage read failures and releases the transaction lock", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  const readInput = store.readInput.bind(store);
  store.readInput = () => { throw new Error("simulated read failure"); };

  assert.equal(executeGrind(store, recipes).reason, "storage_read_failed");

  store.readInput = readInput;
  assert.equal(executeGrind(store, recipes).ok, true);
  assert.equal(store.input, null);
  assert.equal(store.outputs[0].amount, 2);
});

test("rejects reentrant processing against the same storage object", () => {
  const store = makeStorage({ typeId: "minecraft:iron_ore", amount: 1 }, [null]);
  let nestedResult;
  const writeOutputs = store.writeOutputs.bind(store);
  store.writeOutputs = value => {
    nestedResult = executeGrind(store, recipes);
    writeOutputs(value);
  };

  const result = executeGrind(store, recipes);
  assert.equal(result.ok, true);
  assert.equal(nestedResult.reason, "transaction_in_progress");
  assert.equal(store.input, null);
  assert.equal(store.outputs[0].amount, 2);
});

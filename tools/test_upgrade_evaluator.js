"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateUpgrades } = require("../behavior_pack/scripts/upgrade_evaluator.js");

test("empty slots keep the machine at its classic baseline", () => {
  const result = evaluateUpgrades([null, null, null]);
  assert.equal(result.ok, true);
  assert.equal(result.visualTier, 1);
  assert.equal(result.ultimateEffects, false);
  assert.equal(result.speedMultiplier, 1);
  assert.equal(result.yieldMultiplier, 1);
  assert.equal(result.energyMultiplier, 1);
});

test("three Tier I modules keep classic visuals with only small bonuses", () => {
  const result = evaluateUpgrades([
    { role: "speed", tier: 1 },
    { role: "yield", tier: 1 },
    { role: "energy", tier: 1 },
  ]);
  assert.equal(result.visualTier, 1);
  assert.equal(result.speedMultiplier, 1.05);
  assert.equal(result.yieldMultiplier, 1.05);
  assert.equal(result.energyMultiplier, 0.95);
  assert.equal(result.ultimateEffects, false);
});

test("three Tier II modules unlock the advanced visual state", () => {
  const result = evaluateUpgrades([
    { role: "speed", tier: 2 },
    { role: "yield", tier: 2 },
    { role: "energy", tier: 2 },
  ]);
  assert.equal(result.visualTier, 2);
  assert.equal(result.ultimateEffects, false);
  assert.deepEqual(result.animation, {
    rotationSpeedMultiplier: 1.5,
    activeMechanisms: 1,
    energyEffectLevel: 1,
  });
  assert.equal(result.speedMultiplier, 1.25);
  assert.equal(result.yieldMultiplier, 1.25);
  assert.equal(result.energyMultiplier, 0.8);
});

test("three Tier III modules unlock ultimate performance and effects", () => {
  const result = evaluateUpgrades([
    { role: "speed", tier: 3 },
    { role: "yield", tier: 3 },
    { role: "energy", tier: 3 },
  ]);
  assert.equal(result.visualTier, 3);
  assert.equal(result.ultimateEffects, true);
  assert.deepEqual(result.animation, {
    rotationSpeedMultiplier: 2.25,
    activeMechanisms: 3,
    energyEffectLevel: 2,
  });
  assert.equal(result.speedMultiplier, 1.6);
  assert.equal(result.yieldMultiplier, 1.5);
  assert.equal(result.energyMultiplier, 0.65);
});

test("mixed tiers are allowed and produce an intermediate visual state", () => {
  const result = evaluateUpgrades([
    { role: "speed", tier: 3 },
    { role: "yield", tier: 2 },
    { role: "energy", tier: 1 },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.visualTier, 2);
  assert.equal(result.ultimateEffects, false);
  assert.equal(result.speedMultiplier, 1.6);
  assert.equal(result.yieldMultiplier, 1.25);
  assert.equal(result.energyMultiplier, 0.95);
});

test("rejects duplicate roles, unknown roles, invalid tiers and wrong slot count", () => {
  assert.equal(evaluateUpgrades([]).reason, "invalid_upgrade_slots");
  assert.equal(evaluateUpgrades([
    { role: "speed", tier: 1 },
    { role: "speed", tier: 2 },
    null,
  ]).reason, "duplicate_upgrade_role");
  assert.equal(evaluateUpgrades([
    { role: "magic", tier: 1 }, null, null,
  ]).reason, "invalid_upgrade_module");
  assert.equal(evaluateUpgrades([
    { role: "speed", tier: 4 }, null, null,
  ]).reason, "invalid_upgrade_module");
});

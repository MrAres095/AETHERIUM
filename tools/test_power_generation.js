"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const steam = JSON.parse(fs.readFileSync("behavior_pack/power/steam_power_system.json", "utf8"));
const cutter = JSON.parse(fs.readFileSync("behavior_pack/industry/wood_cutter.json", "utf8"));

test("initial power progression includes steam, wind and solar", () => {
  assert.deepEqual(steam.initial_generators.map(x => x.id), [
    "aetherium:steam_generator",
    "aetherium:wind_turbine",
    "aetherium:solar_generator"
  ]);
  assert.ok(steam.initial_generators.every(x => x.tier === "early"));
});

test("steam plant uses a closed water loop and does not consume water continuously", () => {
  const loop = steam.steam_plant.water_cycle;
  assert.equal(loop.type, "closed_loop");
  assert.equal(loop.initial_fill_required, true);
  assert.equal(loop.consumes_water_during_steady_operation, false);
  assert.equal(loop.never_create_water_from_nothing, true);
  assert.equal(loop.pump_drive, "mechanical_turbine_shaft");
  assert.equal(loop.startup, "manual_hand_crank");
  assert.equal(loop.leak_behavior, "stop_and_report");
});

test("boiler accepts conventional fuels and processed wood fuel", () => {
  const fuels = steam.steam_plant.boiler.accepted_fuels;
  for (const fuel of ["minecraft:coal", "minecraft:charcoal", "minecraft:oak_log", "aetherium:wood_chips"]) {
    assert.ok(fuels.includes(fuel), `missing fuel ${fuel}`);
  }
  assert.equal(steam.steam_plant.boiler.dry_boiler_must_stop, true);
  assert.equal(steam.steam_plant.boiler.overheat_protection, true);
});

test("steam turbine only generates AEU from usable steam pressure", () => {
  assert.equal(steam.steam_plant.turbine.produces, "AEU");
  assert.equal(steam.steam_plant.turbine.requires_steam_pressure, true);
  assert.equal(steam.steam_plant.turbine.no_energy_from_idle_or_cold_state, true);
  assert.equal(steam.steam_plant.pump.cannot_generate_power, true);
});

test("wood cutter replants trees and protects output drops", () => {
  assert.equal(cutter.operation.requires_mature_tree, true);
  assert.equal(cutter.operation.replant_from_internal_sapling_slot, true);
  assert.equal(cutter.operation.wait_for_tree_growth, true);
  assert.equal(cutter.operation.pause_when_output_full, true);
  assert.equal(cutter.operation.never_void_drops, true);
  assert.equal(cutter.operation.never_cut_outside_selected_plot, true);
});

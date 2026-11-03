import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

test('battery tiers and wireless relay rules are internally consistent', () => {
 const p=read('behavior_pack/power/power_system.json');
 assert.equal(p.status,'design_only');
 assert.deepEqual(p.battery_tiers.map(x=>x.tier),[1,2,3]);
 for(const b of p.battery_tiers) {
  assert.ok(Number.isSafeInteger(b.capacity)&&b.capacity>0);
  assert.ok(Number.isSafeInteger(b.max_input_per_tick)&&b.max_input_per_tick>0);
  assert.ok(Number.isSafeInteger(b.max_output_per_tick)&&b.max_output_per_tick>0);
 }
 assert.ok(p.battery_tiers[0].capacity<p.battery_tiers[1].capacity);
 assert.ok(p.battery_tiers[1].capacity<p.battery_tiers[2].capacity);
 assert.equal(p.wireless.segment_length_blocks,16);
 assert.equal(p.wireless.relay_requires_real_energy_storage,true);
 assert.equal(p.wireless.chunk_loading_is_separate,true);
 assert.equal(p.handheld_tools.stop_at_zero_charge,true);
});

test('quarry preserves drops, requires area confirmation and has safe output behavior', () => {
 const q=read('behavior_pack/industry/quarry.json');
 assert.equal(q.status,'design_only');
 assert.equal(q.powered,true);
 assert.equal(q.area_selection.corner_count,4);
 assert.equal(q.area_selection.preview_before_start,true);
 assert.equal(q.area_selection.confirm_before_build,true);
 assert.ok(q.mining.bounded_blocks_per_tick>0);
 assert.equal(q.mining.collect_actual_block_drops,true);
 assert.equal(q.mining.default_replacement_mode,'none');
 assert.equal(q.mining.never_replace_containers_or_machine_blocks,true);
 assert.equal(q.output.pause_when_output_full,true);
 assert.equal(q.output.never_void_drops,true);
 assert.equal(q.chunk_loading.world_closed_background_work_guaranteed,false);
 assert.ok(q.output.early_game.includes('chest'));
 assert.equal(q.output.future_optional_bridge,'ae2');
});

test('lighting registry supports manual, automatic and grouped control', () => {
 const l=read('behavior_pack/power/lighting.json');
 assert.equal(l.status,'design_only');
 for(const mode of ['always_on','always_off','night','day','motion','redstone','power_available']) assert.ok(l.modes.includes(mode));
 assert.equal(l.groups.supported,true);
 assert.equal(l.groups.preserve_individual_modes_unless_explicitly_overridden,true);
});

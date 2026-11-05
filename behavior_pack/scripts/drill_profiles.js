"use strict";
const DRILL_VEIN_MAX_BLOCKS = 64;
const DRILL_MODES = Object.freeze({
  basic: Object.freeze({ width:1, height:1, blocksPerAction:1, energyPerBlock:0, speedMultiplier:1, veinMining:false, requiresBattery:false }),
  advanced: Object.freeze({ width:3, height:3, blocksPerAction:9, energyPerBlock:100, speedMultiplier:1, veinMining:false, requiresBattery:true }),
  ultimate: Object.freeze({ width:3, height:3, blocksPerAction:9, energyPerBlock:100, speedMultiplier:1.5, veinMining:true, requiresBattery:true }),
});
const DRILL_MODULES = Object.freeze(["speed","fortune","silk_touch","efficiency","area","energy_cell"]);
function inspectDrillMode(mode) {
  const profile=DRILL_MODES[mode];
  if (!profile) return {ok:false,reason:"unknown_drill_mode"};
  return {ok:true,mode,...profile};
}
function planDrillAction(mode, eligibleBlockCount, veinMinerEnabled=false) {
  const profile=DRILL_MODES[mode];
  if (!profile) return {ok:false,reason:"unknown_drill_mode"};
  if (typeof veinMinerEnabled!=="boolean") return {ok:false,reason:"invalid_vein_miner_setting"};
  if (!Number.isSafeInteger(eligibleBlockCount)||eligibleBlockCount<0) return {ok:false,reason:"invalid_eligible_block_count"};
  if (veinMinerEnabled&&!profile.veinMining) return {ok:false,reason:"vein_miner_unavailable"};
  const limit=veinMinerEnabled?DRILL_VEIN_MAX_BLOCKS:profile.blocksPerAction;
  const blockCount=Math.min(limit,eligibleBlockCount);
  return {ok:true,mode,blockCount,energyRequired:blockCount*profile.energyPerBlock,speedMultiplier:profile.speedMultiplier,veinMining:veinMinerEnabled,canRun:blockCount>0,maxBlocks:limit};
}
function validateDrillModules(modules) {
  if (!Array.isArray(modules)) return {ok:false,reason:"invalid_drill_modules"};
  const installed=new Set();
  for (const module of modules) {
    if (!DRILL_MODULES.includes(module)) return {ok:false,reason:"unknown_drill_module",module};
    if (installed.has(module)) return {ok:false,reason:"duplicate_drill_module",module};
    installed.add(module);
  }
  if (installed.has("fortune")&&installed.has("silk_touch")) return {ok:false,reason:"incompatible_drill_modules"};
  return {ok:true,installed:[...installed]};
}
module.exports={DRILL_MODES,DRILL_MODULES,DRILL_VEIN_MAX_BLOCKS,inspectDrillMode,planDrillAction,validateDrillModules};

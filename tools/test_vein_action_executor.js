"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { executeScannedBlockAction } = require("../behavior_pack/scripts/vein_action_executor.js");

const positions = [{x:0,y:0,z:0},{x:1,y:0,z:0}];
function setup(overrides = {}) {
  const blocks = new Map([["0,0,0",{id:"iron"}],["1,0,0",{id:"iron"}]]);
  const broken = [];
  const options = {
    getBlockAt:(x,y,z)=>blocks.get(x+","+y+","+z),
    isEligible:block=>block.id==="iron",
    canBreak:()=>true,
    breakBlock:position=>{broken.push(position);},
    ...overrides,
  };
  return { blocks, broken, options };
}
test("preflights every coordinate before first edit",()=>{
  const s=setup({canBreak:(_b,_p,i)=>i===0});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"protection_denied");
  assert.equal(r.executed,0);
  assert.equal(s.broken.length,0);
});
test("executes only validated positions",()=>{
  const s=setup();
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.deepEqual(r,{ok:true,executed:2});
  assert.deepEqual(s.broken,positions);
});
test("rejects malformed or oversized scan results",()=>{
  assert.equal(executeScannedBlockAction(null,{}).reason,"invalid_scan_result");
  assert.equal(executeScannedBlockAction({ok:true,positions:Array(65).fill({x:0,y:0,z:0})},{}).reason,"invalid_scan_result");
});
test("rejects duplicate coordinates before editing",()=>{
  const s=setup();
  const r=executeScannedBlockAction({ok:true,positions:[positions[0],positions[0]]},s.options);
  assert.equal(r.reason,"duplicate_position");
  assert.equal(s.broken.length,0);
});
test("changed block during preflight prevents all edits",()=>{
  let calls=0;
  const s=setup({getBlockAt:(x,y,z)=>++calls===1?{id:"iron"}:undefined});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"block_changed_or_ineligible");
  assert.equal(r.executed,0);
  assert.equal(s.broken.length,0);
});
test("revalidates each block immediately before its edit",()=>{
  const s=setup({getBlockAt:(x,y,z)=>x===1?undefined:{id:"iron"}});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"block_changed_during_action");
  assert.equal(r.executed,1);
  assert.equal(s.broken.length,1);
});
test("rechecks protection immediately before each edit",()=>{
  let checks=0;
  const s=setup({canBreak:()=>++checks===1});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"protection_changed_during_action");
  assert.equal(r.executed,0);
  assert.equal(s.broken.length,0);
});
test("a rejected block action reports partial progress without retrying",()=>{
  const s=setup({breakBlock:()=>false});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"block_action_rejected");
  assert.equal(r.executed,0);
});
test("callback errors fail closed during preflight",()=>{
  const s=setup({isEligible:()=>{throw Error("bad block");}});
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"preflight_callback_failed");
  assert.equal(s.broken.length,0);
});
test("missing permission callback prevents execution",()=>{
  const s=setup();
  delete s.options.canBreak;
  const r=executeScannedBlockAction({ok:true,positions},s.options);
  assert.equal(r.reason,"invalid_action_callbacks");
  assert.equal(s.broken.length,0);
});

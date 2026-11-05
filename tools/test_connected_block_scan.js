"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { scanConnectedBlocks, MAX_CONNECTED_BLOCKS } = require("../behavior_pack/scripts/connected_block_scan.js");
const key = (x,y,z) => x + "," + y + "," + z;
function world(blocks) {
  const calls = [];
  return { calls, getBlockAt(x,y,z) { calls.push([x,y,z]); return blocks.get(key(x,y,z)) || null; } };
}
const ore = id => ({ kind: "ore", id });
const log = id => ({ kind: "log", id });

test("face scan follows same-ore six-face connectivity deterministically", () => {
  const w = world(new Map([[key(0,0,0),ore("iron")],[key(1,0,0),ore("iron")],[key(1,1,0),ore("iron")],[key(0,0,1),ore("gold")]]));
  const r = scanConnectedBlocks({ origin:{x:0,y:0,z:0}, getBlockAt:w.getBlockAt, isEligible:(b,o)=>b.kind==="ore" && b.id===o.id });
  assert.equal(r.ok,true);
  assert.deepEqual(r.positions,[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:1,z:0}]);
});
test("face mode excludes diagonal-only blocks", () => {
  const w=world(new Map([[key(0,0,0),log("oak")],[key(1,1,0),log("oak")]]));
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:w.getBlockAt,isEligible:b=>b.kind==="log"});
  assert.equal(r.positions.length,1);
});
test("all mode includes diagonal tree branches", () => {
  const w=world(new Map([[key(0,0,0),log("oak")],[key(1,1,0),log("oak")]]));
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:w.getBlockAt,isEligible:b=>b.kind==="log",connectivity:"all"});
  assert.equal(r.positions.length,2);
});
test("hard cap prevents scanning more than 64 returned blocks", () => {
  const blocks=new Map(); for(let x=0;x<100;x++) blocks.set(key(x,0,0),ore("copper"));
  const w=world(blocks);
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:w.getBlockAt,isEligible:b=>b.kind==="ore"});
  assert.equal(r.positions.length,MAX_CONNECTED_BLOCKS);
  assert.equal(r.truncated,true);
  assert.ok(r.visited<=64*6+1);
});
test("invalid arguments are rejected", () => {
  const base={origin:{x:0,y:0,z:0},getBlockAt:()=>ore("iron"),isEligible:()=>true};
  assert.equal(scanConnectedBlocks({...base,maxBlocks:65}).reason,"invalid_block_limit");
  assert.equal(scanConnectedBlocks({...base,connectivity:"diagonal"}).reason,"invalid_connectivity");
  assert.equal(scanConnectedBlocks({...base,origin:{x:0,y:0,z:0.5}}).reason,"invalid_origin");
  assert.equal(scanConnectedBlocks({...base,getBlockAt:null}).reason,"invalid_scanner_callbacks");
});
test("ineligible origin returns empty safe result", () => {
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:()=>ore("iron"),isEligible:()=>false});
  assert.equal(r.ok,true); assert.deepEqual(r.positions,[]); assert.equal(r.reason,"origin_not_eligible");
});
test("callback exceptions fail closed", () => {
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:()=>{throw Error("unloaded");},isEligible:()=>true});
  assert.equal(r.ok,false); assert.equal(r.reason,"scanner_callback_failed");
});
test("all-neighbor scan remains capped", () => {
  const blocks=new Map();
  for(let x=-5;x<=5;x++) for(let y=-5;y<=5;y++) for(let z=-5;z<=5;z++) blocks.set(key(x,y,z),log("birch"));
  const w=world(blocks);
  const r=scanConnectedBlocks({origin:{x:0,y:0,z:0},getBlockAt:w.getBlockAt,isEligible:b=>b.kind==="log",connectivity:"all"});
  assert.equal(r.positions.length,64);
  assert.ok(r.visited<=64*26+1);
});

"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createToolBattery}=require("../behavior_pack/scripts/energy_ledger.js");
const {writeToolBatteryToItem,readToolBatteryFromItem}=require("../behavior_pack/scripts/tool_battery_state.js");
const {runDrillAction}=require("../behavior_pack/scripts/drill_action.js");
function makeDrill(stored){const props=new Map();const item={getDynamicProperty(k){return props.get(k);},setDynamicProperty(k,v){props.set(k,v);}};writeToolBatteryToItem(item,createToolBattery("drill",stored).battery);return item;}
test("Basic drill runs without battery",()=>{let mined=0;const r=runDrillAction(null,"basic",1,n=>{mined=n;});assert.equal(r.ok,true);assert.equal(r.ran,true);assert.equal(r.consumed,0);assert.equal(mined,1);});
test("Advanced drill spends 100 AEU per eligible block",()=>{const i=makeDrill(1000);const r=runDrillAction(i,"advanced",4,n=>n);assert.equal(r.ran,true);assert.equal(r.consumed,400);assert.equal(r.actionResult,4);assert.equal(readToolBatteryFromItem(i,"drill").battery.stored,600);});
test("Ultimate Vein Miner off keeps 3x3 limit",()=>{const i=makeDrill(2000);let n=0;const r=runDrillAction(i,"ultimate",20,x=>{n=x;});assert.equal(r.ran,true);assert.equal(r.consumed,900);assert.equal(n,9);assert.equal(r.plan.veinMining,false);assert.equal(readToolBatteryFromItem(i,"drill").battery.stored,1100);});
test("Ultimate Vein Miner on mines supplied connected ore candidates",()=>{const i=makeDrill(5000);let n=0;const r=runDrillAction(i,"ultimate",20,x=>{n=x;},true);assert.equal(r.ran,true);assert.equal(r.consumed,2000);assert.equal(n,20);assert.equal(r.plan.veinMining,true);assert.equal(readToolBatteryFromItem(i,"drill").battery.stored,3000);});
test("Ultimate drill blocks complete vein action when charge is insufficient",()=>{const i=makeDrill(5000);let called=false;const r=runDrillAction(i,"ultimate",60,()=>{called=true;},true);assert.equal(r.ran,false);assert.equal(r.reason,"insufficient_charge");assert.equal(called,false);assert.equal(readToolBatteryFromItem(i,"drill").battery.stored,5000);});
test("Basic and Advanced reject Vein Miner",()=>{assert.equal(runDrillAction(null,"basic",1,()=>{},true).reason,"vein_miner_unavailable");const i=makeDrill(2000);assert.equal(runDrillAction(i,"advanced",9,()=>{},true).reason,"vein_miner_unavailable");});
test("No eligible blocks do not spend energy",()=>{const i=makeDrill(500);let called=false;const r=runDrillAction(i,"advanced",0,()=>{called=true;});assert.equal(r.reason,"no_eligible_blocks");assert.equal(called,false);assert.equal(readToolBatteryFromItem(i,"drill").battery.stored,500);});

const { setVeinMinerEnabled } = require("../behavior_pack/scripts/tool_settings.js");

test("Ultimate Drill action automatically uses the saved Vein Miner preference", () => {
  const item = makeDrill(5000);
  setVeinMinerEnabled(item, "drill", true, "ultimate");
  let mined = 0;
  const result = runDrillAction(item, "ultimate", 20, count => { mined = count; });
  assert.equal(result.ok, true);
  assert.equal(result.plan.veinMining, true);
  assert.equal(mined, 20);
  assert.equal(result.consumed, 2000);
});

test("Ultimate Drill saved OFF preference keeps the 3x3 limit", () => {
  const item = makeDrill(5000);
  setVeinMinerEnabled(item, "drill", false, "ultimate");
  let mined = 0;
  const result = runDrillAction(item, "ultimate", 20, count => { mined = count; });
  assert.equal(result.ok, true);
  assert.equal(result.plan.veinMining, false);
  assert.equal(mined, 9);
  assert.equal(result.consumed, 900);
});

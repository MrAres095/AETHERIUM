"use strict";
const {planDrillAction}=require("./drill_profiles.js");
const {runPoweredToolAction}=require("./powered_tool_action.js");
function runDrillAction(itemStack,mode,eligibleBlockCount,action,veinMinerEnabled=false) {
  if (typeof action!=="function") return {ok:false,reason:"invalid_tool_action"};
  const plan=planDrillAction(mode,eligibleBlockCount,veinMinerEnabled);
  if (!plan.ok) return plan;
  if (!plan.canRun) return {ok:true,ran:false,reason:"no_eligible_blocks",plan};
  if (mode==="basic") {
    try { return {ok:true,ran:true,consumed:0,plan,actionResult:action(plan.blockCount,plan)}; }
    catch { return {ok:false,ran:false,reason:"world_action_failed",plan}; }
  }
  const powered=runPoweredToolAction(itemStack,"drill",()=>action(plan.blockCount,plan),plan.blockCount);
  return {...powered,plan};
}
module.exports={runDrillAction};

# Vein Miner execution safety contract

```js
const result = executeScannedBlockAction(scan, {
  getBlockAt(x, y, z),
  isEligible(block, position, index),
  canBreak(block, position, index),
  breakBlock(position, currentBlock, preflightBlock)
});
```

The executor accepts only a successful scan containing 1–64 unique integer coordinates. It preflights every target before the first edit: each block must still exist, match the tool's eligibility predicate, and pass the runtime's protection/permission check. It then re-reads the block and checks permission again immediately before each edit.

The executor never edits the world itself. The Bedrock runtime's `breakBlock` callback remains responsible for the supported block-break mechanism, vanilla drops, tool effects and event semantics. A failure during the edit phase can leave a partial action; the result reports the exact number of completed edits. The tool action adapter has already reserved the full energy cost, so failed or partial actions do not refund energy.

This is a pure safety contract and unit-tested prototype, not a Bedrock runtime integration. Real event registration, permission-provider integration, block-break/drop behavior and in-game Android/BDS tests remain outstanding.

# AETHERIUM Vein Miner scan contract

## Bounded discovery and action adapters

The shared `connected_block_scan.js` module performs a deterministic, read-only breadth-first scan. The runtime supplies block lookup and eligibility callbacks; the scanner returns exact coordinates and never edits blocks.

- **Ore veins:** Ultimate Drill uses six-face connectivity and should require the same ore identifier as the origin.
- **Tree logs:** Chainsaw uses all 26 neighboring positions to include diagonal branches; the predicate should require the same supported log type and any additional tree rules.
- Each scan returns at most 64 blocks. A queued-position set prevents duplicate queue entries; each coordinate is queried at most once.
- Invalid arguments, callback exceptions and ineligible origins fail closed. The scanner does not load chunks, break blocks, award drops or bypass protection checks.

Two action adapters now consume this scan result:
- `runDrillVeinMinerScan(itemStack, scanOptions, action)` reads the Ultimate Drill's saved Vein Miner setting. When OFF it refuses the vein scan; when ON it scans up to 64 face-connected ore blocks. The callback receives the exact selected coordinate array and the action plan.
- `runChainsawScanAction(itemStack, scanOptions, action)` reads the Chainsaw's saved setting. When OFF it checks only the target log; when ON it scans up to 64 connected logs. The callback receives exact coordinates and the action plan.

Both adapters reserve the complete battery cost before invoking the world-action callback. The callback must act only on the supplied positions, revalidate that blocks have not changed, check permissions/protection and preserve vanilla drops. If the callback fails after energy reservation, the energy is not refunded, preventing free retries/duplication.

This milestone connects the pure scanner to the engine-independent tool action contracts and tests the exact coordinate hand-off. It is **not yet connected to Bedrock Script API events or world editing**. Bedrock block lookup, event registration, protected-area checks, real block breaking/drop handling and Android/BDS in-game testing remain outstanding. Do not treat the tools as usable in-game until that runtime layer is implemented and tested.

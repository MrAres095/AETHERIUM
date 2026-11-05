# AETHERIUM Vein Miner scan contract

The shared `connected_block_scan.js` module provides a deterministic, read-only breadth-first scan. The runtime supplies block lookup and eligibility callbacks; the scanner returns exact coordinates and never edits blocks.

- Ore veins use `connectivity: "face"` (six face-adjacent directions); require the same ore identifier as the origin.
- Tree logs use `connectivity: "all"` (all 26 neighbors) to include diagonal branches; require supported log identifiers and runtime-specific tree rules.
- Every scan returns at most 64 blocks. Positions are queried once and neighbor ordering is deterministic.
- Invalid arguments, callback exceptions and ineligible origins fail closed. The scanner does not load chunks, break blocks, award drops or bypass protection checks.

The Drill runtime should pass returned ore positions/count to `runDrillAction`; the Chainsaw runtime should pass returned log positions/count to `runChainsawAction`. Their adapters reserve the complete energy cost before edits. Runtime callbacks must act only on the returned positions, revalidate blocks, check permissions/protection and preserve vanilla drops.

This is an engine-independent algorithm and test milestone only. Bedrock Script API lookup, tool event registration, actual block breaking and Android/BDS testing remain outstanding. The scanner is not yet wired to a usable in-game Drill or Chainsaw.

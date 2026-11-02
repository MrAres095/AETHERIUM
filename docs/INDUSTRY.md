# AETHERIUM Industry – Grinder specification

## Universal Grinder

The Grinder is the first planned Industry machine. It processes supported ore blocks into their primary material. The baseline design is 1 ore block → 2 output items.

### Initial recipe registry

The machine uses an explicit recipe registry rather than guessing whether an arbitrary block is an ore. The initial registry includes:

- Aetherium Ore → 2 Raw Aetherium Crystals.
- Iron, Gold and Copper ore variants (stone and deepslate) → 2 matching raw metal items.
- Coal, Diamond, Emerald, Lapis Lazuli and Redstone ore variants → 2 matching drops.
- Nether Gold Ore → 2 Gold Nuggets.
- Nether Quartz Ore → 2 Nether Quartz.
- Ancient Debris → 2 Netherite Scrap (progression and balance subject to in-game testing).

The registry currently contains 22 explicit input mappings. Future AETHERIUM ores, including ores in The Lost Realms, will be added when their block and output identifiers are finalized.

### Third-party add-on compatibility

Other add-ons can be supported through explicit compatibility entries mapping a block identifier to an output item and count. Unknown blocks are never processed automatically. Compatibility depends on stable identifiers and the Bedrock engine's supported block/container APIs.

### Machine behavior and item safety

- Consume an input ore only when the complete output can fit.
- Pause when output storage is full; never delete output.
- Prevent duplication across world unloads, player exits and server restarts.
- Start as a manually operated prototype; connect power and automation in later modules.
- Upgrades may improve speed or add balanced by-products. The base yield remains configurable per recipe.

### Implementation constraints

A normal furnace recipe is not a real Grinder. The machine needs a supported custom block interaction, inventory/container UI and Script API processing. The exact API and persistence model must be verified against the declared minimum Bedrock version (currently 1.21.0) before implementation. Do not silently raise the minimum version or ship an unsupported schema. Avoid per-tick scans of every loaded block.

### Current status

The JSON registry and static validation hook are present in the repository. The registry is design data only: no Grinder block, UI, inventory or runtime processor is implemented yet. Normal ore drops are unchanged. Automated tests and in-game behavior still need execution/verification.

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

### Implementation constraints and compatibility decision

A normal furnace recipe is not a real Grinder. The machine needs a supported interaction, inventory/container UI and Script API processing.

The current minimum engine target is 1.21.0. The official Script API exposes block inventory access for blocks that actually have an inventory component, but that API alone does not prove a custom block can declare a persistent container in every target release. Current block custom-component documentation also spans API/schema generations; newer flattened custom-component examples require newer format support. Experimental custom block containers are not an acceptable stable baseline for this project.

Implementation decision: do not raise the minimum engine version silently and do not ship an experimental block-container dependency. Prototype the machine using a supported entity-backed inventory/display approach first, with the machine rendered to look like a placed industrial block. Re-evaluate a true block-hosted container only after confirming it is stable on Android and BDS at the selected minimum version. Keep the recipe processor independent from the UI/storage adapter so the backend can be changed without rewriting recipes.

The runtime must use an explicit transaction: validate input and full output capacity, write output, then commit input consumption with rollback/error handling where the API permits. Persist machine state and guard against duplicate processing across unload/restart. Avoid per-tick scans of every loaded block.

### Current status

The JSON registry and static validation hook are present. The engine-independent JavaScript planner validates every recipe mapping in the registry (including unrelated entries and duplicate inputs), validates stack sizes, and only plans input consumption when the complete output fits. Regression tests cover malformed unrelated entries, duplicate mappings anywhere in the registry, empty registries and unsafe stack limits. A separate storage transaction adapter writes output before consuming input and attempts to restore the previous output snapshot if either output writing or input consumption throws. Tests now cover a partially applied output write, successful rollback, and failed rollback. It reports rollback failure explicitly rather than claiming success. Twenty-two Node.js unit tests across the planner and transaction adapter, plus the Python validator unit tests and the full static pack validation, are executed by the GitHub Actions workflow. The latest run passed all three validation steps. These modules are not yet connected to a Bedrock Script API event, machine entity, persistent in-world storage or inventory UI. The rollback logic is best-effort only: it cannot guarantee recovery from a world/process crash or from a storage adapter that partially commits input consumption. Normal ore drops are unchanged. Android, Windows Bedrock and BDS behavior remain untested.

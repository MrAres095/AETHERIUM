# AETHERIUM Industry – Grinder specification

## Universal Grinder family

The Grinder is the first planned Industry machine. It processes explicitly supported ore blocks into their primary material. The baseline design is 1 ore block → 2 output items.

There are two distinct machines in the first release of this machine family:

- **Manual Grinder** – an early-game, hand-operated machine. It needs no electricity, works more slowly, and is operated by the player. It does not support power-network automation. Its purpose is to make ore processing available before the player has built a power system.
- **Electric Grinder** – a powered machine connected to Aetherium Power. It processes faster, can be automated through Logistics, and supports the shared three-slot upgrade system.

They are separate recipes and machine identities, not one machine that silently switches between manual and electric modes. The manual version remains useful when power is unavailable or for small batches.

## Initial recipe registry

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

## Shared three-slot upgrade system

The Electric Grinder and future compatible electric machines use the same three-slot upgrade framework. The slots have fixed roles:

1. **Speed** – increases processing speed.
2. **Yield** – increases the amount of output from a supported recipe.
3. **Energy** – reduces power consumption.

Each slot accepts one module of Tier I, II or III. The tier is per slot; players can mix tiers and choose their own balance. For example, Tier I Speed + Tier II Yield + Tier III Energy is a valid mixed configuration.

### Upgrade tiers and combined machine state

- **Tier I – Basic:** deliberately modest, near-standard operation. It offers only a small practical bonus and keeps the machine's ordinary grounded appearance. It is an affordable early upgrade, not a wasted item.
- **Tier II – Advanced:** a clearly noticeable functional improvement. It can unlock a machine-specific secondary mechanism or capability, as well as stronger performance. Visual effects are restrained and appropriate to the machine.
- **Tier III – Ultimate:** the strongest performance tier and the full machine-specific visual treatment. The machine does not need to levitate: the preferred presentation is animated mechanical parts, rotating gears/shafts/discs, moving components, stronger lighting, Aetherium energy rings and particles where suitable.

The machine evaluates all three installed modules together. Its effective performance and visual state must reflect the actual combination, not simply the highest single module. Three Tier III modules produce the full Ultimate presentation and strongest balanced configuration, with prominent rotating/moving machine parts; hovering is optional and is not a requirement. Three Tier II modules produce the intermediate presentation, with a smaller number of active or slower rotating parts. Three Tier I modules retain the classic appearance and ordinary operation. Mixed configurations produce proportional/intermediate effects based on the installed tiers and slot roles.

The upgrade framework must remain configurable per machine: a generator, drill, chemical processor and Grinder should share the same slot and tier rules but have their own sensible effects, limits, animations and secondary capabilities. Prefer machine-specific rotating and moving parts over levitation; each machine's Ultimate visual language should suit its physical design.

### Balance rules

- Speed upgrades increase energy demand unless offset by the Energy slot.
- Yield upgrades increase output only within explicit recipe and machine limits; they must never create unbounded output.
- Energy upgrades reduce consumption but do not secretly increase speed or yield.
- Mixed tiers are allowed; higher tiers do not require all three slots to be the same tier.
- Advanced modules require progressively rarer materials and previous-tier components where appropriate.
- The machine must show installed modules and its effective state clearly in its UI.
- Upgrade removal/replacement must not delete stored input or output.

The Manual Grinder is not part of the powered upgrade system in its first implementation. It remains a deliberately simple, hand-operated early-game option. A future manual-tool or mechanical attachment system can be considered separately without making the manual machine depend on electricity.

## Machine behavior and item safety

- Consume an input ore only when the complete output can fit.
- Pause when output storage is full; never delete output.
- Prevent duplication across world unloads, player exits and server restarts.
- Keep recipe processing independent from the machine UI/storage adapter.
- Do not scan every loaded block every tick; use targeted interaction/events and bounded processing.
- Direct mining drops remain unchanged unless and until the relevant machine is working in-game.

## Implementation constraints and compatibility decision

A normal furnace recipe is not a real Grinder. The machine needs a supported interaction, inventory/container UI and Script API processing.

The current minimum engine target is 1.21.0. The official Script API exposes block inventory access for blocks that actually have an inventory component, but that API alone does not prove a custom block can declare a persistent container in every target format. Current block custom-component documentation also spans API/schema generations; newer flattened custom-component examples require newer format support. Experimental custom block containers are not an acceptable stable baseline for this project.

Implementation decision: do not raise the minimum engine version silently and do not ship an experimental block-container dependency. Prototype the machine using a supported entity-backed inventory/display approach first, with the machine rendered to look like a placed industrial block. Re-evaluate a true block-hosted container only after confirming it is stable on Android and BDS at the selected minimum version. Keep the recipe processor independent from the UI/storage adapter so the backend can be changed without rewriting recipes.

The runtime must use an explicit transaction: validate input and full output capacity, write output, then commit input consumption with rollback/error handling where the API permits. Persist machine state and guard against duplicate processing across unload/restart. Avoid per-tick scans of every loaded block.

## Current status

The JSON registry and static validation hook are present. The engine-independent JavaScript planner validates every recipe mapping in the registry (including unrelated entries and duplicate inputs), validates stack sizes, and only plans input consumption when the complete output fits. A separate storage transaction adapter writes output before consuming input and attempts to restore both previous input and output snapshots if either write throws. Tests cover partially applied output and input writes, successful rollback, and failed rollback. It reports rollback failure explicitly rather than claiming success. The GitHub Actions workflow validates the planner/transaction tests, Python validator tests and static pack validation. The latest workflow run passed. These modules are not yet connected to a Bedrock Script API event, machine entity, persistent in-world storage or inventory UI. The rollback logic is best-effort only: it cannot guarantee recovery from a world/process crash or from a storage adapter that partially commits inventory changes. Normal ore drops are unchanged. Android, Windows Bedrock and BDS behavior remain untested.

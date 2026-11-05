# AETHERIUM Industry – Grinder specification

## Universal Grinder family

The Grinder is the first planned Industry machine. It processes explicitly supported ore blocks into their primary material. The baseline design is 1 ore block → 2 output items.

There are two distinct machines in the first release of this machine family:

- **Manual Grinder** – an early-game, hand-operated machine. It needs no electricity, works more slowly, and is operated by the player. One interaction plans exactly one recipe operation; the initial balance target is a 20-tick (1 second) hand-operation cooldown. It does not support power-network automation or consume AEU. Its purpose is to make ore processing available before the player has built a power system.
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


## Early power generation and closed-loop steam plant

The initial AETHERIUM power progression has three complementary early generators: the **Steam Generator** (fuel-fired), **Wind Turbine** (fuel-free) and **Solar Generator** (daytime fuel-free). All produce the shared Aetherium Energy Unit (AEU). These are design definitions, not yet working in-world machines.

The Steam Generator is a multi-block industrial chain rather than a single block that consumes water:

1. The **Water Pump** moves the initially filled working water through connected pipes into the **Boiler**.
2. The Boiler burns fuel and heats water into steam.
3. Pressurized steam drives the **Steam Turbine**, which turns a generator and produces AEU.
4. The **Condenser** cools exhaust steam back into water.
5. The pump recirculates that same water to the Boiler.

The loop needs an initial water fill but does not continuously consume water during normal sealed operation. It must never create water from nothing. A detected leak or broken pipe stops the plant safely and reports the problem rather than silently deleting water.

To avoid a startup deadlock, the pump can be started with a manual hand crank. Once steam pressure is available, a mechanical shaft from the turbine drives the pump. The pump is an auxiliary load: net AEU output must account for internal mechanical/electrical demand. The plant cannot produce energy while cold, idle or without steam pressure. The condenser needs cooling; ambient-air cooling is the baseline, with a water-cooling upgrade as a later option. Its cooling loop is separate from the sealed working-water loop.

## Automatic Wood Cutter and fuel supply

The **Wood Cutter** is a powered tree-farming machine, not a handheld axe and not a machine that clears an entire forest. The player marks a small configurable tree plot and supplies saplings. It harvests only mature, recognized trees inside that plot, operates within a bounded number of block operations per tick, collects actual drops, replants from its sapling slot, and waits for regrowth. It pauses when output storage is full and never cuts outside the plot or replaces unknown blocks.

The cutter outputs logs, sticks and recovered saplings. A future **Wood Processor** can turn surplus logs into wood chips, while a **Charcoal Kiln** converts logs into charcoal. The Boiler can also accept ordinary logs, charcoal, coal and coal blocks from the start, so players are not forced to build the complete automation chain before getting their first steam power.

Recommended progression: **Wood Cutter → Wood Processor → Charcoal Kiln → Boiler → Steam Turbine → AEU network**. Directly feeding logs into the Boiler remains possible. Charcoal and wood-chip efficiency values are left for balancing after in-game tests.

The Wood Cutter must not break containers, AETHERIUM machines, or player-placed blocks outside its marked plot. Chunk loading is not enabled by default, and work while the world is closed is not promised.

## Power-generation implementation status

The design contracts are stored in `behavior_pack/power/steam_power_system.json` and `behavior_pack/industry/wood_cutter.json`. The companion tests validate the closed-loop rules, safe startup, accepted fuels, turbine requirements and tree replanting constraints. These files are design-only: Bedrock Script API machine events, persistent inventories, pipe networks, water simulation, models, textures and in-game UI still need implementation and Android/BDS testing. Static validation does not mean these machines are already usable in-game.


## Steam generator output target and automatic tree growth

The initial balancing target for the early Steam Generator is **900 AEU/t gross**. The boiler/pump/condenser plant allowance is 100 AEU/t, leaving **800 AEU/t net**. The design target reserves 150 AEU/t for each of two continuously operating early machines (300 AEU/t combined) and up to 500 AEU/t surplus for a Tier I battery. At that target, a 100,000 AEU Tier I battery can fill from empty in 200 ticks (10 seconds at 20 ticks/second), provided the machines are running at the assumed load and the battery accepts its full 500 AEU/t input. These are initial balance targets, not measured in-game performance; actual machine consumption and generator output must be tested and tuned together.

When generation is temporarily insufficient, the power distributor prioritizes active machines and reduces or pauses battery charging first. It must not drain the battery to zero merely to keep charging itself. The generator must still have fuel and a functioning closed water/steam circuit.

The Wood Cutter automatically applies supplied **Bone Meal** to each newly replanted valid sapling. Bone Meal is taken from a dedicated input slot, used only on valid saplings, and consumed normally. It repeats application while the tree is growing and stops once the tree is mature or the Bone Meal supply runs out. With no Bone Meal, the cutter falls back to natural growth and reports the shortage; it never creates Bone Meal. This makes the farm faster without making its fertilizer supply infinite.


## Farming and mob automation family

AETHERIUM farming automation is divided into three independent branches so players can build only the machines they need.

### Crop farms

- **Planter** plants real seeds on valid farmland or supported soil.
- **Irrigation Unit** supplies a configurable growth modifier from a connected water source/tank; it does not consume water every tick.
- **Fertilizer Station** automatically applies supplied Bone Meal to supported growing crops, consuming real Bone Meal only when the growth action succeeds.
- **Harvester** collects mature crop drops and replants from matching seeds. It pauses safely when output storage is full.

The first supported crop list includes wheat, carrots, potatoes, beetroot, Nether Wart, sugar cane, pumpkins and melons. Each crop needs its own correct harvest/replant behavior; unsupported plants must be skipped, not broken.

### Animal farms

- **Animal Feeder** uses real food items and respects normal breeding cooldowns.
- **Livestock Manager** maintains a player-configured population cap and pauses breeding when the enclosure is full.
- **Product Collector** gathers non-lethal products such as eggs and wool. The first version does not automatically kill livestock; milking can be added through a safe interaction adapter later.

Initial animals: cows, sheep, pigs and chickens. The system must not harm animals or collect outside the configured enclosure.

### Mob farms

- **Mob Attractor** routes existing eligible hostile mobs into a farm; it never spawns or duplicates mobs.
- **Mob Sorter** separates configured mob types and sends unknown types through a safe bypass.
- **Mob Damager** deals actual configurable damage. It does not directly manufacture drops or experience.
- **Loot Collector** collects only real item drops and pauses before storage fills.
- **Experience Collector** collects existing XP orbs into an XP cell or transfers them to the player; it never creates XP.

The first target mobs are zombies, skeletons, creepers, spiders, witches and endermen. Vanilla spawning rules remain authoritative. Named pets and player-owned mobs are excluded by default. Farm machines use AEU and stop safely without power. Chunk loading remains disabled by default and no work while the world is closed is promised.

The machine contracts are in behavior_pack/industry/farming_system.json; tools/test_farming_system.js checks the safety rules. They are design-only until their Bedrock Script API events, inventories, models, textures and UI are implemented and tested in-game.


## Direct-block logistics and accelerated mob farms

Logistics uses two adjacent machine blocks only: Item Extractor pulls from a configured neighboring inventory face; Item Inserter pushes into a configured neighboring inventory face. Both support whitelist/blacklist filters, a persistent small buffer and bounded transfer cycles. No minecarts, rails, wireless transfer or chunk scanning are used. Transfers validate destination capacity before committing source removal and fail safely for unsupported inventories.

The Mob Spawn Amplifier increases valid spawn-attempt frequency (target multipliers 2x/4x/8x) with local mob caps of 16/32/48 and AEU costs of 100/250/500 per tick. It still checks valid spawn positions, mob-specific conditions, difficulty, game rules, player distance and server safety limits. These are design targets, not measured in-game rates; Script API implementation and performance testing remain outstanding.


### Item transfer implementation milestone

An engine-independent transaction prototype now exists at `behavior_pack/scripts/item_transfer.js`. It plans bounded transfers across source/destination slot arrays, supports whitelist/blacklist and destination item acceptance, merges compatible stacks, and writes destination before consuming source. It attempts rollback if either write fails. The adapter contract requires synchronous atomic slot-array writes; this is not crash-safe and is not yet connected to Bedrock block components, real container inventories, machine block entities, AEU ticking or a persistent in-game buffer. The two-block design remains the Item Extractor and Item Inserter.


### Crafting recipes for the first Logistics blocks

The Item Extractor and Item Inserter now have separate shaped crafting recipes. The Extractor uses an Aetherium Ingot as its core, with Iron Ingots and Redstone around it. The Inserter uses an Aetherium Crystal core with Iron Ingots and a Redstone circuit pattern. Both are registered as crafting-table recipes and return their corresponding placed machine block.

Static recipe validation explicitly allows the small documented vanilla ingredient set (currently Iron Ingot and Redstone), while still requiring every AETHERIUM ingredient and every recipe output to be registered. This is a pack-integrity check only; recipe discovery and crafting still need verification in the Bedrock client.



### Logistics machine configuration foundation

The engine-independent module `behavior_pack/scripts/logistics_config.js` now defines the shared configuration contract for both machines:

- All six adjacent faces are supported (north, south, east, west, up and down), each mapped to exactly one neighboring block.
- Whitelist and blacklist item filters accept namespaced Bedrock identifiers only and reject duplicates.
- Transfer cadence is configurable from 1 to 1,200 ticks; per-cycle limits are capped at 16 source stacks and 256 items.
- Invalid settings are rejected instead of silently rewritten. Returned configuration is detached from caller-owned arrays.
- A deterministic tick scheduler checks whether an enabled machine is due to run; it does not create timers or depend on engine globals.

The configuration and scheduler are unit-tested and included in both CI workflows. This is the shared rules layer only: player-facing face/filter UI, saving settings to block-entity/world dynamic properties, and the actual Bedrock inventory adapter still need runtime integration and in-game testing.



### Persistent logistics buffer state

The engine-independent module `behavior_pack/scripts/logistics_state.js` defines a versioned save format for the Item Extractor and Item Inserter. Each machine state contains its identifier, validated face/filter/transfer configuration and a nine-slot internal buffer. Serialization and deserialization are bounded and reject malformed JSON, unsupported schema versions, invalid item identifiers and impossible stack amounts. Updating the configuration preserves the buffer; updating the buffer preserves configuration. State objects and slot arrays are detached to avoid accidental external mutation.

This is a persistence contract ready for an engine adapter, not proof of in-world persistence yet. The Bedrock dynamic-property registration, block-position keying, save/load lifecycle, chunk unload handling and recovery behavior still need implementation and in-game testing. No claim is made that items currently survive breaking or replacing a machine block.


## Logistics machine cycle orchestration

The engine-independent `logistics_machine.js` module now coordinates one bounded
cycle for both machine blocks. The Item Extractor reads from the configured
adjacent inventory and transfers into its nine-slot internal buffer; the Item
Inserter transfers from that buffer into the configured adjacent inventory.
Both use the shared transfer transaction, configured face, whitelist/blacklist,
tick interval, stack limit and item limit. Disabled machines and cycles that
are not due do not inspect inventories. Missing neighbors and invalid adapters
fail safely.

The caller supplies the world tick, resolves the adjacent inventory and owns
the Bedrock inventory/dynamic-property adapters. This orchestration module is
not yet wired to the Bedrock Script API, block interaction UI, or world-save
lifecycle; in-game operation and persistence are not claimed yet.


### Buffer state hand-off after each logistics cycle

After a successful transfer, `runLogisticsMachineCycle` returns a validated
updated machine state whose nine buffer slots match the buffer adapter's
post-transfer snapshot. The caller can serialize that returned state with
`serializeLogisticsMachineState` and store it using the machine's persistent
storage adapter. No-op cycles return the unchanged validated state, while
invalid ticks and invalid inventory adapters fail without starting a transfer.

The buffer adapter must be initialized from the machine's restored
`bufferSlots` before a cycle runs. The transaction adapter remains synchronous
and is not crash-safe across a process/world interruption between its two
inventory writes. This is still an engine-independent contract: it does not
yet register Bedrock Script API components or prove that an in-game block
retains its inventory after breaking, replacing, unloading or reloading.


### Logistics buffer restore guard

Before a due transfer cycle, the logistics orchestrator now reads the live buffer adapter and compares all nine slots with the validated persisted machine snapshot (item ID, amount, stack limit and tags). A mismatch or failed snapshot read stops the cycle before the neighboring inventory is even resolved. This prevents a stale or uninitialized adapter from silently replacing a saved buffer with empty contents or moving items against an inconsistent state. The caller must still restore the adapter from the saved snapshot; this guard detects a mismatch but does not itself perform Bedrock world persistence or crash recovery.


### Portable machine state when broken or moved

The engine-independent logistics state module now defines a versioned drop-payload contract. A break-event adapter can serialize the machine identifier, configuration and nine-slot buffer into a bounded payload for the dropped machine item; a placement adapter can validate and restore it. Restoration rejects malformed or oversized data, unsupported payload versions, and payloads applied to the wrong machine type. The embedded state is validated again before it is returned.

This is a data contract only. It does not yet attach custom data to a Bedrock item, intercept block break/place events, or delete/reconcile world storage. The runtime adapter must write the payload to the dropped item successfully before clearing the block's saved state, and must consume/clear the payload exactly once after successful placement. Until that adapter and its crash-recovery behavior are implemented and tested in-game, machine contents are not yet guaranteed to survive breaking or moving the block.


### Logistics break/place lifecycle hand-off

The engine-independent `logistics_lifecycle.js` module now defines the required adapter ordering for moving a machine's saved state into its dropped item and restoring it on placement. Breaking stages the payload on the dropped item before clearing machine storage; a failed storage clear attempts to remove the staged payload and reports when compensation itself fails. Placement validates the payload and machine type, writes the restored state first, and only then consumes the payload. Adapter failures are returned as explicit recovery/reconciliation states rather than reported as successful transfers.

Seven tests cover operation ordering, write failures, compensation, wrong-machine payloads and placement reconciliation. This is still an adapter contract, not Bedrock event integration. The eventual runtime must provide durable item custom data and machine storage, enforce single-use placement/recovery, and test interruption/crash cases in a real world before item preservation can be guaranteed.


## AEU battery persistence contract

The Tier I/II/III battery state is persisted as a compact versioned item property containing only the battery tier and stored AEU. Capacity and per-tick input/output limits are reconstructed from the trusted tier definitions, so an item payload cannot grant a larger capacity by changing those values. The adapter validates the expected tier, rejects malformed/oversized/unsupported data, and updates the item property after charge or discharge operations. This is intended to preserve stored charge when a battery block is broken, moved as an item and placed again.

The engine-independent adapter and tests are present in `behavior_pack/scripts/battery_state.js` and `tools/test_battery_state.js`. This is not yet wired to a real Bedrock battery block or its break/place events: the future runtime must register the dynamic property, copy it to the actual dropped ItemStack before removing the block's stored state, and restore it on placement. Android/BDS in-game persistence and crash/interruption behavior remain to be verified.


## AEU network dispatch prototype

The engine-independent dispatcher in `behavior_pack/scripts/power_dispatch.js` models one power-network tick. It pays the generator's internal plant load first, serves machine requests by ascending priority (stable ID tie-break), draws from connected batteries only for remaining machine demand, and charges batteries only from generation left after machine loads. Each battery still enforces its own per-tick input/output cap and capacity. Every machine receives an explicit delivered/unmet result; partial power is never reported as fully powered.

The steam-plant target is represented directly: 900 AEU/t gross generation minus 100 AEU/t internal load leaves 800 AEU/t; two 150 AEU/t machines receive 300 AEU/t total and the remaining 500 AEU/t can enter a Tier I battery. The dispatcher returns new battery snapshots and does not mutate caller state. It is an engine-independent allocation prototype, not a live Bedrock network: topology discovery, cable loss, generator simulation, machine callbacks, persistent world state and in-game tick scheduling are not connected yet.


## AEU cable network and local battery buffers

The first cable-network prototype models an undirected graph of power nodes and cables. Each cable has a stable ID, a maximum input throughput per tick and an efficiency in basis points. Routing chooses a deterministic shortest path, with cable IDs breaking equal-length ties. Delivery is calculated backwards from the consumer so every segment's loss is included and the source never supplies less energy than the consumer receives. A segment rejects a requested flow that exceeds its throughput.

A local battery buffer can be installed at a consumer-side network node, downstream of a bottleneck. The network first sends as much energy as the cable path can carry, then discharges the buffer to cover the remaining machine demand. If the machine is not using all available cable throughput, spare capacity can charge the buffer. The same per-tick cable capacity is shared between machine delivery and buffer charging; it is never counted twice. The buffer still obeys its tier capacity and charge/discharge limits. If both the cable and buffer are exhausted, the machine receives partial power and reports an unmet amount rather than silently running at full power.

This is an engine-independent simulation contract. Cable placement, network discovery in the world, buffer block/entity inventory, battery persistence, UI and Bedrock Script API event integration are not implemented yet. The buffer state returned by the prototype must be persisted by its future runtime adapter.

# AETHERIUM Power, Quarry and Lighting

Status: design specification only; these systems are not implemented in-game yet.

## Energy and batteries
Use integer Aetherium Energy Units (AEU). Battery tiers are real stores: Tier I 100,000 AEU / 500 AEU per tick; Tier II 500,000 / 2,500; Tier III 2,500,000 / 10,000. Rechargeable handheld tools (Drill, Chainsaw and future tools) stop at zero charge and recharge at a powered Charging Station. The current logic prototype defines a 20,000 AEU Drill battery (100 AEU per use) and a 30,000 AEU Chainsaw battery (150 AEU per use); these are initial balance values, not final gameplay tuning. Tool actions are atomic: a tool does not perform an action unless it can pay the full energy cost. The Charging Station transfers only energy available from its own battery, respects tool input limits and never overfills the tool.

## Wireless power
Wireless transmission uses 16-block link segments. Each added relay is a real battery-backed node with its own charge and transfer limit; it forwards only energy received. Relays do not create energy and do not automatically load chunks. Initial design is same-dimension and line-of-sight. Wired cables remain more efficient. Chunk loading is a separate optional powered system subject to Bedrock ticking-area limits; no work is promised while the world is closed.

## Quarry
Aetherium Quarry is an electric industrial machine. The player marks four corners with redstone-torch markers. Quarry validates a rectangular area and depth, previews it, waits for confirmation, builds a perimeter frame and mines in bounded batches. It collects actual drops from supported blocks: stone gives cobblestone, ores give their normal drops, and gravel/dirt give their normal drops. Unknown blocks are skipped and reported until explicitly supported.

After collecting drops, Quarry offers None, Backfill or Replace. Default is None. Replacement must never overwrite bedrock, fluids, containers, machine blocks, markers, protected blocks or anything outside the selected volume. Early output uses chests and Logistics pipes; a later optional AE2 bridge is a compatibility adapter, not a dependency. Output can be filtered into ores, building materials, special resources and other. Quarry pauses rather than voiding drops when storage is full, energy is insufficient or the area is unloaded. It persists its cursor and processes a bounded number of blocks per tick.

## Electrical lighting
Powered lights support Always On, Always Off, Night, Day, Motion, Redstone and Power Available modes. Motion and light sensors are separate configurable devices. Lighting Controllers can group lights into factory, home or perimeter groups. Group changes preserve individual settings unless explicitly overridden. Lights turn off on power loss and restore their selected mode when power returns.

## Implementation sequence
1. Integer energy ledger and battery storage (logic prototype and tests added).
2. Rechargeable tool battery drain and Charging Station transfer (logic prototype and tests added); connect both to Bedrock Script API next.
3. Wired transfer and Charging Station runtime blocks.
4. Wireless transmitter, receiver and battery-backed relays.
5. Quarry area selection, preview and bounded mining transactions.
6. Chest output, Logistics pipes, then safe backfill/replacement.
7. Chunk loader only after validating Bedrock API limits.
8. Lighting modes, sensors and grouped controller.
9. Optional AE2 bridge.

All stages require Android Bedrock and BDS testing before being called functional.

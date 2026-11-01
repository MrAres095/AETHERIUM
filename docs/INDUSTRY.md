# AETHERIUM Industry – Grinder specification

## Grinder: first ore-processing machine

The Grinder is the first planned Industry machine. It increases the useful yield from mined ore before the material enters the furnace and later production chains.

### Aetherium Ore processing

- Input: 1 × `aetherium:ore`
- Output: 2 × `aetherium:raw_crystal`
- Base yield: 2 raw crystals per ore block (2× the current direct-mining yield).
- The ore block is consumed only when the machine can fit the complete output in its output inventory.
- If the output inventory is full, processing pauses; no items may be deleted.
- The Grinder must not duplicate items if the world unloads, the player exits, or the server restarts.

### Future upgrades

- Reinforced Grinding: optional upgrade path for faster processing, not a free increase in yield.
- Precision Grinding: later tier may produce a small chance of a bonus by-product, balanced per ore type.
- Power: initial prototype can be manually operated for functional testing; powered operation will connect to Aetherium Power after the energy system exists.

### Bedrock implementation notes

A custom machine is not represented by a normal furnace recipe. The Grinder needs a custom block/container and Script API processing logic. The exact Script API dependency and container implementation must be verified against the minimum supported Bedrock release before shipping. Keep processing event-driven or on a bounded interval; do not scan every loaded block every tick.

### Status

This is the agreed gameplay specification, not an implemented or tested machine yet. The current ore loot remains unchanged until the Grinder is functional in Bedrock. This prevents promising a 2× yield before the machine exists.

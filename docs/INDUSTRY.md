# AETHERIUM Industry – Grinder specification

## Grinder: universal ore-processing machine

The Grinder is the first planned Industry machine. It is designed to process all supported ores, not only Aetherium Ore. Its base goal is to double the material yield compared with mining the same ore block normally.

## Base processing rules

- Standard input: 1 ore block.
- Standard output: 2 units of that ore's primary drop or raw material.
- Aetherium Ore: 1 block → 2 Raw Aetherium Crystals.
- Iron Ore: 1 block → 2 Raw Iron.
- Gold Ore: 1 block → 2 Raw Gold.
- Copper Ore: 1 block → 2 Raw Copper.
- Coal Ore: 1 block → 2 Coal.
- Diamond Ore: 1 block → 2 Diamonds.
- Emerald Ore: 1 block → 2 Emeralds.
- Lapis Lazuli Ore: 1 block → 2 Lapis Lazuli.
- Redstone Ore: 1 block → 2 Redstone Dust.
- Nether Quartz Ore: 1 block → 2 Nether Quartz.
- Ancient Debris: 1 block → 2 Ancient Debris (subject to progression and balance testing).
- Every future AETHERIUM ore, including ores found in The Lost Realms, will receive a matching Grinder recipe.

The table defines the initial design baseline, not final in-game balance. Vanilla ore drops that normally vary or produce multiple pieces may need individual tuning after playtesting; the intent is a clear 2× benefit without making progression trivial.

## Compatibility with other add-ons

The Grinder will use a recipe registry. AETHERIUM ores are supported by default. Other add-ons can be supported by explicit compatibility entries that map an ore block identifier to its output item and count. Unknown blocks must not be treated as ores automatically; this avoids turning arbitrary blocks into valuable drops. Compatibility depends on the other add-on exposing stable identifiers and Bedrock allowing the required block/container interaction.

## Machine behavior and safety

- The ore block is consumed only when the machine can fit the complete output in its output inventory.
- If the output inventory is full, processing pauses; no items may be deleted.
- Processing must not duplicate items if the world unloads, the player exits, or the server restarts.
- The first prototype can be manually operated for functional testing; powered operation will connect to Aetherium Power later.
- Upgrades may improve speed or add carefully balanced by-products; the basic 2× yield is the standard machine recipe.

## Bedrock implementation notes

A custom machine is not represented by a normal furnace recipe. The Grinder needs a custom block/container and Script API processing logic. The exact Script API dependency and container implementation must be verified against the minimum supported Bedrock release before shipping. Keep processing event-driven or on a bounded interval; do not scan every loaded block every tick.

## Status

This is the agreed gameplay specification, not an implemented or tested machine yet. Existing vanilla and AETHERIUM ore drops remain unchanged until the Grinder is functional in Bedrock.

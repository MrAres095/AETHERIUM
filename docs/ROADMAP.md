# AETHERIUM roadmap

Status key: `planned`, `in progress`, `implemented`, `tested`. Implemented means files are present; tested means confirmed in the actual Bedrock game.

## Milestone 0 – Project foundation
- [x] Repository structure and project overview
- [x] Core behavior-pack manifest
- [x] First smoke-test function
- [x] Architecture and testing notes
- [ ] Import and run the smoke test in Minecraft Bedrock

## Milestone 1 – Core content prototype
- [x] Add original Aetherium Crystal item and Crystal Block
- [x] Add block-to-item and item-to-block recipes
- [x] Create matching resource pack and placeholder textures
- [x] Link the behavior pack to its resource pack dependency
- [x] Add local static integrity validator and unit tests
- [x] Add local .mcaddon build script and packaging instructions
- [x] Add Croatian language strings and register hr_HR
- [x] Add a Core test-kit function
- [x] Add Raw Aetherium Crystal item
- [x] Add Aetherium Ore block and raw-crystal loot table
- [x] Add an Overworld ore feature and feature rule
- [x] Increase ore placement attempts from 4 to 8 per chunk
- [x] Increase configured Aetherium vein size from 5 to 7
- [x] Add English/Croatian names for ore progression
- [x] Add static checks for feature and feature-rule references
- [ ] Verify ore generation, vein size, and frequency in a new Bedrock world
- [ ] Confirm ore drops and pack behavior on Android and Windows
- [ ] Confirm compatibility with Bedrock Dedicated Server
- [ ] Replace placeholder textures with distinct final pixel-art assets
- [x] Add the first Raw Aetherium Crystal → Aetherium Ingot furnace/blast-furnace recipe
- [ ] Test smelting recipe in Bedrock
- [ ] Create a distinct original Aetherium Ingot texture

## Milestone 2 – Industry processing prototype
- [x] Define universal Grinder: 1 supported ore block → 2 units of its mapped primary material (2× baseline)
- [x] Include vanilla ore mappings and Aetherium Ore in the explicit registry
- [x] Reserve future AETHERIUM/The Lost Realms ore support for finalized identifiers
- [x] Define an explicit compatibility registry for other add-ons
- [ ] Add Grinder block, inventory/container, and original textures
- [x] Add initial JSON ore-to-output registry and static validation
- [ ] Connect the registry to the actual Grinder runtime
- [ ] Implement safe input/output processing with no item loss or duplication
- [ ] Test Grinder on Android, Windows, and Bedrock Dedicated Server

## Milestone 3 – Power prototype
- [ ] Define energy units and transfer rules
- [ ] Prototype one generator
- [ ] Prototype one energy storage block
- [ ] Prototype a powered machine interface

## Later milestones
- [ ] Industry
- [ ] Logistics
- [ ] Network and digital storage
- [ ] Automation
- [ ] Reactors
- [ ] Nature
- [ ] The Lost Realms: create an original dimension with a deliberately ore-rich underground; Aetherium should be abundant alongside the dimension's other ores.
- [ ] Guidebook and integrated release package

Milestones will be adjusted as Bedrock API constraints are tested. Planned features are not implemented features.

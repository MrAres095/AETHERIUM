# AETHERIUM validation

## Local static checks

Run from the repository root:

```bash
python3 tools/validate_pack.py
```

The validator checks:

- JSON syntax in pack manifests, items, blocks, recipes, loot tables, and texture atlases.
- UUID format and uniqueness across both manifests.
- The behavior-pack dependency against the resource-pack header UUID and version.
- Item icon and block material texture keys against their atlases.
- Referenced texture files and PNG signatures/dimensions.
- Recipe ingredients/results and loot-table item identifiers against registered item/block identifiers.
- Block loot-table paths.

Warnings about identical PNG files are informational; placeholder textures may intentionally share bytes.

## What static validation cannot prove

A passing script does not certify that Minecraft accepts every component or format version. It cannot validate engine schemas, rendering, crafting-table behavior, loot behavior, pack import, dedicated-server loading, or Marketplace compliance.

## Required runtime test matrix

1. Import both packs into a clean Bedrock profile.
2. Confirm both packs appear and the behavior pack resolves its resource-pack dependency.
3. Enable both packs in a new test world with cheats enabled.
4. Confirm the crystal item name and icon render correctly.
5. Craft a crystal block from nine crystals.
6. Place and mine the block; confirm the intended drop.
7. Craft nine crystals back from one block.
8. Check the Content Log for errors and warnings.
9. Repeat on Android and Windows Bedrock.
10. Load the same world on the target Bedrock Dedicated Server and verify that clients joining from Android and Windows receive the pack and see the same content.

Record the exact Bedrock version, platform, test date, and outcome before marking a feature as tested.

# AETHERIUM validation

## Local static checks

Run from the repository root:

```bash
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/validate_pack.py
python3 tools/build_mcaddon.py
```

The validator checks:

- JSON syntax in pack manifests, items, blocks, recipes, loot tables, and texture atlases.
- UUID format and uniqueness across both manifests.
- Manifest format, required header fields, three-part versions, and module presence.
- The behavior-pack dependency against the resource-pack header UUID and version.
- Item icon and block material texture keys against their atlases.
- Every registered item and block display-name translation key against every language declared in `resource_pack/texts/languages.json`.
- Referenced texture files and PNG signatures/dimensions.
- Recipe identifiers, shaped-pattern dimensions/key symbols, ingredients, result identifiers, and positive result counts.
- Registered language files and required item/block localization keys.
- Loot-table item identifiers against registered item/block identifiers and block loot paths.
- Ore feature identifiers, registered placed blocks, feature-rule links, biome filters, and distribution bounds.

The unit tests cover manifest validation and valid/invalid shaped and shapeless recipe cases.

## What static validation cannot prove

A passing script does not certify that Minecraft accepts every component or format version. It cannot validate engine schemas, rendering, crafting-table behavior, loot behavior, pack import, feature-rule execution, dedicated-server loading, or Marketplace compliance.

## Required runtime test matrix

1. Import both packs into a clean Bedrock profile.
2. Enable both packs in a disposable new world.
3. If required by the target Bedrock release, enable the Creation of Custom Biomes experiment.
4. Generate fresh Overworld chunks and explore underground between Y -32 and Y 24.
5. Confirm Aetherium Ore appears in stone/deepslate and drops Raw Aetherium Crystal.
6. Run `/function aetherium/core/test` and `/function aetherium/core/test_kit`.
7. Confirm all AETHERIUM names appear in English, even when Minecraft is set to another language.
8. Check the Content Log for feature, feature-rule, block, loot, and manifest errors.
9. Repeat on Android and Windows Bedrock.
10. Load the same pack on the target Bedrock Dedicated Server and verify that clients see the same content.

Record the exact Bedrock version, platform, experiment settings, test date, and outcome before marking a feature as tested.


## Grinder registry

`behavior_pack/industry/grinder_recipes.json` is a design-time recipe registry. `validate_grinder_registry()` checks identifiers, duplicate inputs and positive output counts. Passing static validation does not mean the runtime machine exists or that the Bedrock engine accepts its eventual UI/container schema.

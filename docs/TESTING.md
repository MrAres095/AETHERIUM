# Testing AETHERIUM

## Current prototype contents

The Core 0.2.0 prototype contains:
- Behavior pack: Aetherium Crystal item, Aetherium Crystal Block, and two crafting recipes.
- Resource pack: item and block texture atlases, English language strings, and original placeholder PNG textures.
- The behavior pack declares the resource pack as a dependency.

## Import and in-game test

1. Package the behavior and resource packs together as one .mcaddon, or import each pack separately.
2. Open the package in Minecraft Bedrock and confirm that both packs import without warnings.
3. Create a disposable Creative test world.
4. Activate AETHERIUM Core. Confirm its resource-pack dependency is enabled as well.
5. Enable cheats for the test world.
6. Search the Creative inventory for Aetherium Crystal and Aetherium Crystal Block.
7. Use the crafting table: 9 crystals should create 1 block; 1 block should return 9 crystals.
8. Place and break the block. Confirm its texture displays and that it drops itself.
9. Run the original Core smoke test:
   /function aetherium/core/test
10. Check the world/content log for manifest, texture, block, or recipe errors.

## Pass criteria

- Both packs import and activate without invalid-manifest warnings.
- The custom item appears with its intended icon and display name.
- The custom block appears, places, breaks, and drops correctly.
- Both recipes work in both directions.
- The Core test function runs successfully.
- No unrelated vanilla gameplay is changed.

## Before each release

- Validate every JSON file.
- Import into a clean Bedrock test world.
- Test on Android and Windows Bedrock where available.
- Check behavior with the other AETHERIUM modules enabled.
- Record the exact Minecraft version and test result.

Repository-side JSON and package-structure checks do not replace the in-game test. The current prototype has not yet been confirmed inside Minecraft.

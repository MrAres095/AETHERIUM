# Testing AETHERIUM

## Initial smoke test

1. Download the repository as a ZIP or package the `behavior_pack` directory as a `.mcpack`.
2. Import it into Minecraft Bedrock.
3. Create a disposable Creative test world.
4. Activate the AETHERIUM Core behavior pack.
5. Enable cheats for the test world.
6. Run:
   `/function aetherium/core/test`
7. Confirm that the chat displays the AETHERIUM Core test message.
8. Check the world log/content log for manifest or function errors.

## Pass criteria

- The pack imports without an invalid-manifest warning.
- The pack can be activated in a world.
- The test function is discoverable and runs successfully.
- No unrelated vanilla gameplay is changed.

## Before each release

- Validate JSON files.
- Import into a clean Bedrock test world.
- Test on Android and Windows Bedrock where available.
- Check behavior with the other AETHERIUM modules enabled.
- Record the exact Minecraft version and test result.

The initial pack does not yet contain custom items, blocks, machines, or Script API code.

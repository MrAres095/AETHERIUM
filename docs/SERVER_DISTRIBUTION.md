# Server distribution plan

AETHERIUM is developed in GitHub and published to the owner's server as versioned release packages.

## Recommended layout

- GitHub repository: source code, documentation, issue tracking, and tagged versions.
- Server download area: stable `.mcaddon` / `.mcpack` files and release notes.
- Optional update manifest: a small JSON file pointing to the latest stable version and package URL.

Suggested public paths on the server:

- `/minecraft/aetherium/releases/`
- `/minecraft/aetherium/latest.json`
- `/minecraft/aetherium/changelog/`

Do not expose server credentials, private keys, API tokens, or internal administration endpoints in this repository or in a downloadable package.

## Release process

1. Validate JSON and pack manifests.
2. Build the complete add-on archive.
3. Test import and gameplay in a clean Bedrock world.
4. Test on Android and Windows Bedrock when available.
5. Publish a versioned file, e.g. `AETHERIUM-0.1.0.mcaddon`.
6. Update `latest.json` only after the release is tested.
7. Keep previous stable versions available for rollback.

## Current status

The first Core scaffold is committed. It is not yet a complete playable add-on. The initial smoke test function still needs to be run in Minecraft.

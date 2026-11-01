# Building AETHERIUM

The build is intentionally local: it does not consume GitHub Actions minutes and
does not require Docker.

## Requirements

- Python 3.10 or newer
- A clean checkout of this repository

## Build

From the repository root:

```sh
python3 tools/build_mcaddon.py
```

Run the unit tests and static validator before building. The build script also runs `tools/validate_pack.py` automatically. If static validation fails,
packaging stops. On success it creates:

```text
dist/AETHERIUM-X.Y.Z.mcaddon
```

The outer `.mcaddon` contains separate Behavior and Resource `.mcpack`
archives. The script checks ZIP integrity and confirms that each inner pack
contains its manifest.

## Important limits

A successful build proves only that the repository's static checks pass and
the archives are structurally readable. It does not prove that Minecraft
accepts every Bedrock component/schema or that the content works in a world.
Import the package into Minecraft Bedrock and follow [the test checklist](TESTING.md).
For a dedicated server, test pack activation and behavior on the actual BDS
version before publishing a server release.

Build outputs in `dist/` are generated artifacts and should not be committed
as source files.

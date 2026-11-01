# AETHERIUM – Complete Technology Pack

A modular, original technology-and-adventure add-on for Minecraft Bedrock Edition.

> **Project status:** 0.3.2 development prototype – seven-block Aetherium ore veins; in-game validation pending.  
> **Target platforms:** Minecraft Bedrock on Android and Windows  
> **Distribution goal:** One integrated add-on package; Marketplace readiness will be evaluated later.

## Design principles

- Original implementation, names, assets, recipes, UI, sounds, and models.
- Feature inspiration only; no copying of third-party code or recognizable assets.
- Modular internal architecture with shared systems and clear interfaces.
- Test each feature in Bedrock before building on top of it.
- Keep gameplay data and balance configurable where practical.
- No external server or companion PC required for gameplay.

## Current Core prototype

- `aetherium:crystal` – Aetherium Crystal material item.
- `aetherium:crystal_block` – placeable Crystal Block with reversible 9:1 crafting.
- `aetherium:ore` – underground Overworld ore block.
- `aetherium:raw_crystal` – raw material dropped by the ore.
- Feature and feature-rule definitions distribute ore in underground Overworld stone/deepslate.
- Ore placement attempts per chunk: 8; each generated vein has a configured size of up to 7 ore blocks.
- English and Croatian localization for the current content.
- A test-kit function supplies the current prototype resources.

The ore generation uses Bedrock's data-driven feature and feature-rule system. Depending on the target Bedrock release, a disposable test world may need the Creation of Custom Biomes experiment enabled. The ore has not yet been confirmed in-game.

The ore and raw-crystal now have separate original 16×16 pixel-art textures. The original crystal item and crystal block still use early placeholder textures that will be refined.

## Planned modules

1. **Aetherium Core** – shared registries, progression hooks, configuration, and common utilities.
2. **Aetherium Power** – generators, energy storage, and power distribution.
3. **Aetherium Industry** – machines and ore processing.
4. **Aetherium Logistics** – item/fluid/energy transport and routing.
5. **Aetherium Network** – digital storage, terminals, crafting, and remote item transfer.
6. **Aetherium Automation** – production planning and factory control.
7. **Aetherium Reactors** – advanced multiblock power generation.
8. **Aetherium Nature** – nature-based energy and alchemical technology.
9. **The Lost Realms** – an original exploration dimension and progression layer. Its underground will be deliberately ore-rich, with Aetherium appearing frequently alongside the dimension's other ores.

The modules above are planned features, not implemented functionality yet. The Lost Realms will be an original AETHERIUM dimension, not a copy of another add-on's content or assets.

## Validate and build

Run these commands from the repository root:

```sh
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/validate_pack.py
python3 tools/build_mcaddon.py
```

The build script validates first, then creates `dist/AETHERIUM-X.Y.Z.mcaddon` containing separate behavior and resource packs. It checks archive integrity, but cannot replace importing and testing the add-on in Minecraft. See [docs/VALIDATION.md](docs/VALIDATION.md), [docs/BUILDING.md](docs/BUILDING.md), and [docs/TESTING.md](docs/TESTING.md).

## Next milestone

Verify ore generation and drops in Bedrock, then add a balanced refining step that turns raw material into usable Aetherium Crystal. Only after that should the first powered machine be added.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the current manual test procedure.

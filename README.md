# AETHERIUM – Complete Technology Pack

A modular, original technology-and-adventure add-on for Minecraft Bedrock Edition.

> **Project status:** Core prototype 0.2.0 – first custom material, block, recipes, and original placeholder textures added; in-game validation pending.  
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

- aetherium:crystal – an original glowing crystal material item.
- aetherium:crystal_block – a placeable full block with its own texture.
- Crafting: 9 crystals create 1 crystal block; 1 crystal block returns 9 crystals.
- Behavior pack automatically declares its matching resource-pack dependency.
- The current textures are early placeholders and will be refined during art direction.

These assets are an early prototype, not a final balanced progression system. Import and in-game behavior still need confirmation on Bedrock.

## Planned modules

1. **Aetherium Core** – shared registries, progression hooks, configuration, and common utilities.
2. **Aetherium Power** – generators, energy storage, and power distribution.
3. **Aetherium Industry** – machines and ore processing.
4. **Aetherium Logistics** – item/fluid/energy transport and routing.
5. **Aetherium Network** – digital storage, terminals, crafting, and remote item transfer.
6. **Aetherium Automation** – production planning and factory control.
7. **Aetherium Reactors** – advanced multiblock power generation.
8. **Aetherium Nature** – nature-based energy and alchemical technology.
9. **The Lost Realms** – an original exploration dimension and progression layer.

The modules above are planned features, not implemented functionality yet.

## Repository layout

- behavior_pack/ – gameplay data and later Bedrock scripting code.
- resource_pack/ – original textures, models, sounds, and UI assets.
- docs/ – architecture, compatibility, testing, and design notes.
- tools/ – local validation and packaging helpers.

## Validate and build

Run these commands from the repository root:

```sh
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/validate_pack.py
python3 tools/build_mcaddon.py
```

The build script validates first, then creates `dist/AETHERIUM-X.Y.Z.mcaddon` containing separate behavior and resource packs. It checks archive integrity, but cannot replace importing and testing the add-on in Minecraft. See [docs/VALIDATION.md](docs/VALIDATION.md) and [docs/BUILDING.md](docs/BUILDING.md).

## Next milestone

Validate the Core prototype in a clean Bedrock test world, then refine the original textures and establish a consistent visual style before starting the first power-generation machine.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the current manual test procedure.

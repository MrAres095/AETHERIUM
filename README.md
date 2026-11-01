# AETHERIUM – Complete Technology Pack

A modular, original technology-and-adventure add-on for Minecraft Bedrock Edition.

> **Project status:** Foundation / Aetherium Core scaffold  
> **Target platforms:** Minecraft Bedrock on Android and Windows  
> **Distribution goal:** One integrated add-on package; Marketplace readiness will be evaluated later.

## Design principles

- Original implementation, names, assets, recipes, UI, sounds, and models.
- Feature inspiration only; no copying of third-party code or recognizable assets.
- Modular internal architecture with shared systems and clear interfaces.
- Test each feature in Bedrock before building on top of it.
- Keep gameplay data and balance configurable where practical.
- No external server or companion PC required for gameplay.

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

- `behavior_pack/` – gameplay data and later Bedrock scripting code.
- `resource_pack/` – original textures, models, sounds, and UI assets.
- `docs/` – architecture, compatibility, testing, and design notes.
- `tools/` – local validation helpers.

## First milestone

Create a minimal behavior pack that imports into Bedrock, activate it in a test world, and run the Core test function. Only after this works will we add the first real custom item and block.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the current manual smoke-test procedure.

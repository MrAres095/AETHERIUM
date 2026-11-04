# AETHERIUM machine geometry

Machine models are authored as original Bedrock geometry assets under
`resource_pack/models/blocks/`. Keep geometry independent from runtime logic:
a model file alone does not register a placeable block or make a machine work.

## Item Extractor — first geometry prototype

Asset: `resource_pack/models/blocks/aetherium_item_extractor.geo.json`

Visual layout:
- 16×16×16 block footprint, with a raised central metal housing.
- Wide lower plinth for a stable industrial silhouette.
- Front status/display panel with a narrow lower slot.
- Small upper front indicator and a side service port.
- Geometry uses a single root bone and simple cuboids to keep it lightweight.

The first pass deliberately uses neutral UV coordinates and the existing 16×16
block texture dimensions. A dedicated machine texture, resource-pack block
client registration, matching behavior-pack block, localization, and in-game
render verification are still required before this can appear as a finished
machine in Minecraft. The current model is a real geometry asset, not a
screenshot or a promise that the block is already placeable.

## Modelling rules

- Keep all cube origins and extents within the 0–16 block coordinate space.
- Prefer a small number of cuboids and bones for Bedrock performance.
- Use original AETHERIUM silhouettes and textures; do not reproduce another
  mod's distinctive machine design.
- Add a structural test whenever a new machine geometry asset is introduced.

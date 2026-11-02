# Grinder runtime research spike

Date: 2026-11-02  
Target baseline: Minecraft Bedrock 1.21.0

## Verified API facts

- The stable `@minecraft/server` API documents `EntityInventoryComponent` with a `container` property. The returned `Container` supports slot reads/writes and item transfer operations.
- The stable API documents `BlockInventoryComponent` for blocks that already expose an inventory, such as vanilla chests. This proves script access to an existing block inventory; it does **not** prove that a custom block can declare a persistent chest-like inventory at our minimum format version.
- The entity `minecraft:inventory` component schema documents `container_type`, `inventory_size`, `private`, and `restrict_to_owner`. Documented container types include `container`, `inventory`, and several vehicle-specific types.
- Script access to a container is not the same as a supported way to open a player's drag-and-drop container screen. The reviewed stable API references expose container manipulation, but no supported general-purpose `Player.openContainer()` method was found.

## Sources

- Microsoft Learn, EntityInventoryComponent: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entityinventorycomponent?view=minecraft-bedrock-stable
- Microsoft Learn, BlockInventoryComponent: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockinventorycomponent?view=minecraft-bedrock-stable
- Microsoft Learn, Container: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/container?view=minecraft-bedrock-stable
- Microsoft documentation source for entity `minecraft:inventory`: https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/EntityReference/Examples/EntityComponents/minecraftComponent_inventory.md

## Decision

Do not implement the Grinder against an assumed custom container UI yet. A custom entity may provide persistent script-readable inventory storage, but the user-facing interaction path still needs a reproducible test in the actual target Bedrock client. A script form is not a substitute for the agreed drag-and-drop inventory experience.

Keep the existing pure recipe planner and transaction adapter unchanged until a runtime storage/UI path is verified. In particular:

1. Do not raise `min_engine_version` silently.
2. Do not enable experimental custom block containers as the baseline.
3. Do not consume player items or machine input until output capacity and commit semantics are proven.
4. Prototype the entity inventory separately in a disposable test world before integrating it into the production pack.
5. Verify Android client behavior and Bedrock Dedicated Server behavior independently.

## Next prototype gate

The next implementation slice should be a minimal disposable entity prototype with a visible machine-like model, `minecraft:inventory` component, and a documented interaction route. It must prove all of the following before it can be called a Grinder:

- the entity can be placed and remains anchored like a machine;
- its inventory persists through unload/reload and world restart;
- a player can open and use its inventory with normal item movement on Android;
- interaction does not accidentally mount, push, or damage the entity;
- ownership/access rules are appropriate for multiplayer;
- the runtime can process one input transaction without loss or duplication.

If the normal container UI cannot be opened for a custom entity on the target baseline, stop and evaluate a different supported interaction model rather than shipping a fake inventory.

## Disposable probe test protocol

The probe is a separate diagnostic asset, not a production machine. It must not be added to the normal crafting progression or advertised as a working Grinder until the following checks pass.

### Client-side checks (Android)

1. Create a new disposable Creative world and enable only the AETHERIUM packs required by the probe.
2. Spawn the probe using its documented test command; confirm it renders with a clear, non-invisible model.
3. Interact with it using the normal touch interaction. Record whether the vanilla container screen opens; do not accept a script dialog as equivalent.
4. Move one harmless test item into and out of every exposed slot. Confirm stack splitting, merging, and drag/tap movement behave normally.
5. Leave the area, return, and repeat. Then save, exit the world, reopen it, and verify the same inventory contents remain.
6. Break/remove the probe and verify its inventory is not silently deleted or duplicated. The diagnostic instructions must state what happens to stored items.
7. Repeat with two players if multiplayer access is intended; verify private/owner restrictions rather than assuming them.

### Dedicated-server checks

Repeat the persistence and interaction checks with a Bedrock Dedicated Server and an Android client connected to it. A successful local Creative-world test does not establish BDS compatibility.

### Transaction checks before production integration

- Verify the adapter reads and writes actual entity inventory slots synchronously.
- Verify output capacity is checked before input consumption.
- Simulate a failed output write, failed input write, and failed rollback.
- Verify unload/reload and restart behavior around the processing boundary.
- Confirm no processing callback can re-enter the same machine transaction.
- Do not describe the in-memory rollback adapter as crash-proof: a process/world crash between separate inventory writes still requires a persistent journal or an engine-provided atomic operation.

### Current automated coverage

The engine-independent transaction adapter now returns storage_read_failed when a storage read throws, and its tests cover that path plus same-store re-entrant calls. These tests validate the adapter contract only; they do not validate Minecraft persistence, UI opening, or crash consistency.

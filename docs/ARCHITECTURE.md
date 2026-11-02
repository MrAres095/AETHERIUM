# AETHERIUM architecture

## Core responsibilities

Aetherium Core is the shared foundation. It must remain small and stable so that individual systems can evolve without duplicating common logic.

Core will eventually own:
- Stable identifiers and naming conventions (`aetherium:` namespace).
- Shared item, block, machine, and recipe definitions.
- Common energy and inventory contracts.
- Feature flags and configuration defaults.
- Progression/unlock integration points.
- Compatibility checks and diagnostics.
- Shared UI conventions and guidebook data.

## Module boundaries

Each planned module owns its gameplay content and depends on Core rather than reaching into another module's private implementation.

- Power defines generation and storage providers.
- Industry defines processing machines and processing recipes. The first planned machine is the universal Grinder, with a baseline yield of 2 units of mapped primary material per supported ore block. It will use an explicit ore-to-output registry for vanilla ores, all AETHERIUM ores, and optional third-party compatibility entries. Machine processing must preserve outputs when inventories are full and must not duplicate items across unloads or restarts.
- Logistics moves resources between inventories and endpoints.
- Network provides digital storage, crafting orchestration, and remote transfer.
- Automation plans and schedules production using interfaces exposed by other modules.
- Reactors provides advanced generation.
- Nature provides a separate nature-energy progression path and optional conversion.
- The Lost Realms provides exploration content and resources used by later progression.

## Technical direction

Use Bedrock's supported add-on formats first. Introduce Script API only when a feature needs runtime behavior and after its API version is verified against the target Bedrock release.

Avoid assuming Java Edition mod-loader features exist in Bedrock. Every proposed mechanic must be checked against Bedrock's actual data-driven and Script API capabilities.

## Performance and mobile constraints

- Prefer event-driven work over per-tick scans.
- Bound searches, queues, and network operations.
- Avoid loading or iterating over large areas unnecessarily.
- Keep UI and storage operations responsive on Android devices.
- Make expensive automation explicit and configurable.

## Current scope

The initial milestone is only a minimal importable behavior pack and a repeatable smoke test. The architecture above is the intended direction, not a claim that these systems already exist.


## Grinder runtime architecture decision

The universal Grinder recipe registry is independent from its future machine UI and storage implementation. Because the project currently targets Bedrock 1.21.0, do not assume experimental custom block containers are available as a stable feature. The first runtime prototype should investigate an entity-backed inventory/display adapter while retaining a block-like machine appearance. A block-hosted container may replace that adapter only after stable Android and BDS compatibility is demonstrated. Keep processing transactional and persistent; never consume input unless the complete output can be committed safely.

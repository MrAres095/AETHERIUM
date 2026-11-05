"use strict";

const TOOL_SETTINGS_SCHEMA = 1;
const TOOL_SETTINGS_KEY = "aetherium:tool_settings";
const SUPPORTED_TOOL_IDS = Object.freeze(["chainsaw", "drill"]);

function validateToolSettings(settings, expectedToolId, drillMode = "ultimate") {
  if (!SUPPORTED_TOOL_IDS.includes(expectedToolId)) return { ok: false, reason: "unsupported_tool" };
  if (expectedToolId === "drill" && drillMode !== "ultimate") return { ok: false, reason: "vein_miner_unavailable" };
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return { ok: false, reason: "invalid_tool_settings" };
  if (settings.schema !== TOOL_SETTINGS_SCHEMA || settings.toolId !== expectedToolId || typeof settings.veinMinerEnabled !== "boolean") return { ok: false, reason: "invalid_tool_settings" };
  return { ok: true, settings: { schema: TOOL_SETTINGS_SCHEMA, toolId: expectedToolId, veinMinerEnabled: settings.veinMinerEnabled } };
}
function createDefaultToolSettings(toolId) {
  if (!SUPPORTED_TOOL_IDS.includes(toolId)) return { ok: false, reason: "unsupported_tool" };
  return { ok: true, settings: { schema: TOOL_SETTINGS_SCHEMA, toolId, veinMinerEnabled: false } };
}
function serializeToolSettings(settings, expectedToolId, drillMode = "ultimate") {
  const checked = validateToolSettings(settings, expectedToolId, drillMode);
  return checked.ok ? { ok: true, state: JSON.stringify(checked.settings) } : checked;
}
function deserializeToolSettings(rawState, expectedToolId, drillMode = "ultimate") {
  const defaults = createDefaultToolSettings(expectedToolId);
  if (!defaults.ok) return defaults;
  if (expectedToolId === "drill" && drillMode !== "ultimate") return { ok: false, reason: "vein_miner_unavailable" };
  if (rawState === undefined || rawState === null || rawState === "") return { ok: true, settings: defaults.settings, created: true };
  if (typeof rawState !== "string" || rawState.length > 256) return { ok: false, reason: "invalid_persistent_state" };
  let parsed;
  try { parsed = JSON.parse(rawState); } catch { return { ok: false, reason: "malformed_persistent_state" }; }
  const checked = validateToolSettings(parsed, expectedToolId, drillMode);
  return checked.ok ? { ...checked, created: false } : checked;
}
function readToolSettingsFromItem(itemStack, expectedToolId, drillMode = "ultimate") {
  if (!itemStack || typeof itemStack.getDynamicProperty !== "function") return { ok: false, reason: "item_dynamic_properties_unavailable" };
  let raw;
  try { raw = itemStack.getDynamicProperty(TOOL_SETTINGS_KEY); } catch { return { ok: false, reason: "item_state_read_failed" }; }
  return deserializeToolSettings(raw, expectedToolId, drillMode);
}
function writeToolSettingsToItem(itemStack, settings, expectedToolId, drillMode = "ultimate") {
  if (!itemStack || typeof itemStack.setDynamicProperty !== "function") return { ok: false, reason: "item_dynamic_properties_unavailable" };
  const encoded = serializeToolSettings(settings, expectedToolId, drillMode);
  if (!encoded.ok) return encoded;
  try { itemStack.setDynamicProperty(TOOL_SETTINGS_KEY, encoded.state); } catch { return { ok: false, reason: "item_state_write_failed" }; }
  return { ok: true, itemStack };
}
function setVeinMinerEnabled(itemStack, toolId, enabled, drillMode = "ultimate") {
  if (typeof enabled !== "boolean") return { ok: false, reason: "invalid_vein_miner_setting" };
  const current = readToolSettingsFromItem(itemStack, toolId, drillMode);
  if (!current.ok) return current;
  const settings = { ...current.settings, veinMinerEnabled: enabled };
  const saved = writeToolSettingsToItem(itemStack, settings, toolId, drillMode);
  return saved.ok ? { ok: true, itemStack, settings } : saved;
}
function getVeinMinerEnabled(itemStack, toolId, drillMode = "ultimate") {
  const current = readToolSettingsFromItem(itemStack, toolId, drillMode);
  return current.ok ? { ok: true, enabled: current.settings.veinMinerEnabled, created: current.created } : current;
}
module.exports = {
  TOOL_SETTINGS_SCHEMA, TOOL_SETTINGS_KEY, SUPPORTED_TOOL_IDS,
  validateToolSettings, createDefaultToolSettings, serializeToolSettings,
  deserializeToolSettings, readToolSettingsFromItem, writeToolSettingsToItem,
  setVeinMinerEnabled, getVeinMinerEnabled,
};

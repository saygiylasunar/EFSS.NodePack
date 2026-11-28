/**
 * EFSS Node Appearance state.
 * Native LiteGraph color fields and node.properties persist with workflows.
 * No top-level ComfyUI dependencies: this module is contract-testable.
 */

export const COLOR_PRESETS = Object.freeze([
  Object.freeze({ id: "noir", name: "Noir", color: "#394756", bgcolor: "#121b27" }),
  Object.freeze({ id: "teal", name: "Teal", color: "#376a6b", bgcolor: "#152d34" }),
  Object.freeze({ id: "azure", name: "Azure", color: "#365d87", bgcolor: "#17283e" }),
  Object.freeze({ id: "amethyst", name: "Amethyst", color: "#72568f", bgcolor: "#2c213d" }),
  Object.freeze({ id: "amber", name: "Amber", color: "#90673d", bgcolor: "#382a1c" }),
  Object.freeze({ id: "rose", name: "Rose", color: "#89546e", bgcolor: "#37202d" }),
  Object.freeze({ id: "forest", name: "Forest", color: "#4c795f", bgcolor: "#1d3429" }),
  Object.freeze({ id: "orchid", name: "Orchid", color: "#794567", bgcolor: "#281e2c" }),
  Object.freeze({ id: "blossom", name: "Blossom", color: "#8b496b", bgcolor: "#382331" }),
  Object.freeze({ id: "fern", name: "Fern", color: "#38634b", bgcolor: "#192b20" }),
]);

export const ICON_PRESETS = Object.freeze([
  Object.freeze({ id: "note", name: "Note", glyph: "✎" }),
  Object.freeze({ id: "star", name: "Favorite", glyph: "★" }),
  Object.freeze({ id: "model", name: "Model", glyph: "◆" }),
  Object.freeze({ id: "image", name: "Image", glyph: "▧" }),
  Object.freeze({ id: "output", name: "Output", glyph: "↗" }),
  Object.freeze({ id: "warning", name: "Warning", glyph: "⚠" }),
  Object.freeze({ id: "process", name: "Process", glyph: "⚙" }),
  Object.freeze({ id: "flower", name: "Flower", glyph: "✿" }),
  Object.freeze({ id: "sparkle", name: "Sparkle", glyph: "✦" }),
]);

const COLOR_BY_ID = new Map(COLOR_PRESETS.map((preset) => [preset.id, preset]));
const ICON_BY_ID = new Map(ICON_PRESETS.map((icon) => [icon.id, icon]));

export function nodeIdLabel(node) {
  // IDs are graph-local and may be numbers or strings on modern frontends.
  const id = node?.id;
  if (typeof id === "number" ? !Number.isSafeInteger(id) || id < 0 :
      typeof id !== "string" || !id.trim() || id === "-1") return "Unassigned";
  return "#" + String(id);
}

export function getIcon(node) {
  const iconId = node?.properties?.efssNodeIcon;
  return ICON_BY_ID.get(iconId) ?? null;
}

export function getColorPreset(node) {
  if (!node || !node.color || !node.bgcolor) return null;
  return COLOR_PRESETS.find((preset) =>
    preset.color === node.color && preset.bgcolor === node.bgcolor
  ) ?? null;
}

export function applyColorPreset(node, presetId) {
  if (!node || (presetId !== null && !COLOR_BY_ID.has(presetId))) return false;
  const preset = presetId === null ? null : COLOR_BY_ID.get(presetId);
  if (typeof node.setColorOption === "function") {
    node.setColorOption(preset ? { color: preset.color, bgcolor: preset.bgcolor } : null);
  } else {
    node.color = preset?.color;
    node.bgcolor = preset?.bgcolor;
  }
  return true;
}

export function applyNodeIcon(node, iconId) {
  if (!node || (iconId !== null && !ICON_BY_ID.has(iconId))) return false;
  if (!node.properties || typeof node.properties !== "object") node.properties = {};
  // An empty string is intentional, serializable "no icon".
  const value = iconId ?? "";
  if (typeof node.setProperty === "function") {
    node.setProperty("efssNodeIcon", value);
  } else {
    node.properties.efssNodeIcon = value;
  }
  return node.properties?.efssNodeIcon === value;
}

/** Draw a minimal glyph in Classic LiteGraph's title band. */
export function drawNodeIcon(node, ctx) {
  const icon = getIcon(node);
  if (!icon || !ctx) return false;
  const methods = ["save", "restore", "beginPath", "arc", "fill", "stroke", "fillText"];
  if (!methods.every((method) => typeof ctx[method] === "function")) return false;
  // Modern LiteGraph may expose a typed array for node dimensions.
  const width = node?.renderingSize?.[0] ?? node?.size?.[0];
  if (!Number.isFinite(width) || width < 70) return false;
  const x = width - 14;
  const y = -14;

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#071723";
    ctx.fill();
    ctx.strokeStyle = "#9de0d8";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f2fbfc";
    ctx.fillText(icon.glyph, x, y + 0.5);
  } finally {
    ctx.restore();
  }
  return true;
}

/**
 * Optimistic conflict guard for appearance edits. Only selected fields count:
 * concurrent icon changes do not invalidate a color-only edit and vice versa.
 */
export function appearanceConflict(node, initial, { color = false, icon = false } = {}) {
  if (!node || !initial) return true;
  return Boolean(
    (color && (node.color !== initial.color || node.bgcolor !== initial.bgcolor)) ||
    (icon && node.properties?.efssNodeIcon !== initial.icon)
  );
}

/** Compose a node-local title callback without changing native callback semantics. */
export function composeTitleRenderer(original) {
  return function (...args) {
    const result = typeof original === "function" ? original.apply(this, args) : undefined;
    try {
      drawNodeIcon(this, args[0]);
    } catch {
      // Optional decoration must not interrupt native graph drawing.
    }
    return result;
  };
}

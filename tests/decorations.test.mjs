import assert from "node:assert/strict";
import test from "node:test";
import {
  COLOR_PRESETS, ICON_PRESETS, nodeIdLabel, getIcon, getColorPreset,
  applyColorPreset, applyNodeIcon, drawNodeIcon, appearanceConflict,
} from "../web/decorations.mjs";

function fixture() {
  return {
    id: "42",
    title: "KSampler",
    type: "KSampler",
    size: [180, 130],
    properties: { custom: "unchanged" },
    color: "#994455",
    bgcolor: "#221122",
  };
}

test("node IDs preserve string and numeric IDs without confusing execution order", () => {
  assert.equal(nodeIdLabel({ id: "14" }), "#14");
  assert.equal(nodeIdLabel({ id: 0 }), "#0");
  assert.equal(nodeIdLabel({ id: "1:2:3" }), "#1:2:3");
  assert.equal(nodeIdLabel({ id: null }), "Unassigned");
});

test("preset identifiers are unique and provide distinct header and body colors", () => {
  assert.equal(new Set(COLOR_PRESETS.map((color) => color.id)).size, COLOR_PRESETS.length);
  assert.equal(new Set(ICON_PRESETS.map((icon) => icon.id)).size, ICON_PRESETS.length);
  for (const preset of COLOR_PRESETS) {
    assert.match(preset.color, /^#[0-9a-f]{6}$/i);
    assert.match(preset.bgcolor, /^#[0-9a-f]{6}$/i);
    assert.notEqual(preset.color, preset.bgcolor);
  }
});

test("colors use native node fields, do not mutate titles or unrelated properties", () => {
  const node = fixture();
  assert.equal(applyColorPreset(node, "teal"), true);
  assert.equal(node.color, COLOR_PRESETS.find((preset) => preset.id === "teal").color);
  assert.equal(node.bgcolor, COLOR_PRESETS.find((preset) => preset.id === "teal").bgcolor);
  assert.equal(getColorPreset(node).id, "teal");
  assert.equal(node.title, "KSampler");
  assert.deepEqual(node.properties, { custom: "unchanged" });
});

test("existing native color setter is preferred, removal uses null", () => {
  const received = [];
  const node = {
    setColorOption(option) { received.push(option); },
  };
  assert.equal(applyColorPreset(node, "noir"), true);
  assert.deepEqual(received[0], {
    color: COLOR_PRESETS[0].color, bgcolor: COLOR_PRESETS[0].bgcolor,
  });
  assert.equal(applyColorPreset(node, null), true);
  assert.equal(received[1], null);
});

test("invalid color IDs are rejected without changing appearance", () => {
  const node = fixture();
  const original = { color: node.color, bgcolor: node.bgcolor };
  assert.equal(applyColorPreset(node, "javascript:alert(1)"), false);
  assert.equal(node.color, original.color);
  assert.equal(node.bgcolor, original.bgcolor);
  assert.equal(applyColorPreset(null, "teal"), false);
});

test("icon metadata is stored in native node properties and can be reset", () => {
  const node = fixture();
  assert.equal(applyNodeIcon(node, "note"), true);
  assert.equal(node.properties.efssNodeIcon, "note");
  assert.equal(node.title, "KSampler");
  assert.equal(node.properties.custom, "unchanged");
  assert.equal(getIcon(node).glyph, "✎");
  assert.equal(applyNodeIcon(node, null), true);
  assert.equal(node.properties.efssNodeIcon, "");
  assert.equal(getIcon(node), null);
});

test("an existing setProperty callback is used for persistence", () => {
  const node = {
    properties: {},
    setProperty(name, value) { this.properties[name] = value; },
  };
  assert.equal(applyNodeIcon(node, "warning"), true);
  assert.equal(node.properties.efssNodeIcon, "warning");
});

test("unknown icons do not render and cannot inject arbitrary SVG or HTML", () => {
  const node = fixture();
  assert.equal(applyNodeIcon(node, '<img src=x onerror="alert(1)">'), false);
  node.properties.efssNodeIcon = '<svg onload="alert(1)">';
  assert.equal(getIcon(node), null);
  assert.equal(drawNodeIcon(node, {}), false);
});

test("icon metadata round-trips as a normal workflow node property", () => {
  const original = fixture();
  applyColorPreset(original, "amethyst");
  applyNodeIcon(original, "star");
  const restored = JSON.parse(JSON.stringify(original));
  assert.equal(getIcon(restored).glyph, "★");
  assert.equal(getColorPreset(restored).id, "amethyst");
  assert.equal(restored.title, "KSampler");
});

test("renderer is inert without icons and draws only to saved canvas context", () => {
  const calls = [];
  const ctx = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    arc: (...args) => calls.push(["arc", ...args]),
    fill: () => calls.push("fill"),
    stroke: () => calls.push("stroke"),
    fillText: (...args) => calls.push(["fillText", ...args]),
  };
  const node = fixture();
  assert.equal(drawNodeIcon(node, ctx), false);
  assert.deepEqual(calls, []);
  applyNodeIcon(node, "output");
  assert.equal(drawNodeIcon(node, ctx), true);
  assert.equal(calls[0], "save");
  assert.equal(calls.at(-1), "restore");
  assert.equal(calls.filter((x) => Array.isArray(x) && x[0] === "fillText").length, 1);
});

test("very narrow nodes skip icon rendering without crashing", () => {
  const node = { properties: { efssNodeIcon: "warning" }, size: [45, 85] };
  assert.equal(drawNodeIcon(node, {}), false);
});


test("renderer supports typed-array node dimensions used by LiteGraph", () => {
  const calls = [];
  const ctx = {
    save() { calls.push("save"); },
    restore() { calls.push("restore"); },
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    fillText() { calls.push("icon"); },
  };
  const node = {
    properties: { efssNodeIcon: "process" },
    size: new Float32Array([180, 120]),
  };
  assert.equal(drawNodeIcon(node, ctx), true);
  assert.deepEqual(calls, ["save", "icon", "restore"]);
});

test("renderingSize overrides stale size when LiteGraph provides both", () => {
  let arcX = null;
  const ctx = {
    save() {}, restore() {}, beginPath() {},
    arc(x) { arcX = x; }, fill() {}, stroke() {}, fillText() {},
  };
  const node = {
    properties: { efssNodeIcon: "note" },
    size: [80, 80],
    renderingSize: new Float32Array([240, 120]),
  };
  assert.equal(drawNodeIcon(node, ctx), true);
  assert.equal(arcX, 226);
});

test("renderer always restores canvas state after a drawing failure", () => {
  let restored = false;
  const ctx = {
    save() {}, restore() { restored = true; },
    beginPath() { throw new Error("canvas lost"); },
  };
  assert.throws(() => drawNodeIcon({
    size: [150, 100], properties: { efssNodeIcon: "star" },
  }, ctx), /canvas lost/);
  assert.equal(restored, true);
});

test("appearance conflicts ignore unrelated edits and protect selected native fields", () => {
  const node = fixture();
  const initial = {
    color: node.color, bgcolor: node.bgcolor,
    icon: node.properties.efssNodeIcon,
  };
  node.properties.efssNodeIcon = "note";
  assert.equal(appearanceConflict(node, initial, { color: true }), false);
  assert.equal(appearanceConflict(node, initial, { icon: true }), true);
  assert.equal(appearanceConflict(node, initial, {}), false);
  node.color = "#123456";
  assert.equal(appearanceConflict(node, initial, { color: true }), true);
  assert.equal(appearanceConflict(node, initial, { icon: true }), true);
});

test("appearance conflicts fail closed on missing node snapshots", () => {
  assert.equal(appearanceConflict(null, {}, { color: true }), true);
  assert.equal(appearanceConflict({}, null, { icon: true }), true);
  assert.equal(appearanceConflict({ color: "#000" }, { color: "#111" }, { color: true }), true);
});

 test("native property rejection is reported without overriding metadata", () => {
  const node = { properties: { efssNodeIcon: "note" }, setProperty() {} };
  assert.equal(applyNodeIcon(node, "star"), false);
  assert.equal(getIcon(node).id, "note");
});

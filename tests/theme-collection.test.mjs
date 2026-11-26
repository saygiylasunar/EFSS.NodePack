import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { COLOR_PRESETS, ICON_PRESETS } from "../web/decorations.mjs";

const themesDir = fileURLToPath(new URL("../themes/", import.meta.url));
const names = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();
const palettes = names.map((name) => ({
  filename: name,
  data: JSON.parse(readFileSync(join(themesDir, name), "utf8")),
}));
const requiredNames = ["efss-aero.json", "efss-carbon.json", "efss-fairy-garden.json", "efss-midnight.json", "efss-moss.json", "efss-pearl.json"];
const base = palettes.find(({ data }) => data.id === "efss-midnight")?.data;

test("all six opt-in EFSS themes are present and independently importable", () => {
  for (const name of requiredNames) assert.ok(names.includes(name), name);
  assert.ok(base, "Midnight remains present");
});

test("palette IDs are unique, stable, and match their filenames", () => {
  const ids = palettes.map(({ data }) => data.id);
  assert.equal(ids.length, new Set(ids).size);
  for (const { filename, data } of palettes) {
    assert.equal(filename, data.id + ".json");
    assert.equal(data.name, "EFSS | " + data.id.slice(5).split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
    assert.deepEqual(Object.keys(data.colors).sort(), ["comfy_base", "litegraph_base", "node_slot"].sort());
  }
});

test("each new palette preserves all native baseline ComfyUI color keys and value types", () => {
  for (const { data } of palettes) {
    for (const key of Object.keys(base.colors)) {
      const initial = base.colors[key];
      const actual = data.colors[key];
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(initial).sort(), data.id + "." + key);
      for (const name of Object.keys(initial)) {
        assert.equal(typeof actual[name], typeof initial[name], data.id + "." + key + "." + name);
      }
    }
  }
});

test("themes remain CSS-color-only data with no references to scripts or URLs", () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const rgba = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0?(?:\.\d+)?|1(?:\.0+)?)\s*\)(?:\s+0\s+0\s+0\.5rem)?$/i;
  for (const { data } of palettes) {
    assert.doesNotMatch(JSON.stringify(data), /<script|javascript:|https?:\/\/|url\(/i);
    for (const [sectionName, section] of Object.entries(data.colors)) {
      for (const [key, val] of Object.entries(section)) {
        const label = data.id + "." + sectionName + "." + key;
        if (typeof val === "number") {
          assert.ok(Number.isFinite(val), label);
        } else {
          assert.ok(typeof val === "string" && (val === "" || hex.test(val) || rgba.test(val)), label);
        }
      }
    }
  }
});

function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/.{2}/g).map((x) => parseInt(x, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

test("all palettes maintain at least 4.5:1 contrast on core foreground/background pairs", () => {
  for (const { data } of palettes) {
    const c = data.colors.comfy_base, l = data.colors.litegraph_base;
    const pairs = {
      canvas: [c["fg-color"], c["bg-color"]],
      menu: [c["fg-color"], c["comfy-menu-bg"]],
      content: [c["content-fg"], c["content-bg"]],
      node: [l.NODE_TEXT_COLOR, l.NODE_DEFAULT_BGCOLOR],
      title: [l.NODE_TITLE_COLOR, l.NODE_DEFAULT_COLOR],
      widget: [l.WIDGET_TEXT_COLOR, l.WIDGET_BGCOLOR],
    };
    for (const [name, [fg, bg]] of Object.entries(pairs)) {
      assert.ok(contrast(fg, bg) >= 4.5,
        data.id + " " + name + " contrast: " + contrast(fg, bg).toFixed(2));
    }
  }
});

test("new palettes have distinct canvas and node colors", () => {
  const canvasValues = palettes.map(({ data }) => data.colors.comfy_base["bg-color"]);
  const nodeValues = palettes.map(({ data }) => data.colors.litegraph_base.NODE_DEFAULT_BGCOLOR);
  assert.equal(new Set(canvasValues).size, canvasValues.length);
  assert.equal(new Set(nodeValues).size, nodeValues.length);
});

 test("Fairy Garden is independent of native node overrides and icon metadata", () => {
  const fairy = palettes.find(({ data }) => data.id === "efss-fairy-garden").data;
  assert.deepEqual(Object.keys(fairy).sort(), ["colors", "id", "name"]);
  assert.ok(COLOR_PRESETS.some(p => p.id === "orchid"));
  assert.ok(ICON_PRESETS.some(p => p.id === "flower"));
  assert.doesNotMatch(JSON.stringify(fairy), /efssNodeIcon|setColorOption|onDrawTitle/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const palette = JSON.parse(readFileSync(
  new URL("../themes/efss-midnight.json", import.meta.url), "utf8"
));

test("Midnight remains an importable, opt-in ComfyUI color palette", () => {
  assert.equal(palette.id, "efss-midnight");
  assert.equal(palette.name, "EFSS | Midnight");
  assert.deepEqual(
    Object.keys(palette.colors).sort(),
    ["comfy_base", "litegraph_base", "node_slot"].sort()
  );
});

test("Midnight palette uses finite native values and valid CSS color strings", () => {
  const colorPattern = /^(?:#[0-9a-f]{6}|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*\)(?:\s+0\s+0\s+0\.5rem)?)$/i;
  for (const [section, entries] of Object.entries(palette.colors)) {
    assert.ok(entries && typeof entries === "object", section);
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === "number") {
        assert.ok(Number.isFinite(value), section + "." + key);
      } else {
        assert.equal(typeof value, "string", section + "." + key);
        if (value !== "") {
          assert.match(value, colorPattern, section + "." + key);
        }
      }
    }
  }
});

test("palette is data-only and does not embed scripts or external URLs", () => {
  const source = JSON.stringify(palette);
  assert.doesNotMatch(source, /<script|javascript:|https?:\/\//i);
});

# EFSS.NodePack

**A focused Markdown note node, optional node appearance tools, and six opt-in ComfyUI color palettes.**

EFSS.NodePack deliberately keeps the two features independent:

- **EFSS Markdown Note** is a normal Python-backed ComfyUI node. Its source text lives in ComfyUI's native `markdown` widget and is saved with the workflow. Its output is the *original, unmodified* Markdown string. Nothing is parsed on the server.
- **EFSS Markdown editor** is an optional frontend enhancement. Right-click an EFSS Markdown Note → **Edit EFSS Markdown** for a source editor with safe live preview and small formatting controls. Editing is transactional: **Apply** saves, **Cancel** discards.
- **EFSS Themes** are six independently importable ComfyUI color-palette JSON files. They do **not** automatically replace the user's existing theme or inject site-wide styling.

## Install

From your ComfyUI directory:

```powershell
git clone https://github.com/saygiylasunar/EFSS.NodePack.git custom_nodes/EFSS.NodePack
```

Restart ComfyUI and hard-refresh the browser. Add **EFSS → Notes → EFSS Markdown Note**. Edit using the built-in Markdown field, or right-click the node to open the EFSS editor.

## EFSS theme collection

The following themes are shipped as **independent, optional palettes**:

| Palette | File | Visual direction |
| --- | --- | --- |
| **Midnight** | `themes/efss-midnight.json` | Deep navy / muted teal, the original default dark palette |
| **Carbon** | `themes/efss-carbon.json` | Minimal charcoal / steel, restrained dark alternative |
| **Pearl** | `themes/efss-pearl.json` | Light cool grey / ink, a bright workspace |
| **Moss** | `themes/efss-moss.json` | Forest green / warm sage, a quiet dark workspace |
| **Aero** | `themes/efss-aero.json` | Bright cyan / glass-inspired blue, retro-futurist color palette |
| **Fairy Garden** | `themes/efss-fairy-garden.json` | Dark forest green, lavender-purple nodes, rose-pink blossoms and pastel accents |

Open **Settings → Appearance → Color Palette → Load** in ComfyUI and import
the JSON file you want from the `themes/` directory. The exact wording
of the import action may differ by ComfyUI frontend version. The chosen
palette is opt-in; adding EFSS.NodePack to `custom_nodes` does not
automatically activate a theme or replace a saved preference.


**Fairy Garden** deliberately uses the standard palette format: forest-green
canvas and menus, purple node title bars, blush-pink links, and pastel input
slot accents. The theme evokes a colorful flower garden but **does not place
literal flowers, imagery, wallpaper or animations on the canvas**; those would
require a separate, opt-in decoration layer and frontend compatibility tests.

**Aero is a color palette, not a glass-blur effect or CSS theme.** ComfyUI's
native palette format controls colors, not textures or translucency. For
consistent behavior and upgrade safety, EFSS does not patch global CSS
to simulate glass. Switching themes must not change the Markdown source,
node icon metadata, per-node color overrides, or workflow graph execution.

All six palettes preserve the same native ComfyUI palette section keys.
CI validates their JSON structures and baseline foreground/background
contrast. Visual parity on current Classic / Nodes 2.0 frontends still
requires manual acceptance testing. For the original Midnight, simply
import `themes/efss-midnight.json`.


## Node appearance: color presets, icons and #IDs

EFSS.NodePack now includes an **optional node appearance dialog for all ordinary
ComfyUI nodes**. Right-click a node → **EFSS · Node appearance…**.

- **Node color:** choose **Noir**, **Teal**, **Azure**, **Amethyst**, **Amber**,
  **Rose**, **Forest**, **Orchid**, **Blossom** or **Fern**. **Default** removes header/body color overrides.
  The colors use native LiteGraph `node.color` and `node.bgcolor` fields, so
  they persist in workflow JSON and still render without EFSS.NodePack installed.
  Your pre-existing custom colors remain untouched until you choose a swatch.
- **Node icon:** choose Note, Favorite, Model, Image, Output, Warning, Process,
  Flower and Sparkle, or select None. Icons use an allowlisted Unicode glyph, with only the
  selected icon ID stored as `node.properties.efssNodeIcon`. The icon is drawn
  on the **Classic LiteGraph** title bar with a node-local drawing callback;
  it does not edit node titles or patch global prototypes. **Nodes 2.0 / Vue
  header rendering has not been verified and may not show these icons.**
- **Node number:** the dialog displays the graph-local `#ID`. For a visible
  ID badge directly on every node, use **ComfyUI's native Node ID badge**
  option in its settings (search settings for *Node ID* or *node badges*).
  The ID is the node's identifier in its graph, **not its execution position**
  and not a global consecutive node count. This avoids a competing EFSS
  overlay that would duplicate ComfyUI's built-in badge.

Color and icon selections are applied only after **Apply**. **Cancel** leaves
the node unchanged. Changes to the same node made outside the dialog while
it is open trigger an overwrite warning. The two appearance features are
independent of the Markdown node and all optional themes, including Fairy Garden.

### Appearance compatibility notes

- The node-local Classic title callback forwards all original arguments and
  preserves the original return value and exceptions. Missing canvas methods
  skip EFSS drawing; decoration-only drawing failures do not interrupt native
  drawing. These isolated contracts do not establish live frontend compatibility.

- No extra Python package, external font pack, SVG fetch or CDNs.
- No automatic recoloring, no global prototype modifications, no new widgets
  on existing nodes. Icon rendering is installed only on nodes with an EFSS
  icon, and the original per-instance title drawing callback is preserved.
- Colors and icon metadata are serialized using standard workflow fields.
  If EFSS.NodePack is absent, icon metadata remains inert, while native
  node colors continue working. Existing workflow titles are untouched.
- ComfyUI frontend versions can change appearance/context-menu hooks. Until
  a live Classic + Nodes 2.0 smoke test passes, appearance UI remains
  **integration-unverified**, although isolated JavaScript tests run in CI.

## Markdown scope (v0.1)

The preview supports headings, paragraphs, inline **bold** / *italic* / ~~strike~~ / `code`, HTTPS/HTTP links, bullet and numbered lists, task lists, blockquotes, fenced code, horizontal separators and familiar `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` / `> [!IMPORTANT]` / `> [!CAUTION]` callouts.

**EFSS Markdown source is authoritative.** Unsupported or future EFSS extensions remain as literal source text. Preview is a deliberately conservative subset; it is **not** a full EFSS Markdown serializer or a WYSIWYG conversion layer. Editing does not remove unrecognized content or rewrite line endings. Original Markdown is always returned intact by the Python node.

The preview escapes source HTML, rejects unsafe links and never executes code, scripts, remote images or embedded HTML. No CDN, Python package dependency, external JavaScript library or server endpoint is required.

Inline code in HTTP(S) link labels is rendered as escaped code. Link destinations containing protected inline-code fragments are left as text rather than converted into anchors. Private-use Unicode characters remain literal in the preview.

## Architecture

```text
__init__.py                    ComfyUI node registration, pure string passthrough
web/efss_extension.js          Optional editor/context-menu extension
web/markdown.mjs               Pure escape-first Markdown preview renderer
web/decorations_extension.js   Optional per-node appearance dialog and Classic icon hook
web/decorations.mjs             Pure color/icon model and rendering helpers
web/decorations.css             Scoped appearance dialog CSS
web/efss.css                   Scoped dialog CSS (no global theme overrides)
themes/efss-*.json            Six optional native ComfyUI palettes
tests/                         Python & Node built-in test suites
.github/workflows/ci.yml       Python/JS/JSON validation
```

Node stability policy: use public ComfyUI extension hooks, do not patch LiteGraph or ComfyUI prototypes, do not add extra serialized widgets, do not modify other nodes, and store all persisted content in the native Markdown widget.

## Tests

```bash
python -m unittest discover -s tests -p "test_*.py"
node --test tests/*.test.mjs
python -m json.tool themes/efss-midnight.json  # or any themes/efss-*.json file
```

ComfyUI integration needs a manual smoke test in your local installation: restart, add a note, save/reload workflow, edit/cancel/apply, connect Markdown output to a STRING input, and switch theme back and forth. CI does not claim to replace this live frontend test.


## Mixed newline editing and preservation

The Markdown widget is the sole persisted source. EFSS's editor keeps the
original source unchanged when the user cancels or applies without edits.
For uniformly CRLF or CR-terminated documents, editor changes restore that
original line-ending convention.

For mixed CRLF/CR/LF documents, the editor attempts to retain the original
terminator at stable line boundaries. Reordered unchanged lines and changed
line counts are treated as ambiguous: the editor leaves the newly edited
text's terminators intact rather than assigning historical terminators to
the wrong lines. Toolbar line-prefix actions use each selected line's
terminator, including standalone CR and empty internal lines.

**Important limitation:** A textarea does not expose the exact original
terminator of every edited boundary. When an edit makes boundary identity
ambiguous, preserving the user's edited text is safer than guessing. Do not
claim byte-for-byte lossless round-tripping of *modified* mixed-ending
documents without a real browser test. Unedited Markdown remains authoritative.

## Integration acceptance checklist

These checks must be performed in a running ComfyUI instance before declaring a stable release. Unit tests only cover isolated Python and Markdown contracts.

1. **Registration:** restart ComfyUI and confirm `EFSS Markdown Note` appears under `EFSS/Notes`. Verify the browser console contains no extension errors.
2. **Editor availability:** right-click the node and confirm `Edit EFSS Markdown` appears. If not, treat this as an unresolved frontend compatibility issue; ComfyUI extension hooks vary by frontend version.
3. **Workflow persistence:** create a note containing headings, CRLF line endings, raw HTML, unknown EFSS extensions and Unicode; save the workflow and reload it. Compare the persisted Markdown bytes/string before and after.
4. **Cancel / Apply:** open and cancel without changing the node; reopen and apply a change. Verify a workflow save/reload retains the update.
5. **Concurrency:** while the editor is open, modify the native widget; applying from the editor must refuse to overwrite the newer value.
6. **Theme independence:** import `themes/efss-midnight.json`, change back to the previous palette, and verify the node still works without the theme.
7. **Security:** preview HTML/script payloads and JavaScript URLs. Confirm they render as inert text, not executable markup.
9. **Appearance:** select a Teal color preset, apply and reload workflow; confirm the saved `color` and `bgcolor`, then switch to Default and confirm native overrides clear. Cancel must not mutate color/icon.
10. **Icons:** apply Note, then inspect the rendered title glyph in **Classic** and reload workflow. Confirm `efssNodeIcon` is saved under node `properties`, node title remains unchanged, and None removes it.
11. **Node badges:** enable the built-in Node ID badge and verify `#ID` against the dialog. Verify clones/subgraphs get their own valid local node IDs. In Nodes 2.0, record whether icon rendering is supported instead of claiming compatibility.
8. **Interoperability:** connect the STRING output to a compatible downstream STRING input and verify it receives the original Markdown.

**Known limitation:** the editor's context-menu hook has not yet been verified against a real current ComfyUI frontend. A passing GitHub Actions workflow is not proof that the editor menu appears in the application. Do not label this release production-stable until this check passes.

## License

No third-party license is granted by this repository at present. This project does not adopt MIT or GPL by default.

### Appearance edge cases

A node may reject an icon metadata update through its native property callback.
EFSS reports the rejection rather than forcing the property. If a color was
also applied, that independent color change may remain; reopen the dialog to
inspect the current state. Unassigned or malformed node IDs are displayed as
Unassigned, not as execution indices. The native ID badge remains independent.

### Classic icon dimension guard

Icon drawing requires a complete Canvas 2D drawing interface and a finite numeric node width of at least 70. Typed-array dimensions remain supported; malformed dimensions are skipped without coercion. Optional drawing failures do not suppress native callback errors or return values. These contracts are unit-tested, not a substitute for live Classic or Nodes 2.0 validation.

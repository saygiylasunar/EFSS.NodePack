# EFSS.NodePack

**A focused Markdown note node and an optional midnight palette for ComfyUI.**

EFSS.NodePack deliberately keeps the two features independent:

- **EFSS Markdown Note** is a normal Python-backed ComfyUI node. Its source text lives in ComfyUI's native `markdown` widget and is saved with the workflow. Its output is the *original, unmodified* Markdown string. Nothing is parsed on the server.
- **EFSS Markdown editor** is an optional frontend enhancement. Right-click an EFSS Markdown Note → **Edit EFSS Markdown** for a source editor with safe live preview and small formatting controls. Editing is transactional: **Apply** saves, **Cancel** discards.
- **EFSS Midnight** is an importable ComfyUI color-palette JSON file. It does **not** automatically replace the user's existing theme or inject site-wide styling.

## Install

From your ComfyUI directory:

```powershell
git clone https://github.com/saygiylasunar/EFSS.NodePack.git custom_nodes/EFSS.NodePack
```

Restart ComfyUI and hard-refresh the browser. Add **EFSS → Notes → EFSS Markdown Note**. Edit using the built-in Markdown field, or right-click the node to open the EFSS editor.

To use the optional theme, open **Settings → Appearance → Color Palette → Load** and select `themes/efss-midnight.json`. Theme selection is a separate, reversible action.

## Markdown scope (v0.1)

The preview supports headings, paragraphs, inline **bold** / *italic* / ~~strike~~ / `code`, HTTPS/HTTP links, bullet and numbered lists, task lists, blockquotes, fenced code, horizontal separators and familiar `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` / `> [!IMPORTANT]` / `> [!CAUTION]` callouts.

**EFSS Markdown source is authoritative.** Unsupported or future EFSS extensions remain as literal source text. Preview is a deliberately conservative subset; it is **not** a full EFSS Markdown serializer or a WYSIWYG conversion layer. Editing does not remove unrecognized content or rewrite line endings. Original Markdown is always returned intact by the Python node.

The preview escapes source HTML, rejects unsafe links and never executes code, scripts, remote images or embedded HTML. No CDN, Python package dependency, external JavaScript library or server endpoint is required.

## Architecture

```text
__init__.py                    ComfyUI node registration, pure string passthrough
web/efss_extension.js          Optional editor/context-menu extension
web/markdown.mjs               Pure escape-first Markdown preview renderer
web/efss.css                   Scoped dialog CSS (no global theme overrides)
themes/efss-midnight.json      Optional ComfyUI native palette
tests/                         Python & Node built-in test suites
.github/workflows/ci.yml       Python/JS/JSON validation
```

Node stability policy: use public ComfyUI extension hooks, do not patch LiteGraph or ComfyUI prototypes, do not add extra serialized widgets, do not modify other nodes, and store all persisted content in the native Markdown widget.

## Tests

```bash
python -m unittest discover -s tests -p "test_*.py"
node --test tests/*.test.mjs
python -m json.tool themes/efss-midnight.json
```

ComfyUI integration needs a manual smoke test in your local installation: restart, add a note, save/reload workflow, edit/cancel/apply, connect Markdown output to a STRING input, and switch theme back and forth. CI does not claim to replace this live frontend test.


## Integration acceptance checklist

These checks must be performed in a running ComfyUI instance before declaring a stable release. Unit tests only cover isolated Python and Markdown contracts.

1. **Registration:** restart ComfyUI and confirm `EFSS Markdown Note` appears under `EFSS/Notes`. Verify the browser console contains no extension errors.
2. **Editor availability:** right-click the node and confirm `Edit EFSS Markdown` appears. If not, treat this as an unresolved frontend compatibility issue; ComfyUI extension hooks vary by frontend version.
3. **Workflow persistence:** create a note containing headings, CRLF line endings, raw HTML, unknown EFSS extensions and Unicode; save the workflow and reload it. Compare the persisted Markdown bytes/string before and after.
4. **Cancel / Apply:** open and cancel without changing the node; reopen and apply a change. Verify a workflow save/reload retains the update.
5. **Concurrency:** while the editor is open, modify the native widget; applying from the editor must refuse to overwrite the newer value.
6. **Theme independence:** import `themes/efss-midnight.json`, change back to the previous palette, and verify the node still works without the theme.
7. **Security:** preview HTML/script payloads and JavaScript URLs. Confirm they render as inert text, not executable markup.
8. **Interoperability:** connect the STRING output to a compatible downstream STRING input and verify it receives the original Markdown.

**Known limitation:** the editor's context-menu hook has not yet been verified against a real current ComfyUI frontend. A passing GitHub Actions workflow is not proof that the editor menu appears in the application. Do not label this release production-stable until this check passes.

## License

No third-party license is granted by this repository at present. This project does not adopt MIT or GPL by default.

/**
 * EFSS optional editor for the Python-backed EFSSMarkdownNote.
 * Uses public extension hooks, native persisted widgets and no global patches.
 */
import { app } from "../../scripts/app.js";
import { renderMarkdown } from "./markdown.mjs";

const EXTENSION = "efss.nodepack.markdown";
const CSS_ID = "efss-nodepack-styles";

function loadStyles() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement("link");
  style.id = CSS_ID;
  style.rel = "stylesheet";
  style.href = new URL("./efss.css", import.meta.url).href;
  document.head.append(style);
}

function elt(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function makeButton(text, callback, className = "") {
  const button = elt("button", className, text);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function originalNewlines(text, original) {
  // Restore consistent CRLF documents after edits; untouched input never changes.
  const usesCRLF = original.includes("\r\n") && !/(?<!\r)\n/.test(original);
  return usesCRLF ? text.replace(/\r?\n/g, "\r\n") : text;
}

function openEditor(node) {
  loadStyles();
  const widgets = Array.isArray(node.widgets) ? node.widgets : [];
  const markdownWidget = widgets.find((widget) => widget.name === "markdown");
  const titleWidget = widgets.find((widget) => widget.name === "title");
  if (!markdownWidget) {
    console.warn("[EFSS.NodePack] Native Markdown widget is unavailable.");
    return;
  }

  const initialMarkdown = String(markdownWidget.value ?? "");
  const initialTitle = String(titleWidget?.value ?? "Workflow note");
  let sourceTouched = false;

  const dialog = elt("dialog", "efss-md-dialog");
  dialog.setAttribute("aria-label", "EFSS Markdown editor");
  const shell = elt("div", "efss-dialog-shell");
  const header = elt("header", "efss-dialog-header");
  const heading = elt("div", "efss-dialog-heading");
  heading.append(elt("span", "efss-dialog-kicker", "EFSS / MARKDOWN"),
    elt("h2", "", "Workflow note editor"));
  header.append(heading);
  const titleLabel = elt("label", "efss-field-label", "Title");
  const titleInput = elt("input", "efss-title-input");
  titleInput.type = "text";
  titleInput.value = initialTitle;
  titleInput.maxLength = 200;
  titleLabel.append(titleInput);

  const toolbar = elt("div", "efss-md-toolbar");
  const region = elt("div", "efss-editor-regions");
  const editorPane = elt("section", "efss-pane");
  const editorHeading = elt("h3", "efss-pane-title", "SOURCE · LOSSLESS");
  const sourceInput = elt("textarea", "efss-source");
  sourceInput.setAttribute("aria-label", "Markdown source");
  sourceInput.setAttribute("spellcheck", "false");
  sourceInput.value = initialMarkdown;
  editorPane.append(editorHeading, sourceInput);

  const previewPane = elt("section", "efss-pane efss-preview-pane");
  previewPane.append(elt("h3", "efss-pane-title", "PREVIEW · SAFE SUBSET"));
  const preview = elt("div", "efss-md-preview");
  previewPane.append(preview);
  region.append(editorPane, previewPane);

  const footer = elt("footer", "efss-dialog-footer");
  const status = elt("span", "efss-dialog-status");
  const controls = elt("div", "efss-dialog-controls");
  const close = () => dialog.close();
  const cancel = makeButton("Cancel", close, "efss-btn efss-btn-ghost");
  const apply = makeButton("Apply to workflow", () => {
    // Fail closed rather than overwrite an externally edited workflow value.
    if (String(markdownWidget.value ?? "") !== initialMarkdown ||
        String(titleWidget?.value ?? "Workflow note") !== initialTitle) {
      status.textContent = "Note changed elsewhere. Close and reopen to avoid overwriting it.";
      return;
    }
    if (sourceTouched) {
      const next = originalNewlines(sourceInput.value, initialMarkdown);
      const prior = markdownWidget.value;
      markdownWidget.value = next;
      markdownWidget.callback?.(next);
      node.onWidgetChanged?.("markdown", next, prior, markdownWidget);
    }
    if (titleWidget && titleInput.value !== initialTitle) {
      const prior = titleWidget.value;
      titleWidget.value = titleInput.value;
      titleWidget.callback?.(titleWidget.value);
      node.onWidgetChanged?.("title", titleWidget.value, prior, titleWidget);
    }
    if (sourceTouched || titleInput.value !== initialTitle) {
      node.setDirtyCanvas?.(true, true);
      app.graph?.change?.();
    }
    close();
  }, "efss-btn efss-btn-primary");
  controls.append(cancel, apply);
  footer.append(status, controls);

  const updatePreview = () => {
    // Renderer is escape-first; only its trusted markup reaches innerHTML.
    preview.innerHTML = renderMarkdown(sourceInput.value);
    const chars = sourceInput.value.length;
    const lines = sourceInput.value.split(/\r\n|\r|\n/).length;
    status.textContent = lines + " lines · " + chars + " characters · source preserved";
  };
  sourceInput.addEventListener("input", () => {
    sourceTouched = true;
    updatePreview();
  });

  const surround = (left, right, placeholder) => {
    const begin = sourceInput.selectionStart;
    const end = sourceInput.selectionEnd;
    const value = sourceInput.value.slice(begin, end) || placeholder;
    sourceInput.setRangeText(left + value + right, begin, end, "end");
    sourceInput.focus();
    sourceInput.setSelectionRange(begin + left.length,
      begin + left.length + value.length);
    sourceTouched = true;
    updatePreview();
  };
  const prefixLines = (prefix, placeholder) => {
    const begin = sourceInput.selectionStart;
    const end = sourceInput.selectionEnd;
    const value = sourceInput.value.slice(begin, end) || placeholder;
    const changed = value.split("\n").map((line) => prefix + line).join("\n");
    sourceInput.setRangeText(changed, begin, end, "end");
    sourceInput.focus();
    sourceInput.setSelectionRange(begin, begin + changed.length);
    sourceTouched = true;
    updatePreview();
  };

  const actions = [
    ["B", () => surround("**", "**", "bold text"), "Bold"],
    ["I", () => surround("*", "*", "italic text"), "Italic"],
    ["S", () => surround("~~", "~~", "strikethrough"), "Strike"],
    ["Code", () => surround("\x60", "\x60", "code"), "Inline code"],
    ["H2", () => prefixLines("## ", "Heading"), "Heading"],
    ["List", () => prefixLines("- ", "List item"), "Bullet list"],
    ["Task", () => prefixLines("- [ ] ", "Task"), "Task list"],
    ["Quote", () => prefixLines("> ", "Quotation"), "Blockquote"],
    ["Note", () => prefixLines("> [!NOTE]\n> ", "Callout"), "Note callout"],
  ];
  for (const [label, action, tooltip] of actions) {
    const button = makeButton(label, action, "efss-tool");
    button.title = tooltip;
    button.setAttribute("aria-label", tooltip);
    toolbar.append(button);
  }
  sourceInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      apply.click();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      surround("**", "**", "bold text");
    }
  });

  shell.append(header, titleLabel, toolbar, region, footer);
  dialog.append(shell);
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  updatePreview();
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  sourceInput.focus();
}

app.registerExtension({
  name: EXTENSION,
  setup() {
    loadStyles();
  },
  getNodeMenuItems(node) {
    if (!node || (node.comfyClass !== "EFSSMarkdownNote" &&
      node.type !== "EFSSMarkdownNote")) {
      return [];
    }
    return [
      null,
      {
        content: "Edit EFSS Markdown",
        callback: () => openEditor(node),
      },
    ];
  },
});

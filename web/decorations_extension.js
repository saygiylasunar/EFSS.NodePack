/**
 * EFSS Appearance — optional, isolated node color and icon controls.
 * Never patches LiteGraph prototypes, node titles, widgets, or other extensions.
 */
import { app } from "../../scripts/app.js";
import {
  COLOR_PRESETS, ICON_PRESETS, nodeIdLabel, getIcon,
  getColorPreset, applyColorPreset, applyNodeIcon, composeTitleRenderer,
  appearanceConflict,
} from "./decorations.mjs";

const installed = new WeakSet();
const openDialogs = new WeakMap();
const CSS_ID = "efss-appearance-styles";

function installIconRenderer(node) {
  if (!node || installed.has(node) || !getIcon(node)) return;
  node.onDrawTitle = composeTitleRenderer(node.onDrawTitle);
  installed.add(node);
}

function loadStyles() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement("link");
  link.id = CSS_ID;
  link.rel = "stylesheet";
  link.href = new URL("./decorations.css", import.meta.url).href;
  document.head.append(link);
}

function element(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function button(label, className, callback) {
  const b = element("button", className, label);
  b.type = "button";
  b.addEventListener("click", callback);
  return b;
}

function openAppearanceDialog(node) {
  const previous = openDialogs.get(node);
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  loadStyles();
  const initial = {
    color: node.color,
    bgcolor: node.bgcolor,
    icon: node.properties?.efssNodeIcon,
  };
  const originalPreset = getColorPreset(node);
  let draftColor = originalPreset?.id ?? null;
  let draftIcon = getIcon(node)?.id ?? null;
  let colorTouched = false;
  let iconTouched = false;

  const dialog = element("dialog", "efss-appearance-dialog");
  dialog.setAttribute("aria-label", "EFSS node appearance");
  const heading = element("header", "efss-appearance-header");
  heading.append(
    element("span", "efss-appearance-kicker", "EFSS / NODE APPEARANCE"),
    element("h2", "", "Node appearance")
  );

  const nodeInfo = element("div", "efss-appearance-node");
  const typeText = String(node.title || node.type || "Untitled node");
  nodeInfo.append(
    element("span", "efss-appearance-node-name", typeText),
    element("code", "efss-appearance-node-id", nodeIdLabel(node))
  );

  const colorSection = element("fieldset", "efss-appearance-fieldset");
  colorSection.append(element("legend", "", "Node color"));
  const colorHint = element("p", "efss-appearance-hint",
    "Applies the standard LiteGraph header/body color fields. Saved with the workflow.");
  colorSection.append(colorHint);
  const colors = element("div", "efss-appearance-options");
  const colorButtons = [];

  function updateSelection(buttons, selection) {
    for (const [b, value] of buttons) {
      b.setAttribute("aria-pressed", String(value === selection));
    }
  }

  const colorItems = [
    { id: null, name: "Default", color: "#344356", bgcolor: "#172331" },
    ...COLOR_PRESETS,
  ];
  for (const item of colorItems) {
    const b = button(item.name, "efss-appearance-swatch", () => {
      draftColor = item.id;
      colorTouched = true;
      updateSelection(colorButtons, draftColor);
    });
    b.style.setProperty("--efss-swatch-color", item.color);
    b.style.setProperty("--efss-swatch-bg", item.bgcolor);
    b.title = item.id === null ? "Remove node color overrides" :
      item.name + " color scheme";
    colorButtons.push([b, item.id]);
    colors.append(b);
  }
  colorSection.append(colors);
  updateSelection(colorButtons, draftColor);
  if (!originalPreset && node.color) {
    colorSection.append(element("p", "efss-appearance-hint",
      "Current custom color is preserved unless you pick a swatch."));
  }

  const iconSection = element("fieldset", "efss-appearance-fieldset");
  iconSection.append(element("legend", "", "Node icon"));
  iconSection.append(element("p", "efss-appearance-hint",
    "A small badge on the Classic LiteGraph title bar; no change to the actual node title."));
  const icons = element("div", "efss-appearance-options");
  const iconButtons = [];
  for (const item of [{ id: null, name: "None", glyph: "–" }, ...ICON_PRESETS]) {
    const b = button(item.glyph + "  " + item.name, "efss-appearance-icon", () => {
      draftIcon = item.id;
      iconTouched = true;
      updateSelection(iconButtons, draftIcon);
    });
    b.title = item.name;
    iconButtons.push([b, item.id]);
    icons.append(b);
  }
  iconSection.append(icons);
  updateSelection(iconButtons, draftIcon);

  const idSection = element("section", "efss-appearance-id-info");
  idSection.append(
    element("strong", "", "Node ID " + nodeIdLabel(node)),
    element("p", "", "To show #IDs directly on nodes, enable ComfyUI's built-in Node ID badge in Settings. IDs identify nodes within their graph; they are not execution order.")
  );

  const footer = element("footer", "efss-appearance-footer");
  const status = element("span", "efss-appearance-status",
    "Only explicit changes will be applied.");
  const controls = element("div", "efss-appearance-buttons");
  const cancel = button("Cancel", "efss-appearance-button", () => dialog.close());
  const apply = button("Apply", "efss-appearance-button efss-appearance-primary", () => {
    // Only guard fields that this dialog intends to write. An unrelated
    // appearance update must not block a legitimate independent edit.
    if (appearanceConflict(node, initial, {
      color: colorTouched, icon: iconTouched,
    })) {
      status.textContent = "Selected appearance changed elsewhere. Close and reopen.";
      return;
    }
    // Re-selecting the current preset/icon is not a workflow change.
    const changeColor = colorTouched && (
      draftColor === null
        ? node.color !== undefined || node.bgcolor !== undefined
        : getColorPreset(node)?.id !== draftColor
    );
    const changeIcon = iconTouched &&
      (node.properties?.efssNodeIcon ?? "") !== (draftIcon ?? "");
    if (!changeColor && !changeIcon) {
      dialog.close();
      return;
    }
    node.graph?.beforeChange?.(node);
    try {
      if (changeColor) applyColorPreset(node, draftColor);
      if (changeIcon) {
        if (!applyNodeIcon(node, draftIcon)) {
          status.textContent = "Node rejected the icon change. Close and reopen.";
          node.setDirtyCanvas?.(true, true);
          return;
        }
        installIconRenderer(node);
      }
    } finally {
      node.graph?.afterChange?.();
    }
    node.setDirtyCanvas?.(true, true);
    app.graph?.change?.();
    dialog.close();
  });
  controls.append(cancel, apply);
  footer.append(status, controls);

  const main = element("div", "efss-appearance-main");
  main.append(nodeInfo, colorSection, iconSection, idSection, footer);
  dialog.append(heading, main);
  document.body.append(dialog);
  openDialogs.set(node, dialog);
  dialog.addEventListener("close", () => {
    openDialogs.delete(node);
    dialog.remove();
  }, { once: true });
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

app.registerExtension({
  name: "efss.nodepack.appearance",
  setup() {
    loadStyles();
  },
  nodeCreated(node) {
    // Only icon-bearing nodes are wrapped; ordinary nodes are not modified.
    installIconRenderer(node);
  },
  loadedGraphNode(node) {
    // Workflow restoration happens after the constructor; read properties now.
    installIconRenderer(node);
  },
  getNodeMenuItems(node) {
    if (!node || node.id === undefined) return [];
    return [
      null,
      {
        content: "EFSS · Node appearance…",
        callback: () => openAppearanceDialog(node),
      },
    ];
  },
});

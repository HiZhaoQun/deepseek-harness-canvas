/** Scoped stylesheet for Canvas mode. All colors use host theme tokens. */
export const CSS = `
.dc-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  --dc-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --dc-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --dc-accent: var(--dsw-alias-brand-primary);
  --dc-surface: var(--dsw-alias-bg-layer-1);
  --dc-surface-2: var(--dsw-alias-bg-layer-2);
  --dc-border: var(--dsw-alias-border-l1);
  --dc-border-strong: var(--dsw-alias-border-l2);
  --dc-muted: var(--dsw-alias-label-secondary);
  --dc-danger: var(--dsw-alias-state-error-primary);
  --dc-success: var(--dsw-alias-state-success-primary);
  --dc-warn: var(--dsw-alias-state-warn-primary);
  --dc-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent), 0 14px 38px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
  --dc-shadow-soft: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent), 0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}

.dc-root *, .dc-root *::before, .dc-root *::after { box-sizing: border-box; }
.dc-root button, .dc-root input, .dc-root textarea { font: inherit; color: inherit; }
.dc-root button { cursor: pointer; }
.dc-root button:disabled { cursor: not-allowed; opacity: .45; }
.dc-icon { display: block; flex: none; }

.dc-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-label-secondary) 26%, transparent) 1px, transparent 1px);
  opacity: .55;
}

.dc-edges { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.dc-slots { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.dc-slot {
  position: absolute;
  border: 1px dashed color-mix(in srgb, var(--dc-border-strong) 85%, transparent);
  border-radius: 15px;
  background: color-mix(in srgb, var(--dc-surface) 26%, transparent);
  opacity: .85;
}
.dc-slot-target {
  border-style: solid;
  border-color: color-mix(in srgb, var(--dc-accent) 70%, transparent);
  background: color-mix(in srgb, var(--dc-accent) 8%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dc-accent) 14%, transparent);
  opacity: 1;
}
.dc-slot-block { border-width: 2px; }
.dc-edge { fill: none; stroke: color-mix(in srgb, var(--dsw-alias-border-l2) 78%, transparent); stroke-width: 1.6; }
.dc-edge-selected { stroke: var(--dc-accent); stroke-width: 2; }
.dc-arrow-normal { fill: color-mix(in srgb, var(--dsw-alias-border-l2) 88%, transparent); }
.dc-arrow-selected { fill: var(--dc-accent); }

.dc-card-anchor { position: absolute; width: 0; height: 0; }
.dc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  border-radius: 15px;
  border: 1px solid var(--dc-border);
  background: var(--dc-surface);
  box-shadow: var(--dc-shadow-soft);
  overflow: visible;
  transform-origin: top left;
  transition: box-shadow .16s ease, border-color .16s ease, outline-color .16s ease;
  outline: 2px solid transparent;
  outline-offset: 2px;
  pointer-events: auto;
}
.dc-card:hover { box-shadow: var(--dc-shadow); border-color: var(--dc-border-strong); }
.dc-card-selected { border-color: var(--dc-accent); outline-color: color-mix(in srgb, var(--dc-accent) 55%, transparent); box-shadow: var(--dc-shadow); }
.dc-card-dragging { cursor: grabbing; box-shadow: 0 18px 55px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent); }
.dc-card-answer { border-left: 3px solid var(--dc-accent); }
.dc-card-note { border-left: 3px solid var(--dc-warn); }
.dc-card:has(.dc-card-menu[open]), .dc-card:focus-within { z-index: 65 !important; }

.dc-card-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 12px 11px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--dc-border) 70%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--dc-surface-2) 45%, transparent), transparent);
  border-radius: 14px 14px 0 0;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.dc-card-collapsed .dc-card-header { border-bottom: 1px solid color-mix(in srgb, var(--dc-border) 60%, transparent); }
.dc-card:not(.dc-card-selected) .dc-card-header { cursor: pointer; }
.dc-card-selected .dc-card-header { cursor: grab; }
.dc-card-dragging .dc-card-header { cursor: grabbing; }
.dc-card-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 4px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dc-accent) 12%, transparent);
  color: var(--dc-accent);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: .02em;
  margin-top: 1px;
}
.dc-card-note .dc-card-type { background: color-mix(in srgb, var(--dc-warn) 14%, transparent); color: var(--dc-warn); }
.dc-card-heading { flex: 1; min-width: 0; }
.dc-card-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 8;
  overflow: hidden;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -.01em;
  overflow-wrap: anywhere;
}
.dc-card-subtitle { margin-top: 3px; font-size: 11px; color: var(--dc-muted); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-card-header-actions { display: flex; align-items: center; gap: 2px; flex: none; margin-top: -2px; }

.dc-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--dc-muted);
}
.dc-icon-button:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); color: var(--dsw-alias-label-primary); }

.dc-card-body { flex: 1; min-height: 0; overflow: auto; padding: 15px 17px 13px; background: var(--dc-surface); border-radius: 0 0 14px 14px; }
.dc-card-collapsed .dc-card-body { display: none; }
.dc-answer-body { scrollbar-width: thin; }
.dc-card-preview {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px 17px 16px;
  border-radius: 0 0 14px 14px;
  background: var(--dc-surface);
  color: var(--dc-muted);
  font-family: var(--dc-sans);
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
}

.dc-answer-status { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; color: var(--dc-muted); font-size: 11.5px; }
.dc-activity { padding: 2px 6px; border-radius: 999px; background: var(--dc-surface-2); border: 1px solid var(--dc-border); font-size: 10.5px; }
.dc-question-quote { display: flex; gap: 8px; margin: 0 0 11px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dc-accent) 7%, transparent); border: 1px solid color-mix(in srgb, var(--dc-accent) 15%, transparent); color: var(--dc-muted); font-size: 12px; line-height: 1.5; }
.dc-question-mark { flex: none; width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; background: color-mix(in srgb, var(--dc-accent) 18%, transparent); color: var(--dc-accent); font-size: 10px; font-weight: 800; }
.dc-inline-error { margin: 7px 0; padding: 8px 10px; border-radius: 7px; border: 1px solid color-mix(in srgb, var(--dc-danger) 28%, transparent); background: color-mix(in srgb, var(--dc-danger) 8%, transparent); color: var(--dc-danger); font-size: 12px; }
.dc-inline-warn { margin: 7px 0; padding: 8px 10px; border-radius: 7px; border: 1px solid color-mix(in srgb, var(--dc-warn) 28%, transparent); background: color-mix(in srgb, var(--dc-warn) 8%, transparent); color: var(--dc-warn); font-size: 12px; }
.dc-muted { color: var(--dc-muted); font-size: 12px; }
.dc-reasoning { margin-top: 11px; border-top: 1px dashed var(--dc-border); padding-top: 8px; color: var(--dc-muted); font-size: 11.5px; }
.dc-reasoning summary { cursor: pointer; user-select: none; font-weight: 600; }
.dc-reasoning .dc-markdown { margin-top: 6px; font-size: 11.5px; color: var(--dc-muted); }

.dc-markdown { font-family: var(--dc-sans); font-size: 13.5px; line-height: 1.65; overflow-wrap: anywhere; }
.dc-markdown > :first-child { margin-top: 0; }
.dc-markdown > :last-child { margin-bottom: 0; }
.dc-md-p { margin: 0 0 9px; }
.dc-md-heading { margin: 13px 0 6px; line-height: 1.3; font-weight: 680; letter-spacing: -.01em; }
.dc-md-h1 { font-size: 17px; }
.dc-md-h2 { font-size: 15.5px; }
.dc-md-h3 { font-size: 14.5px; }
.dc-md-h4, .dc-md-h5, .dc-md-h6 { font-size: 13.5px; }
.dc-md-list { margin: 0 0 9px; padding-left: 20px; }
.dc-md-list li { margin: 2px 0; }
.dc-md-quote { margin: 0 0 10px; padding: 7px 11px; border-left: 3px solid color-mix(in srgb, var(--dc-accent) 45%, transparent); background: color-mix(in srgb, var(--dc-accent) 6%, transparent); border-radius: 0 6px 6px 0; color: var(--dc-muted); }
.dc-md-hr { border: 0; border-top: 1px solid var(--dc-border); margin: 14px 0; }
.dc-markdown a { color: var(--dc-accent); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--dc-accent) 35%, transparent); }
.dc-markdown a:hover { border-bottom-color: var(--dc-accent); }
.dc-inline-code { font-family: var(--dc-mono); font-size: .9em; padding: 1px 4px; border-radius: 4px; background: var(--dc-surface-2); border: 1px solid var(--dc-border); }
.dc-inline-math { font-family: Georgia, serif; font-style: italic; color: color-mix(in srgb, var(--dc-accent) 82%, var(--dsw-alias-label-primary)); }
.dc-math-block { margin: 8px 0 10px; padding: 9px 11px; border: 1px solid var(--dc-border); border-radius: 8px; background: var(--dc-surface-2); font-family: Georgia, serif; font-size: 13px; white-space: pre-wrap; overflow-x: auto; }
.dc-code-block { margin: 9px 0 11px; border: 1px solid var(--dc-border); border-radius: 9px; overflow: hidden; background: var(--dc-surface-2); }
.dc-code-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 7px 4px 10px; border-bottom: 1px solid var(--dc-border); }
.dc-code-lang { color: var(--dc-muted); font-family: var(--dc-mono); font-size: 10px; }
.dc-code-copy { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border: 0; border-radius: 5px; background: transparent; color: var(--dc-muted); font-size: 10.5px; }
.dc-code-copy:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); color: var(--dsw-alias-label-primary); }
.dc-code { margin: 0; padding: 10px 11px; overflow: auto; font-family: var(--dc-mono); font-size: 11.5px; line-height: 1.55; }
.dc-table-wrap { overflow-x: auto; margin: 9px 0 11px; }
.dc-md-table { border-collapse: collapse; width: 100%; font-size: 12px; }
.dc-md-table th, .dc-md-table td { border: 1px solid var(--dc-border); padding: 5px 7px; text-align: left; vertical-align: top; }
.dc-md-table th { background: var(--dc-surface-2); font-weight: 650; }
.dc-markdown-streaming::after { content: ""; display: inline-block; width: 6px; height: 14px; margin-left: 3px; vertical-align: -2px; border-radius: 1px; background: var(--dc-accent); animation: dc-blink 1s steps(2, start) infinite; }

.dc-note-input { width: 100%; min-height: 116px; resize: vertical; padding: 9px 10px; border: 1px solid var(--dc-border); border-radius: 8px; background: var(--dc-surface-2); color: var(--dsw-alias-label-primary); font-family: var(--dc-sans); font-size: 13px; line-height: 1.6; outline: none; }
.dc-note-input:focus { border-color: color-mix(in srgb, var(--dc-accent) 55%, var(--dc-border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dc-accent) 10%, transparent); }

.dc-card-menu { position: relative; flex: none; }
.dc-card-menu > summary { list-style: none; cursor: pointer; }
.dc-card-menu > summary::-webkit-details-marker { display: none; }
.dc-card-menu[open] > summary { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); color: var(--dsw-alias-label-primary); }
.dc-menu-popover { position: absolute; top: 32px; right: 0; z-index: 120; display: flex; flex-direction: column; gap: 2px; min-width: 170px; padding: 5px; border: 1px solid var(--dc-border-strong); border-radius: 9px; background: var(--dsw-alias-bg-overlay); box-shadow: var(--dc-shadow); }
.dc-menu-item { display: flex; align-items: center; gap: 7px; width: 100%; height: 30px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); text-align: left; font-size: 11.5px; white-space: nowrap; }
.dc-menu-item:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.dc-menu-item:disabled { opacity: .45; }
.dc-menu-danger { color: var(--dc-danger); }
.dc-menu-sep { height: 1px; margin: 3px 4px; background: var(--dc-border); }

.dc-controls {
  position: absolute;
  right: 14px;
  top: 50%;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 172px;
  padding: 7px;
  transform: translateY(-50%);
  border: 1px solid color-mix(in srgb, var(--dc-border-strong) 80%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 90%, transparent);
  box-shadow: var(--dc-shadow-soft);
  backdrop-filter: blur(16px);
}
.dc-controls-brand { display: flex; align-items: center; gap: 8px; padding: 2px 4px 3px; min-width: 0; }
.dc-controls-collapse { width: 24px; height: 24px; flex: none; }
.dc-controls-collapsed { width: 42px; padding: 4px; align-items: center; }
.dc-controls-toggle { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); }
.dc-controls-toggle:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); color: var(--dsw-alias-label-primary); }
.dc-brand-mark { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--dc-accent); background: color-mix(in srgb, var(--dc-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--dc-accent) 20%, transparent); flex: none; }
.dc-controls-brand-text { flex: 1; min-width: 0; font-size: 12px; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-controls-sep { height: 1px; margin: 2px 2px; background: var(--dc-border); }
.dc-tool-button { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 9px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 11.5px; white-space: nowrap; }
.dc-tool-button:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.dc-controls-button { width: 100%; justify-content: flex-start; }
.dc-switch-row { justify-content: flex-start; }
.dc-switch-label { flex: 1; min-width: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-switch {
  position: relative;
  flex: none;
  width: 30px;
  height: 17px;
  margin-left: auto;
  border-radius: 999px;
  border: 1px solid var(--dc-border-strong);
  background: var(--dc-surface-2);
  transition: background .16s ease, border-color .16s ease;
}
.dc-switch[data-on="true"] {
  border-color: color-mix(in srgb, var(--dc-accent) 62%, transparent);
  background: color-mix(in srgb, var(--dc-accent) 55%, transparent);
}
.dc-switch-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);
  transition: transform .16s ease, background .16s ease;
}
.dc-switch[data-on="true"] .dc-switch-knob {
  transform: translateX(13px);
  background: var(--dsw-alias-bg-base);
}
.dc-import { position: relative; width: 100%; }
.dc-import > summary { list-style: none; cursor: pointer; width: 100%; }
.dc-import > summary::-webkit-details-marker { display: none; }
.dc-import .dc-menu-popover { top: 0; right: calc(100% + 8px); left: auto; }
.dc-controls-zoom { display: flex; align-items: center; justify-content: space-between; gap: 2px; padding: 2px; border: 1px solid var(--dc-border); border-radius: 8px; background: color-mix(in srgb, var(--dc-surface-2) 45%, transparent); }
.dc-zoom-value { min-width: 48px; height: 28px; padding: 0 7px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 11px; font-variant-numeric: tabular-nums; }
.dc-zoom-value:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.dc-controls .dc-help-popover { top: 0; right: calc(100% + 8px); left: auto; width: 300px; }

.dc-hint { position: absolute; left: 14px; bottom: 13px; z-index: 40; display: flex; align-items: center; gap: 5px; max-width: 42%; padding: 5px 8px; border-radius: 7px; color: var(--dc-muted); background: color-mix(in srgb, var(--dsw-alias-bg-base) 72%, transparent); font-size: 10px; pointer-events: none; }
.dc-dot { opacity: .55; }

.dc-mode-bar { position: absolute; left: 50%; bottom: 12px; z-index: 45; transform: translateX(-50%); display: flex; align-items: center; gap: 7px; max-width: min(620px, calc(100% - 230px)); padding: 6px 10px; border: 1px solid color-mix(in srgb, var(--dc-accent) 22%, var(--dc-border)); border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 90%, transparent); color: var(--dc-muted); box-shadow: var(--dc-shadow-soft); font-size: 11px; pointer-events: none; backdrop-filter: blur(12px); }
.dc-mode-current { color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-mode-extra { color: var(--dc-warn); }
.dc-mode-hint { color: var(--dc-muted); white-space: nowrap; }

.dc-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px; pointer-events: none; }
.dc-empty > * { pointer-events: auto; }
.dc-empty-mark { width: 62px; height: 62px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--dc-accent) 22%, transparent); background: color-mix(in srgb, var(--dc-accent) 10%, transparent); color: var(--dc-accent); box-shadow: 0 10px 30px color-mix(in srgb, var(--dc-accent) 16%, transparent); }
.dc-empty-title { font-size: 22px; font-weight: 720; letter-spacing: -.02em; margin-bottom: 8px; }
.dc-empty-desc { max-width: 540px; margin: 0 0 20px; color: var(--dc-muted); font-size: 12.5px; line-height: 1.65; }
.dc-empty-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }

.dc-toast { position: absolute; top: 66px; left: 50%; z-index: 130; transform: translateX(-50%); display: flex; align-items: center; gap: 7px; max-width: min(560px, calc(100% - 32px)); padding: 8px 11px; border: 1px solid var(--dc-border-strong); border-radius: 9px; background: var(--dsw-alias-bg-overlay); box-shadow: var(--dc-shadow-soft); font-size: 11.5px; animation: dc-toast-in .18s ease; }
.dc-toast-error { border-color: color-mix(in srgb, var(--dc-danger) 35%, transparent); color: var(--dc-danger); }
.dc-toast-success { border-color: color-mix(in srgb, var(--dc-success) 35%, transparent); color: var(--dc-success); }
.dc-toast-info { color: var(--dsw-alias-label-primary); }

.dc-pending { position: absolute; top: 64px; left: 50%; z-index: 55; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; max-width: min(560px, calc(100% - 32px)); padding: 7px 9px 7px 11px; border: 1px solid color-mix(in srgb, var(--dc-warn) 38%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--dc-warn) 10%, var(--dsw-alias-bg-overlay)); color: var(--dc-warn); box-shadow: var(--dc-shadow-soft); font-size: 11.5px; }
.dc-pending-button { height: 26px; padding: 0 8px; border: 1px solid color-mix(in srgb, var(--dc-warn) 40%, transparent); border-radius: 6px; background: transparent; color: var(--dc-warn); font-size: 11px; font-weight: 650; }
.dc-pending-button:hover { background: color-mix(in srgb, var(--dc-warn) 12%, transparent); }

.dc-primary-button, .dc-secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 650; white-space: nowrap; }
.dc-primary-button { border: 1px solid color-mix(in srgb, var(--dc-accent) 45%, var(--dc-border-strong)); background: color-mix(in srgb, var(--dc-accent) 14%, var(--dc-surface)); color: var(--dsw-alias-label-primary); }
.dc-primary-button:hover:not(:disabled) { filter: brightness(1.06); }
.dc-secondary-button { border: 1px solid var(--dc-border-strong); background: var(--dc-surface); color: var(--dsw-alias-label-primary); }
.dc-secondary-button:hover:not(:disabled) { background: var(--dc-surface-2); }

.dc-help-popover { position: absolute; top: 48px; left: 0; width: 340px; padding: 12px; border: 1px solid var(--dc-border-strong); border-radius: 11px; background: var(--dsw-alias-bg-overlay); box-shadow: var(--dc-shadow); }
.dc-help-title { font-size: 12px; font-weight: 700; margin-bottom: 5px; }
.dc-help-popover p { margin: 0 0 10px; color: var(--dc-muted); font-size: 11.5px; line-height: 1.6; }

.dc-reader-backdrop {
  position: absolute;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 72%, transparent);
  backdrop-filter: blur(9px);
}
.dc-reader {
  display: flex;
  flex-direction: column;
  width: min(920px, 100%);
  height: min(720px, 100%);
  overflow: hidden;
  border: 1px solid var(--dc-border-strong);
  border-radius: 14px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent);
}
.dc-reader-body { flex: 1; min-height: 0; overflow: auto; padding: 24px 26px 36px; }
.dc-reader-thread { display: flex; flex-direction: column; gap: 20px; max-width: 760px; margin: 0 auto; }
.dc-reader-user { padding: 12px 14px; border: 1px solid var(--dc-border); border-radius: 11px; background: var(--dc-surface-2); }
.dc-reader-role { margin-bottom: 5px; color: var(--dc-muted); font-size: 10.5px; font-weight: 650; letter-spacing: .04em; text-transform: uppercase; }
.dc-reader-question { white-space: pre-wrap; font-size: 14.5px; line-height: 1.65; overflow-wrap: anywhere; }
.dc-reader-assistant { min-width: 0; font-size: 14.5px; line-height: 1.75; }
.dc-reader-assistant .dc-markdown { font-size: 14.5px; line-height: 1.75; }
.dc-reader-assistant .dc-md-p { margin-bottom: 11px; }
.dc-reader-note { max-width: 760px; margin: 0 auto; white-space: pre-wrap; font-size: 14.5px; line-height: 1.8; overflow-wrap: anywhere; }
.dc-reader-reasoning { margin-top: 16px; padding-top: 11px; border-top: 1px dashed var(--dc-border); color: var(--dc-muted); font-size: 12px; }
.dc-reader-reasoning summary { cursor: pointer; font-weight: 600; }
.dc-reader-reasoning .dc-markdown { margin-top: 8px; color: var(--dc-muted); font-size: 12px; }

.dc-spinner { display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--dc-accent) 22%, transparent); border-top-color: var(--dc-accent); animation: dc-spin .7s linear infinite; }
.dc-boot { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; height: 100%; min-height: 240px; color: var(--dsw-alias-label-secondary); font-size: 12px; }

@keyframes dc-spin { to { transform: rotate(360deg); } }
@keyframes dc-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes dc-toast-in { from { opacity: 0; transform: translate(-50%, -4px); } to { opacity: 1; transform: translate(-50%, 0); } }

@media (max-width: 760px) {
  .dc-controls { width: 46px; padding: 5px; }
  .dc-controls-brand-text, .dc-controls-button span { display: none; }
  .dc-controls-button { width: 34px; justify-content: center; padding: 0; }
  .dc-hint { display: none; }
  .dc-mode-bar { max-width: calc(100% - 80px); bottom: 56px; }
}
`

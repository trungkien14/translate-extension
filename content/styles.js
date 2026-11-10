/* Stylesheet for the in-page UI (lives in a Shadow DOM). Tokens mirror shared/tokens.css. See docs/DESIGN_SYSTEM.md. */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  BT.CSS = `
:host {
  all: initial;
  --font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Noto Sans SC", "Noto Sans KR", "Yu Gothic UI", "Microsoft YaHei UI", "Malgun Gothic", sans-serif;
  --bg:#fff; --surface:#f5f6f8; --surface-2:#eceef2; --text:#14161a; --muted:#6a7280; --border:#e3e5ea;
  --accent:#4f46e5; --accent-soft:#eceafd; --accent-text:#fff; --danger:#c2362b; --danger-soft:#fdecea;
  --shadow: 0 1px 2px rgba(16,20,28,.06), 0 8px 24px rgba(16,20,28,.16);
  --ease: cubic-bezier(.2,.7,.2,1);
}
:host([data-theme="dark"]) {
  --bg:#1b1d22; --surface:#24272e; --surface-2:#2d3139; --text:#eceef2; --muted:#9aa1ad; --border:#343841;
  --accent:#8b8dfc; --accent-soft:#2a2b4a; --accent-text:#14161a; --danger:#ff8a80; --danger-soft:#3a2422;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.55);
}
*, *::before, *::after { box-sizing: border-box; }
.layer { font: 13px/1.5 var(--font); color: var(--text); letter-spacing: normal; text-align: left; }

.trigger { position:absolute; width:30px; height:30px; border-radius:50%; border:0; padding:0; cursor:pointer;
  background:var(--accent); color:var(--accent-text); display:grid; place-items:center;
  box-shadow:var(--shadow); animation:pop .12s var(--ease); }
.trigger:hover { filter:brightness(1.08); }
.trigger:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.trigger svg { width:16px; height:16px; }

.modal { position:absolute; display:flex; flex-direction:column; background:var(--bg); color:var(--text);
  border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); overflow:hidden;
  max-height:min(80vh,560px); animation:in .16s var(--ease); }
.head { display:flex; align-items:center; gap:8px; padding:10px 10px 10px 12px; border-bottom:1px solid var(--border); }
.langs { display:flex; align-items:center; gap:4px; flex:1; min-width:0; }
.langs .icon-btn { flex:none; }
.sel { background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:8px;
  padding:5px 6px; font:inherit; font-weight:600; flex:1 1 0; min-width:0; text-overflow:ellipsis; cursor:pointer; }
.sel:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
.body { overflow:auto; padding:12px; display:flex; flex-direction:column; gap:12px; overscroll-behavior:contain; }
.card { background:var(--surface); border-radius:12px; padding:12px; }
.label { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
.row { display:flex; align-items:flex-start; gap:6px; }
.grow { flex:1; min-width:0; }
.acts { display:flex; gap:2px; flex:none; }

.orig { font-size:15px; overflow-wrap:anywhere; white-space:pre-wrap; }
.orig.clamp { display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
.kind-word .orig { font-size:20px; font-weight:600; }
.ipa { color:var(--muted); font-size:13px; margin-top:2px; }
.more { border:0; background:none; color:var(--accent); font:inherit; font-size:12px; padding:2px 0; cursor:pointer; }

.trans { font-size:17px; font-weight:500; overflow-wrap:anywhere; white-space:pre-wrap; }
.kind-sentence .trans { font-size:15px; font-weight:400; line-height:1.6; }
.notice { color:var(--muted); font-size:12px; margin-top:6px; }

.icon-btn { width:30px; height:30px; border:0; border-radius:8px; padding:0; background:transparent; color:var(--muted);
  display:grid; place-items:center; cursor:pointer; }
.icon-btn svg { width:16px; height:16px; }
.icon-btn:hover { background:var(--surface-2); color:var(--text); }
.icon-btn:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
.icon-btn.active { color:var(--accent); background:var(--accent-soft); }
.icon-btn.ok { color:var(--accent); }

.btn { border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:8px; padding:5px 10px;
  font:inherit; cursor:pointer; }
.btn:hover { background:var(--surface-2); }
.btn.primary { background:var(--accent); color:var(--accent-text); border-color:transparent; }
.btn:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }

.sk { height:12px; border-radius:6px; margin:8px 0; background:linear-gradient(90deg,var(--surface-2),var(--border),var(--surface-2));
  background-size:200% 100%; animation:shimmer 1.2s linear infinite; }
.sk.w60 { width:60%; } .sk.w85 { width:85%; }
.error { background:var(--danger-soft); color:var(--danger); border-radius:12px; padding:12px; }
.error .btns { display:flex; gap:8px; margin-top:8px; }
.empty { color:var(--muted); }

.sect-title { display:flex; align-items:center; justify-content:space-between; }
.pos-block { margin-top:10px; }
.pos-block:first-of-type { margin-top:4px; }
.pos { display:inline-block; font-size:11px; font-weight:600; color:var(--accent); background:var(--accent-soft);
  padding:1px 8px; border-radius:999px; }
.defs { margin:6px 0 0; padding-left:18px; }
.defs li { margin:4px 0; }
.ex { color:var(--muted); font-style:italic; display:block; margin-top:1px; }
.chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.chip { font:inherit; font-size:12px; background:var(--surface-2); color:var(--text); border:0; border-radius:999px; padding:3px 10px; }
button.chip { cursor:pointer; }
button.chip:hover { background:var(--border); }
.rec { display:inline-flex; align-items:center; gap:4px; margin-top:6px; margin-right:6px; }
.rec svg { width:14px; height:14px; }

.foot { display:flex; justify-content:space-between; gap:8px; padding:8px 12px; border-top:1px solid var(--border);
  color:var(--muted); font-size:11px; }
.toast { position:absolute; left:50%; bottom:44px; transform:translateX(-50%); background:var(--text); color:var(--bg);
  padding:6px 12px; border-radius:999px; font-size:12px; max-width:90%; text-align:center; pointer-events:none;
  animation:in .16s var(--ease); }
[hidden] { display:none !important; }

@keyframes pop { from { opacity:0; transform:scale(.7); } to { opacity:1; transform:none; } }
@keyframes in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
@keyframes shimmer { to { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) { .trigger, .modal, .toast, .sk { animation:none; } }
`;

  const svg = (d, extra) =>
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra || ''}</svg>`;
  BT.ICONS = {
    translate: svg('<path d="M5 8h8M9 4v4M7 8c0 3 2 5 5 6M11 8c0 3-2 5-5 6"/><path d="M13 20l4-10 4 10M14.5 17h5"/>'),
    speaker: svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    check: svg('<path d="m5 12 5 5 9-10"/>'),
    swap: svg('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    play: svg('<path d="M8 5v14l11-7z"/>')
  };
})();

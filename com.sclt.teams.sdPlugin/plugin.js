// Minimal Stream Deck plugin, no deps (Node 24 has global WebSocket + fetch).
// New Teams' third-party API is tenant-disabled, so we drive the call toolbar through the
// WebView2 DevTools port: Teams must be started with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
// (the "Start Teams" key does that). Security: anything local can use port 9222 while it is open.
const { spawn } = require("node:child_process");

const CDP = "http://127.0.0.1:9222";
const BUTTONS = { mute: "microphone-button", camera: "video-button", share: "share-button", leave: "hangup-button" };
// Reads the aria-labels of the call buttons; null when this page has no call toolbar.
const STATE_JS = `(() => { const q = i => document.getElementById(i)?.getAttribute('aria-label') ?? null;
  const s = ${JSON.stringify(BUTTONS)}; const r = {}; for (const k in s) r[k] = q(s[k]);
  r.hand = document.getElementById('reaction-menu-button')?.getAttribute('data-tid') ?? null;
  return r.mute ? r : null; })()`;
// Raise hand lives inside the React menu, so we send Teams' own Cmd+Shift+K (Meta=4 | Shift=8) instead of clicking.
const HAND_KEY = { modifiers: 12, key: "K", code: "KeyK", windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 40 };

// Key state index per manifest: mute/camera 0=off 1=live 2=n/a, share 0=idle 1=sharing 2=n/a,
// hand 0=lowered 1=raised 2=n/a, leave 0=ok 2=n/a, launch 0=port down 1=port up.
// Labels describe the action, not the state.
function stateFor(action, portUp, call) {
  if (action === "launch") return portUp ? 1 : 0;
  if (!call || !call[action]) return 2;
  const label = call[action];
  if (action === "mute") return /^mute/i.test(label) ? 1 : 0; // "Mute mic" => currently live
  if (action === "camera") return /off/i.test(label) ? 1 : 0; // "Turn camera off" => currently on
  if (action === "share") return /stop/i.test(label) ? 1 : 0; // shortcut: assumes "Stop sharing"-style label while presenting
  if (action === "hand") return /hand-lowered/.test(label) ? 0 : 1; // shortcut: only "hand-lowered" seen live, anything else = raised
  return 0;
}

if (process.argv.includes("--selftest")) {
  const assert = require("node:assert");
  const call = { mute: "Unmute mic", camera: "Turn camera off", share: "Share", leave: "Leave" };
  assert.equal(stateFor("mute", true, call), 0);
  assert.equal(stateFor("mute", true, { ...call, mute: "Mute mic" }), 1);
  assert.equal(stateFor("camera", true, call), 1);
  assert.equal(stateFor("camera", true, { ...call, camera: "Turn camera on" }), 0);
  assert.equal(stateFor("share", true, call), 0);
  assert.equal(stateFor("leave", true, call), 0);
  assert.equal(stateFor("hand", true, { ...call, hand: "reaction-menu-button-hand-lowered" }), 0);
  assert.equal(stateFor("hand", true, { ...call, hand: "reaction-menu-button-hand-raised" }), 1);
  assert.equal(stateFor("hand", true, call), 2); // no React button (e.g. 1:1 call without reactions)
  assert.equal(stateFor("mute", true, null), 2);
  assert.equal(stateFor("launch", false, null), 0);
  assert.equal(stateFor("launch", true, null), 1);
  console.log("selftest ok");
  process.exit(0);
}

// One cached DevTools connection per page target; resolves to a cmd(method, params) function.
const conns = new Map();
function connect(target) {
  if (conns.has(target.id)) return conns.get(target.id);
  const p = new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map();
    let n = 0;
    ws.onopen = () => resolve((method, params) => new Promise((done) => {
      const id = ++n;
      pending.set(id, done);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => pending.delete(id) && done(undefined), 2000);
    }));
    ws.onmessage = ({ data }) => {
      const m = JSON.parse(data);
      pending.get(m.id)?.(m.result);
      pending.delete(m.id);
    };
    ws.onclose = () => {
      conns.delete(target.id);
      for (const done of pending.values()) done(undefined);
      reject(new Error("closed"));
    };
  });
  p.catch(() => {});
  conns.set(target.id, p);
  return p;
}

let portUp = false;
let call = null; // { cmd, evaluate, state } of the page that has the call toolbar

async function poll() {
  let targets;
  try {
    targets = await (await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
  } catch {
    portUp = false; call = null; return;
  }
  portUp = true;
  call = null;
  for (const t of targets.filter((t) => t.type === "page")) {
    try {
      const cmd = await connect(t);
      const evaluate = async (expression) => (await cmd("Runtime.evaluate", { expression, returnByValue: true }))?.result?.value;
      const state = await evaluate(STATE_JS);
      if (state) { call = { cmd, evaluate, state }; return; }
    } catch { /* page went away mid-poll */ }
  }
}

function launchTeams() {
  // Port already up: just bring Teams forward. Otherwise quit (max ~20s) and relaunch with the flag.
  const cmd = portUp
    ? "open -b com.microsoft.teams2"
    : `osascript -e 'quit app id "com.microsoft.teams2"'
       for i in $(seq 66); do pgrep -x MSTeams >/dev/null || break; sleep 0.3; done
       open --env WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 -b com.microsoft.teams2`;
  spawn("/bin/sh", ["-c", cmd], { detached: true, stdio: "ignore", cwd: "/" }).unref();
}

// --- Stream Deck wiring ---
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const keys = new Map(); // context -> { action, shown }
const ws = new WebSocket(`ws://127.0.0.1:${arg("-port")}`);
const send = (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

function render() {
  for (const [context, key] of keys) {
    const state = stateFor(key.action, portUp, call?.state);
    if (state !== key.shown) { key.shown = state; send({ event: "setState", context, payload: { state } }); }
  }
}

let polling = false;
async function refresh() {
  if (polling || !keys.size) return;
  polling = true;
  try { await poll(); render(); } finally { polling = false; }
}

ws.onopen = () => send({ event: arg("-registerEvent"), uuid: arg("-pluginUUID") });
ws.onmessage = async ({ data }) => {
  const { event, action, context } = JSON.parse(data);
  const name = action?.split(".").pop();
  if (event === "willAppear") { keys.set(context, { action: name, shown: -1 }); refresh(); }
  if (event === "willDisappear") keys.delete(context);
  if (event !== "keyDown") return;
  if (name === "launch") return launchTeams();
  if (!call || (name === "hand" && !call.state.hand)) return send({ event: "showAlert", context });
  if (name === "hand") {
    for (const type of ["rawKeyDown", "keyUp"]) await call.cmd("Input.dispatchKeyEvent", { type, ...HAND_KEY });
    return setTimeout(refresh, 150);
  }
  await call.evaluate(`document.getElementById(${JSON.stringify(BUTTONS[name])})?.click()`);
  setTimeout(refresh, 150);
};
ws.onclose = () => process.exit(0);
setInterval(refresh, 500);

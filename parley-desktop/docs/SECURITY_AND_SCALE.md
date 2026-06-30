# Parley — Security, Speed & Scalability Design

How the modes + settings system is built to scale, stay fast, and stay secure.

## Security

### Process isolation
- Every renderer: `contextIsolation: true`, `nodeIntegration: false`, **`sandbox: true`**. The UI can't
  touch Node, the filesystem, or arbitrary Electron APIs.
- **Strict CSP** on the settings window: `default-src 'self'; script-src 'self'` — no remote/inline script,
  no `eval`. `connect-src` limited to self + the gateway WS/HTTPS.

### Allowlisted, validated IPC (`shared/ipc-contract.ts` + `electron/ipc.ts`)
- A single contract enumerates every legal channel. The main process registers handlers **only** for those
  channels; the preload exposes **only** those channels. Unknown channel → rejected in preload *and* main.
- Every payload is runtime-validated (type/shape/length, secret-key allowlist) before it reaches logic —
  defense-in-depth against a compromised renderer.
- Handlers never throw raw errors to the renderer; they return a safe `{__error}` envelope (no stack/secret leak).

### Secrets never touch plaintext (`electron/secureStore.ts`)
- API keys & auth tokens are encrypted with Electron **`safeStorage`** (macOS Keychain / Windows DPAPI /
  libsecret) and stored in a separate `secrets.bin`, **never** in `settings.json`, never logged.
- Secrets are **write-only from the renderer**: `secret:set/has/clear` exist; there is **no `secret:get`**.
  Decryption happens only in-process (the gateway client), so a renderer XSS can't exfiltrate keys.
- Files written with `0o600` (owner-only) perms via atomic temp-write + rename.

### Compliance as a first-class, conservative default
- `compliance` settings (recording disclosure, **DNC scrub on by default**, calling-window, transcript
  retention) are part of the schema. `sanitize()` clamps retention; the DNC scrub is enforced before dial
  (`compliance:checkDnc`). This is TCPA-aware by construction, not bolted on.

## Speed

- **Read path is zero-I/O**: settings live in an in-memory cache; `getSettings()` is synchronous. The renderer
  gets a snapshot on load and **deltas** via `settings:changed` (no polling).
- **Debounced atomic writes**: rapid slider/toggle edits coalesce into one disk write after 300ms — no
  write-per-keystroke thrash, no torn files (temp + rename).
- **Optimistic UI**: `useSettings.patch` updates local state immediately, then reconciles with the main
  process result — the panel never feels laggy.
- **O(tokens) objection matching**: `buildObjectionIndex()` precompiles all triggers into one
  longest-first list, so matching cost is independent of how many objections a mode has. A 500-objection
  custom library matches as fast as a 5-objection one.
- Settings tabs render on demand (only the active tab mounts).

## Scalability

- **Modes are data, not code.** Adding a built-in = one object in `MODES`. Users add **custom modes** (same
  shape) that `mergeModes()` overlays on built-ins — custom can even override a built-in by `id`. No code
  change, no redeploy to ship a new playbook.
- **Versioned, migration-ready settings.** `SETTINGS_VERSION` + `migrate()` ladder + `coerceSettings()`
  deep-merge means old/partial/corrupt files self-heal to a valid shape forever. We can evolve the schema
  without breaking installed clients.
- **Typed contracts end-to-end** (`shared/*`): modes, settings, and IPC are shared types across main +
  renderer + server, so a breaking change is a compile error, not a runtime surprise.
- **Per-mode content versioning** (`mode.version`) lets us migrate individual playbooks independently.

## Verified
`npx tsx qa/run.ts` → **115 checks**: mode catalog/registry, objection index (incl. longest-trigger-first),
custom-mode merge + builtIn override, and settings coerce/migrate/sanitize (incl. clamping tampered values
and conservative compliance defaults). The lone red is the tracked B1 interim-word-count defect.

# Piggytech 2026 Roadmap

Internal product roadmap for the Piggytech team. Built as a static site with a lightweight Node.js dev server.

## Files

| File | Purpose |
|---|---|
| `index.html` | Public-facing roadmap (password-gated) |
| `admin.html` | Admin panel — add, edit, delete roadmap cards |
| `data.js` | Source of truth for all roadmap items; written by the admin panel |
| `data.backup.js` | Auto-generated snapshot of defaults on first server start; used by Reset |
| `server.js` | Node.js server (port 8080) — serves static files + write-back API |

## Running the server

```bash
node server.js
```

- Roadmap → http://localhost:8080/index.html  (password: `piggy2026`)
- Admin   → http://localhost:8080/admin.html  (password: `piggyadmin26`)

The server auto-starts at the beginning of every Claude Code session in this folder via the `SessionStart` hook in `.claude/settings.json`. Server logs go to `/tmp/roadmap-server.log`.

## Server API

| Endpoint | Method | Purpose |
|---|---|---|
| `/*` | GET | Static file serving (no-cache on `data.js`) |
| `/save-data` | POST | Accepts full DATA object as JSON, writes to `data.js` |
| `/reset-data` | POST | Restores `data.backup.js` → `data.js` |

## Data structure

`data.js` exports a global `var DATA` object keyed by product ID:

```
DATA = {
  pv:   { h1: [...items], h2: [...items] },  // Piggyvest
  pa:   { h1: [...items], h2: [...items] },  // PocketApp
  pvb:  { h1: [...items], h2: [...items] },  // Piggyvest Business
  pmd:  { h1: [...items], h2: [...items] },  // Pocket Merchant
  plat: { h1: [...items], h2: [...items] },  // Platform & Initiatives
}
```

Each item:
```js
{
  t: "Title",
  team: "Team name",
  p: "critical" | "high" | "medium" | "low",
  s: "done" | "indev" | "scoping" | "notstarted" | "blocked",
  d: "Short card description",
  summary: "Longer modal summary",
  assumptions: ["..."],
  risks: ["..."],
  questions: ["..."],
  notion: "https://..."   // optional
}
```

## Auto-start hook

`.claude/settings.json` contains a `SessionStart` hook that starts the server automatically when Claude Code opens this folder. It only starts the server if port 8080 is not already in use.

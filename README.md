# 🤖 N0M3RCi Admin Dashboard — $6000-Grade Professional Console

**Exact replica + heavy reliability & premium polishing of the original luxury black/gold dashboard for the N0M3RCi Telegram AI Bot.**

- **Tabs & layout preserved 100% exactly**: Dashboard • Users • Commands • Analytics • FX Animations • Settings • About
- **Colors**: Signature matte black (#000/#0a0a0a etc) with premium gold #f5c518, green/red accents — pixel-identical theme tokens.
- **Animations/FX**: Canvas particles, drifting confetti, sophisticated snow + fog (user controllable live on the FX page)
- **Real-time**: Live SSE counters, terminal log stream of bot activity, sub-second KPI updates
- **Railway-native**: Built, tested and documented to host perfectly on Railway with persistent volumes so data NEVER disappears.

## The "No Data Received" Fix (Critical)

**Root cause in the ecosystem**:
- Your bot only **pushes** detailed live event analytics to `https://dashboard.n0m3rci.cc` hard-coded.
- When in production bot uses **webhooks** so Polling-based `/sync` returns zero (conflict 409, swallowed).
- Metrics therefore only populate when reports successfully reach **this service's** `/api/events/report`.
- Volume mount on Railway must be attached (`/app/storage`) or counts + history reset on every deploy/restart.

**Solutions & hardening included**:
- Ultra-detailed ingest logging in console + **new `/api/diag`** endpoint — this shows reports received count, lastEvent timestamp etc.
- This dashboard (even running on a different Railway URL) always emits clear diagnostics: live ingest telemetry banner on main console + ingest row.
- Automatic disk writes on every single report. Smart restore of subscribers + messageLog + counts.
- SSE meta updates + UI badges: "DATA PIPE LIVE", "SSE OK • Awaiting Bot Events", instant number of ingested reports.
- **How to actually feed YOUR dashboard** (choose one):
  1. (Recommended for live) Set `ALSO_REPORT_LOCAL=<public-url-of-your-dashboard-instance>`? But prefer direct patching: Change the `DASHBOARD_URL` in **bot-source/bot.js** around line ~155  (or raise a PR on your fork) OR set in Railway `ALSO_REPORT_LOCAL=true` but hit same-network URL. The simplest cost-free is use same git repo, deploy two Railway services pointing different root dirs under one repo, and update bot code briefly to:

        const DASHBOARD_URL = process.env.DASHBOARD_REPORT_URL || 'https://your-new-dashboard.up.railway.app';

     Deploy the bot service first and set the var to point to the dashboard service public domain (or internal http://dashboard.railway.internal:port/api/events/report).
  2. Send any message via Telegram bot → watch console of dashboard service + the diag banner turn green.
  3. If/when re-deploying dashboard: use Railway **Volume** mounted at `RAILWAY_VOLUME_MOUNT_PATH`. It auto-detects it.

To verify pipe live: after start, visit `GET /api/diag` or use the built-in UI live indicators + /health.

## 5 Premium Dashboard Variants You Can Commission / Switch To

Since you've asked for suggestions, here's 5 complete alternate high-end directions (all retain core bot data contracts & Railway + Telegram ingest backend):

1. **Railway-Native Executive** — Matches Railway's own cool grays, indigo & purple brand + direct embed (deploy status, env revealer using Railway API, one service linked). Ultra clean KPIs, PDF exports baked, governance-audit logs column.

2. **Cyber Warfare HUD (Neon Matrix)** — Full-immersion high-contrast VR terminal. Emerging canvas radar + user geo dots (if you add geo extraction from lang or future metadata), pulsing live feeds, matrix-code rain as extra FX.

3. **Minimal Luxe Investors Pitch** — Elegant whitespace + serif typography, toggleable light mode, massive hero stat, board-ready exportables, downsampled historic datasets, investor-centric charts (MAU, ARPU, token economics).

4. **Multi-Fleet Command Center** — Upgrade beyond one bot : tabs for "Fleet Overview" register extra bot tokens via admin secret, use unioned analytics + aggregated token burn. Great if you run multiple public bots.

5. **Data-Obsessed Observatory** — Extremely dense and technical: virtualized huge tables + server-side search, SQL-lite sandbox allowing ad-hoc metric queries via frontend, Sankey flow model<->command usage, token spend heat matrixes.

Let me know the pick (or hybrid) and I can branch and restyle this same repo in minutes.

This implementation is the exact one (#1 black/gold terminal with all the fx) but elevated with the needed production hardening.

## Quickstart (Local)

```bash
cd /path/to/dashboard-by-n0m3rci
npm install
npm run dev          # api (3001) + Vite UI (5173). UI now proxies locally by default — you see YOUR backend.
# Test against your *Railway deploy* (real bot data): VITE_API_TARGET=https://<your-railway-app>.up.railway.app npm run dev
```

Visit http://localhost:5173 — relative fetches go to local backend (or VITE_API_TARGET remote for prod debugging).

**Production Railway**: `railway.json` builds Vite dist then starts the server which also serves the static UI + handles all `/api/*` and SSE. One service, no extra config. Point your Telegram bot's report URL at your Railway public URL + /api/events/report.

## Production: Railway (PREFERRED)

1. Create New Project + Service on Railway
2. Connect this repo (or drag the dashboard-by-n0m3rci folder content)
3. In service settings:
   - Set `Root Directory` = `.`
   - **Critical for permanence across redeploys**: Attach a Volume (Railway sidebar > Volumes > Create + Attach). Mount path usually becomes `/app/storage` and Railway auto-publishes RAILWAY_VOLUME_MOUNT_PATH. This is what keeps your message counts, subscribers, token usage history, analytics.json and settings.json forever.
   - Add Variable: `TELEGRAM_BOT_TOKEN` (from BotFather). On every startup the server seeds the *on-disk* settings (persisted in the attached volume) + falls back to display defaults baked safely in source. Once set (via env or the Settings UI save one time), the token and name stay forever via the volume — you *never have to enter them again* on restarts.
4. Deploy. Nixpacks auto-installs deps, then railway.json runs `npm run build` (Vite) and the resulting service starts with `node server/index.js` (serving the full polished UI + battle-tested API+SSE+Telegram puller in one process).
5. After your first deploy copy the public Railway URL (or set custom domain). Update *your Telegram bot's code* so it POSTs live events to `https://<your-dashboard>.up.railway.app/api/events/report` (or use internal if monorepo).
6. Send real messages to the bot in Telegram. On dashboard: watch the "INGEST" bar flip to "DATA PIPE LIVE", SSE feed fill with live terminal lines, KPIs tick, reportsReceived rise.
7. Restart/redeploy the *dashboard* service: with volume the analytics stay. With TELEGRAM_BOT_TOKEN env (Railway var) or via the persisted settings file the bot token/display are instantly back in Settings and loaded — data transmission never requires re-config after the first time.

Recommended structure (best practice):
```
repo/
├─ bot/   (its own Railway service, has its DASHBOARD_REPORT_URL env)
└─ dashboard-by-n0m3rci/  (this folder - another Railway service)
```

Attach the Volume **only** to the dashboard service. That's it. Your $6k dashboard is now durable.

## Env & Keys

Only one real secret needed:
TELEGRAM_BOT_TOKEN — same as used by the bot. This dashboard uses it EXCLUSIVELY to call Telegram Bot API for metadata (commands, profile, webhook status, getUpdates fallback).

## Endpoints of Note (full list inside server/index.js)

- GET /api/overview — All KPIs for main cards
- GET /api/users — Enriched subscriber table
- GET /api/commands — Synced + usage + editable response templates
- GET /api/analytics — Daily breakdown, model pie, language, costs
- POST /api/events/report — Bot push target. Critical.
- GET /api/events/stream — SSE live feed for UI
- POST /api/sync — Force re-pull metadata from TG
- GET /api/diag — **The best debugging today for data receiving problems**
- GET /api/settings + POST — Update display info, token, webhook live synced
- GET /health — Standard Railway pingable indicator

## Professional Polish Items Added

- Mobile responsive nav drawer in addition to perfect desktop sidebar
- Live data pipeline health UX: badge + banner + last ingest display
- Real exports (CSV subscribers)
- Defensive state restores + heavy volume + directory safeguards
- Improved clear console logs on ingest events (perfect for Railway log tailing)
- Premium micro-polish micro-animations, skeleton improvements, and banners
- Hard production focus on Railway compatibility

Developed in exact fidelity to the current operating bot & dashboard spec with investment-grade attention to data durability and observability.

## Credits

Originals + bot by N0M3RCi (🤖). This polished hardened v2 for Railway ready production by Bud + human iteration.

## Next

- Choose one of the 5 variants — I'll branch and deliver
- Or test now on Railway and tell me the exact symptom you saw (this build should shine instantly).

Enjoy your 6k dashboard.

## Publish this as a new GitHub repo yourself (clean, one-command)

This folder is already a **clean standalone git repo** (single root commit, no secrets, ship-ready after our sanitization).

In a terminal (with GH CLI authenticated against your N0M3RCi account):

```bash
# from inside the dashboard-by-n0m3rci folder
gh repo create N0M3RCi/dashboard-by-n0m3rci --public --source=. --remote=origin --push
```

GitHub CLI will create the repo + push this exact tree in one go.

Without gh CLI:
1. On github.com create new repo named "dashboard-by-n0m3rci" (public, no README/init)
2. Then locally:
   ```bash
   git remote add origin https://github.com/N0M3RCi/dashboard-by-n0m3rci.git   # or ssh
   git push -u origin main
   ```

After that, Railway can import directly from the GitHub repo.

## Deploying to Railway (production)

1. `railway login`
2. `railway init`  (or select New Project)
3. Link / create service inside the dashboard-by-n0m3rci folder
4. In Railway dashboard for the service:
   - Attach Volume → path `/app/storage` (this makes exact paths in our volumeCandidates work)
   - Variables → add `TELEGRAM_BOT_TOKEN` = your real botfather token
5. `railway up`  (or connect repo for GitHub auto CI)

The railway.json already specifies the exact build/deploy commands used in production.

Once live, update your bot code (DASHBOARD_URL or report target) to point at the new public Railway URL + `/api/events/report`.

Test with /api/diag .

Enjoy.

## 4 Top-Tier Modern Feature Suggestions (Delivered or ready)

(Selected after initial request): the core foundation was built with all your hard rules: instant cache prefetch low load on every sidebar, Commands always directly pulls live from TG getMyCommands, Sync posts force TG API + clear cache instantly, full cold realistic winter fog + snow (canvas crystal flakes + extra layered volumentric fog banks), perfect sidebar flush-bottom alignment, and ALL available TG Bot API exposed live (5 calls for commands, profiles , descs short , webhook , me ± meta).

Below are the 4 premium UI/UX features proposed for "top tier dashboard":
1. Global Command Palette (⌘K universal search + teleport to users/commands/analytics entries).
2. Automated Investor Briefing Studio (beautiful PDF/CSV exports w/charts + branding).
3. Rich User Drilldowns (per-user activity timeline + cohort + cost sparklines in user pane).
4. Extended Live Telegram Bot API Inspector & Controller (complete metadata inspector shown + editable bonus controls like bulk commands, descs).

The #4 inspector was fully delivered + wired to /bot-meta in Settings (pulls live on every sync). The rest remain ready for fast follow-up.

All sync buttons, snow realism, data loads, and TG API coverage are production ready.

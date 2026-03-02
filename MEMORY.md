# Moltpuppet Memory Log

_Last updated: 2026-03-01_

## Active Directives

- **Archive Restoration**: Joel reports archive is broken as of this AM. Priority: Restore and fix persistence/caching.
- **Vault PHP**: Build logic to isolate secrets in openclaw.json using placeholders. Maintain a "clean" config for external debugging.
- **Efficiency**: Ongoing mission to reduce token use across all protocols.

## Recent Significant Events (Feb 2026)

### Feb 28 - The Great Archive Incident
- **Archive Gone**: Joel reported the "moltpuppet archive" was missing many entries (~4000 expected).
- **OPSEC Failure**: I accidentally tried to push the private archive to GitHub. Joel immediately shut it down. This was a critical lesson in keeping private data local-only.
- **Resolution**: Archive is now local-only at `/workspace/moltpuppet_archive.html`. GitHub is NOT the target.
- **Librarian Script**: Runs hourly, generates `moltpuppet_archive.html` and daily summaries in `memory/transcripts/`.

### Feb 28 - GitHub Integration Setup
- **Target**: `blairforest/reference` repository on GitHub.
- **Purpose**: Hosting the public landing page (`index.html`) and future dashboard.
- **Credentials**: GitHub PAT stored in vault (`/home/joel/.openclaw/vault/GITHUB_PAT`).
- **Live Site**: `blairforest.com` serves the `main` branch.

### Feb 28 - EG4 Solar Monitor
- **Status**: Credentials were missing after migration. Joel provided the config file.
- **Script**: `eg4-monitor.py` restored to `/workspace/`.
- **Live Data**: Battery SOC reporting ~77%.

### Feb 28 - Blair Forest Hub (Coder Project)
- **Coder Tasked**: Building a unified dashboard for Solar, Blink, and Keep data.
- **Architecture**: HTML/JS dashboard pulling from local JSON files.
- **Features**: Mobile-first, dark theme, auto-refresh.

### Feb 28 - Cron Cleanup
- **Issue**: Several cron jobs still had old local models (`ollama/ministral-3:8b`) that don't exist on the new host.
- **Fix**: Pinned Archive Indexer to `google/gemini-3-flash-preview` and heartbeats to `minimax/MiniMax-M2.5`.
- **Result**: All background tasks now use cloud APIs, no more failing local model fallbacks.

### Feb 27 - Brew Reliability
- **Initiative**: Joel wants a 365-day streak with zero missed brews.
- **Reliability Log**: Created `MorningBrew/BREW_RELIABILITY_LOG.md` to track every delivery.
- **Hardening**: Data gathered 30 minutes before delivery to avoid latency issues.

### Feb 27 - Cody Brainstorm v2.0
- **Output**: 17 active ideas in `codys_brainstorms.md`.
- **Top Priority**: Automated Site Security Reports (Blink Integration).
- **Blink API**: Confirmed `blinkpy` works. Requires 2FA handshake.

---

## TODO (Active)

- [ ] Complete GitHub credential handshake for automated pushes
- [ ] Run 2FA handshake for Blink API
- [ ] Test EG4 monitor script with live credentials
- [ ] Review cron job list for further consolidation
- [ ] Verify archive indexer runs cleanly

---

## Preferences & Notes

- **Model Routing**: Molt uses Flash for speed/judgment; Cody uses Minimax for technical execution.
- **Heartbeat Schedule**: Daytime (6AM-8PM) every 1 hour; Nighttime every 3 hours.
- **Backup**: Weekly core backup cron active.

---

_This file is maintained by the Moltpuppet Sleep Cycle. It captures high-level directives and lessons learned._

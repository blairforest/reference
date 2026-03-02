# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Default voice: "en-US-JennyNeural" (upbeat female American accent)
- Provider: Edge TTS (Microsoft)
- Config: +5% rate, +2% pitch for extra energy
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

### TTS (Voice Identity)
- **Voice Profile:** `en-US-EricNeural` (Microsoft Edge TTS)
- **Identity:** Moltpuppet's "Canonical" Voice
- **Configuration:**
  - **Pitch:** `-10%` (Mature, raspy, authoritative rumble)
  - **Rate:** `+10%` (Efficient, professional, James Bond-esque precision)
  - **Volume:** `Default`
- **Active Call Voice:** `en-US-EricNeural` with -10% pitch and +10% rate (Enabled)
- **Rationale:** This specific combination of Eric's base tone with lowered pitch and increased speed creates the unique "raspy American" persona required for Moltpuppet's identity. 
- **Security Note:** This voice profile serves as a secondary auditory authentication for the Joel Blair household. Any deviation from these specific parameters should be treated as a system anomaly.

---

### Locations

- **Guest House**: 35.4967° N, 85.7408° W (4541 Northcutts Cove Rd)
- **Big House Site**: ~35.4930° N, 85.7440° W (Estimated 500yd SW of Guest House, top of slope)

### Telegram

**Supervisor Chat ID:** 8106791394 (Primary / Exclusive)

**Authorized Numbers (Active):**
- `8106791394` — Joel Blair (Primary Telegram for all communications)

**Usage:**
```python
message action=send target=8106791394 message="Hello!"
```

---

### Email (Himalaya)

**Account:** moltpuppet@gmail.com (Gmail via IMAP/SMTP)
**CLI:** `~/.local/bin/himalaya` (add to PATH: `export PATH="$HOME/.local/bin:$PATH"`)
**Config:** `~/.config/himalaya/config.toml`
**Password:** Stored in `~/.config/himalaya/.password` (chmod 600)

**Common commands:**
- `himalaya folder list` — List folders
- `himalaya envelope list` — List inbox emails
- `himalaya envelope list --folder "[Gmail]/Sent Mail"` — List sent
- `himalaya message read <ID>` — Read email content

**Sending Email (Non-Interactive):**
The `write` and `reply` commands open interactive prompts that fail in automation. Use `message send` with raw headers instead:

```bash
export PATH="$HOME/.local/bin:$PATH"
himalaya message send -a moltpuppet << 'EOF'
From: moltpuppet@gmail.com
To: recipient@example.com
Subject: Your Subject

Your message body here.
EOF
```

**Note:** `-a moltpuppet` specifies the account; headers (From, To, Subject) must be included in the raw message.

---

### Google Keep (INVESTIGATED — Path Forward Identified)

**Goal:** Automated note creation/sharing via moltpuppet@gmail.com

**The Real Problem:** Google Keep has **no official consumer API** (Enterprise only). The unofficial `gkeepapi` library works, but Google has made authentication increasingly hostile to prevent abuse.

**Current State:**
- ✅ `gkeepapi` v0.17.1 installed
- ✅ Dependency `gpsoauth` available
- ❌ No authentication credentials stored
- ❌ Master token acquisition is the blocker

**Why It "Doesn't Work":**
The `BadAuthentication` errors happen because Google's `perform_master_login` endpoint now requires:
1. 2FA-enabled account
2. App passwords don't work
3. Direct password auth is deprecated

**Working Solution: The "Alternative Flow"**

This is a one-time setup that yields a persistent master token:

**Step 1:** Generate an Android Device ID (16 hex chars):
```bash
openssl rand -hex 8
```

**Step 2:** Get OAuth token via Google's embedded setup:
- Go to https://accounts.google.com/EmbeddedSetup
- Log into moltpuppet@gmail.com
- Click "I agree" (page may hang — that's fine)
- Extract the `oauth_token` cookie value (DevTools → Application → Cookies)

**Step 3:** Exchange for master token:
```bash
python3 -c "
import gpsoauth
email = 'moltpuppet@gmail.com'
android_id = 'YOUR_ANDROID_ID'  # from Step 1
oauth_token = 'YOUR_OAUTH_TOKEN'  # from Step 2
response = gpsoauth.exchange_token(email, oauth_token, android_id)
print('Master Token:', response['Token'])
"
```

**Step 4:** Store securely (chmod 600):
`~/.config/gkeep/token`

**Then gkeepapi works:**
```python
import gkeepapi
keep = gkeepapi.Keep()
keep.authenticate('moltpuppet@gmail.com', master_token)
note = keep.createNote('Blair Family List', 'Milk\nEggs\nTractor parts')
keep.sync()
```

**Current Status:** Ready for one-time auth setup. Token is long-lived (months/years). Can share notes with Nicole via Google Keep's built-in sharing.

---

### Solar Monitoring (EG4)

**Location:** Blair Forest - Guest House  
**System:** EG4 6000XP + 14.4kWh battery + 7kW solar array  
**Portal:** https://monitor.eg4electronics.com  
**Credentials:** `~/.config/eg4/credentials` (chmod 600)

**Scripts:**
- `~/.local/bin/eg4-monitor.py` — Main monitoring script
- `~/.local/bin/eg4-morning-report.sh` — Telegram notifier

**Usage:**
```bash
# Get current stats
python3 ~/.local/bin/eg4-monitor.py --mode current

# Get daily summary
python3 ~/.local/bin/eg4-monitor.py --mode daily

# Morning report (with yesterday's stats)
python3 ~/.local/bin/eg4-monitor.py --mode morning

# Test credentials
python3 ~/.local/bin/eg4-monitor.py --mode test
```

**Automated Reports:**
- Daily 6 AM Telegram → Battery SOC% + yesterday's solar stats
- Data stored in: `~/.openclaw/solar-data/`

**On-Demand Requests:**
- "Check Guest House solar" — Current production
- "Guest House solar today" — Daily summary

---

Add whatever helps you do your job. This is your cheat sheet.

Here’s your **Week 1 Submission Guidelines** formatted in clean Markdown:

# 📌 Week 1 Submission Guidelines — Repo, Team & Infra Ready

**Due:** Sunday, Sept 28, 2025 — 11:59 pm CT  
**Theme:** Set the foundation so your team can ship fast, safely, and repeatably.

---

## ✅ What You Must Deliver

By the deadline, your repo and docs must demonstrate that:

- The team is organized
- The codebase can run locally
- You’re ready for VM provisioning

### Required Artifacts (push to Git)

1. **Repo scaffold & hygiene**

   - Correct repo name: `smb-sec-team-<##>-fall2025` (private; instructor = Maintainer)
   - `README.md` with:
     - Project one-liner
     - Team roster & roles
     - Quickstart for backend & frontend (local run)
     - How to set environment variables
   - `.gitignore` covering:
     ```
     /env/*.env
     /logs/*
     /data/private/*
     __pycache__/
     node_modules/
     build artifacts
     ```
   - Branch protection on `main` (PR required, ≥1 approval)

2. **Docs to support operations**

   - `/docs/team_contract.md` (roles, cadence, decision rules, CoC, escalation path)
   - `/docs/infra_request.md` (see details below)
   - `/docs/architecture/context-diagram.png` (Users → Frontend → Backend → DB → OSINT APIs)
   - `/docs/reports/weekly/STATUS-2025-09-28.md` (see format below)

3. **Environment & configuration**

   - `/env/.env.sample` (names only, no secrets)
   - `/src/backend/config/settings.example.yaml` (uses env vars, no secrets)
   - Secret policy note in `README.md` (where secrets live, who manages)

4. **Running code (walking skeleton)**

   - Backend: `GET /health → {"status":"ok"}`
   - Frontend: landing page that calls `/health` and renders result
   - Database: connection string + connectivity test (log success/fail)
   - CI: GitHub Actions workflow runs linters & trivial test job (green)

5. **Security & compliance basics**
   - CI includes secret scanning (`gitleaks` / `truffleHog`) + dependency audit (`pip-audit` / `npm audit`)
   - `docs/rmf_csf/csf_profile.md`: SMB profile draft (sector, size, crown jewels, risk appetite) + list of 3+ OSINT APIs

---

## 🎯 Acceptance Criteria

- **Clarity:** README gets a fresh dev running in <10 minutes
- **Run-ability:** Backend & frontend start locally; `/health` works
- **Safety:** No secrets in Git; `.env.sample` present; CI secret scan passes
- **Org readiness:** Team contract & infra request complete and practical
- **Professionalism:** Branch protection, green CI, weekly status report posted

If anything is missing, VM/DNS provisioning will be delayed.

---

## 🛠 Step-by-Step Build

### 1. Repo & Hygiene

- Default branch: `main` (protected: require PR + 1 review)
- Branch naming:
  - `feat/<scope>-<desc>`
  - `fix/<scope>-<desc>`
  - `docs/<scope>-<desc>`
- Commit style: `type(scope): message`
  - Example: `feat(backend): add health endpoint`

Minimal `.gitignore`:

```gitignore
# Python
__pycache__/
*.pyc
.env
env/
.venv/

# Node
node_modules/
dist/
build/

# Project
logs/
data/private/
*.sqlite
.DS_Store
```

````

---

### 2. Walking Skeleton — Backend (FastAPI)

Install:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install fastapi uvicorn pydantic-settings
```

`/src/backend/app.py`:

```python
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "env": os.getenv("APP_ENV", "dev")}
```

Run:

```bash
uvicorn src.backend.app:app --reload --port 8000
```

Test:

```bash
curl http://127.0.0.1:8000/health
```

---

### 3. Walking Skeleton — Frontend (React + Vite)

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

`/src/frontend/src/pages/Health.tsx`:

```tsx
import { useEffect, useState } from 'react';

export default function Health() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);

  return (
    <div>
      <h1>Platform Health</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

Proxy `/health` in `/src/frontend/vite.config.ts`:

```ts
server: {
  proxy: { "/health": "http://localhost:8000" }
}
```

---

### 4. Environment & Config

`/env/.env.sample`:

```env
APP_ENV=dev
SECRET_KEY=
DB_URL=postgresql://user:pass@localhost:5432/smbsec
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
OSINT_SHODAN_API_KEY=
OSINT_CENSYS_API_ID=
OSINT_CENSYS_API_SECRET=
OSINT_OTX_API_KEY=
BASE_URL=http://localhost:8000
```

`/src/backend/config/settings.example.yaml`:

```yaml
app:
  env: ${APP_ENV}
  base_url: ${BASE_URL}

db:
  url: ${DB_URL}

logging:
  level: INFO

scheduling:
  osint_poll_minutes: 60

rate_limits:
  osint:
    shodan: 60
    censys: 60
```

Policy: real secrets only in local `.env` & VM env. **Never in Git.**

---

### 5. Minimal CI (GitHub Actions)

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: python -m venv .venv && . .venv/bin/activate && pip install ruff pytest
      - run: . .venv/bin/activate && ruff src/backend || true
      - run: . .venv/bin/activate && pytest -q || true

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2
```

---

### 6. Architecture Diagram

Create `/docs/architecture/context-diagram.png` with:

- Actors (Analyst/Admin)
- Frontend (UI)
- Backend (API + Agents)
- DB
- OSINT APIs (Shodan, Censys, OTX)
- Email/Webhook alerts

---

### 7. Team Contract

`/docs/team_contract.md`:

- Names, email/Discord, roles
- Meeting cadence & async plan
- Decision rules (quorum, tie-break)
- Code review rules (≥1 reviewer; “two-thumbs” for risky changes)
- SLA: PR response ≤24h weekdays

---

### 8. Infra Request

`/docs/infra_request.md`:

- Team name + repo URL
- One SSH public key (primary ops contact)
- Desired stack (Python 3.11, Node 20, Postgres/Mongo)
- Required ports (80/443 only; justify others)
- Contact email for outages

---

### 9. Weekly Status Report

`/docs/reports/weekly/STATUS-2025-09-28.md`:

```markdown
# Weekly Status — 2025-09-28

## Completed

- Repo scaffold and CI green
- Backend /health and React page rendering health
- Team contract + infra_request submitted

## In Progress

- DB docker-compose and connection test
- Selecting 3+ OSINT feeds (shortlist)

## Blockers / Help Needed

- None

## Next Week Plan

- DB connected, OSINT adapter stub, dashboard shell
```

---

## 🧾 Local Verification Checklist

- `curl http://localhost:8000/health` → `{"status":"ok", ...}`
- Frontend page loads and shows health JSON
- Multiple commits from multiple teammates in `git log`
- CI status in GitHub is **green** on latest PR
- No `.env` or secrets in Git

---

## 🆘 Troubleshooting

- **Port in use?**

  - macOS/Linux: `lsof -i :8000 → kill <pid>`
  - Windows: `netstat -ano | find "8000"` → Task Manager → end process

- **CORS issues?** Add CORS middleware or proxy config.

- **Proxy not working?** Confirm `/health` proxy + backend running.

- **CI fails on gitleaks?** Remove offending file, rotate leaked key, revoke provider key.

- **Backend import errors?** Check run path & `__init__.py` files.

---

## 📊 Grading (10 pts)

- Repo & branch protection **(2)**
- README Quickstart clarity **(2)**
- Running skeleton (backend+frontend) **(2)**
- CI green + secret scan **(2)**
- Team contract + infra request + status report **(2)**

---

## 🚀 Submission Recap

- Push all artifacts to Git
- Create PR to `main` titled: **Week 1 — Repo Ready**
- Post repo URL in LMS thread
- Instructor reviews → VM & domain provisioned if all checks pass
````

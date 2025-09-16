# 📢 Fall 2025 Project & Repo Guidelines (Publish to Class)

## AI-Augmented Cyber Risk & Threat Intelligence Framework for SMBs

What you’ll build: a web-based, agentic-AI platform SMBs can configure to (1)
identify assets, (2) ingest OSINT + logs, (3) score & prioritize risk, and (4)
automate security workflows mapped to NIST CSF 2.0 (all six functions).
Where it runs: I’ll provision each team a Proxmox VM and a DNS subdomain for public
demo/testing.

---

## 📢 Learning outcomes

Translate NIST CSF 2.0 and NIST RMF (SP 800-37) into working, automated controls
for SMBs.
Build agentic AI (SLM/LLM) components for
Identify/Protect/Detect/Respond/Recover/Govern.
Integrate OSINT feeds & lab logs to produce real-time risk scoring, alerts, and
reports.
Deploy and harden a production-style service (auth, logging, secrets, CI,
backups).
Deliver a repeatable blueprint any SMB can configure.

---

## 📢 Required AI agents (map to CSF 2.0)

1. Identify → Asset Discovery Agent: builds asset register
   (HW/SW/Data/Users/Services) with criticality & sensitivity.
2. Protect → Policy Builder Agent: recommends baseline controls (map to NIST 800-53
   r5) + outputs SOPs.
3. Detect → Threat Hunting Agent: ingests OSINT/logs, correlates IOCs, flags
   anomalies with explainability.
4. Respond → Incident Playbook Agent: auto-generates IR steps; opens/updates IR
   records; alerts via email/webhook.
5. Recover → Resilience Agent: proposes BCP/DR tasks, validates RTO/RPO, plans
   recovery tests.
6. Govern → Compliance Tracker Agent: tracks CSF categories/subcategories, keeps
   risk register, metrics, status.
   > Acceptance rule: each agent must have a clear input → deterministic core workflow
   > (LLM where useful) → verifiable artifacts saved to DB + visible in the dashboard.

---

## Tech baseline (recommended, not mandatory)

Backend: FastAPI/Flask (Python)
Frontend: React or Streamlit
DB: PostgreSQL or MongoDB
LLM/SLM: Local via Ollama (e.g., Mistral/Llama) or cloud via adapters (hybrid OK)
Agent framework: LangChain / CrewAI / custom pipelines
CI/CD: GitHub Actions (lint, tests)
Auth: OAuth2/session + basic RBAC

---

## 📢 OSINT & free/community feeds (choose ≥3)

Shodan, Censys, GreyNoise (community), AbuseIPDB, VirusTotal (public), OTX
(AlienVault), NVD JSON (CVEs), MITRE ATT\&CK (STIX/TAXII), MISP (local/public).

> Store keys in env vars; never commit secrets.

---

## 📢 Ethics & lab safety

Only scan/ingest your lab VM or provided sample logs—no unauthorized targets.
No real PII/PHI. Respect API ToS and rate limits (add backoff/retry).
Log what agents did and why (audit trail beats black-box).

---

## Instructor-provided infrastructure

One Proxmox VM per team (Ubuntu LTS, static IP) + subdomain like `team-##.your-
domain.edu` (TLS).
Baseline firewall & snapshots provided; you handle app hardening, secrets, package
updates.
To get a VM (Week 1): submit team roster, repo URL, one SSH public key, stack
choice, and required ports.

---

## 📢 Starter repository requirements (structure + hygiene)

### Top-level files

`README.md` — overview, roles, quickstart (run backend/frontend/dev), deploy
steps.
`.gitignore` — ignore `/env/.env`, `/data/private/`, `/logs/`, `__pycache__`,
`node_modules`, build artifacts.
`LICENSE` (optional) and `CHANGELOG.md` (encouraged).

### Directory layout

```
/
├─ README.md
├─ .gitignore
├─ LICENSE # optional
├─ CHANGELOG.md # optional
├─ env/
│ ├─ .env.sample # names only, no secrets
│ └─ README.md # how to create local .env
├─ docs/
│ ├─ team_contract.md # roles, cadence, decisions
│ ├─ infra_request.md # VM/DNS/ports, SSH key, stack
│ ├─ architecture/
│ │ ├─ context-diagram.png
│ │ └─ data-flow-diagram.png
│ ├─ rmf_csf/
│ │ ├─ csf_profile.md
│ │ ├─ risk_register.csv #
Asset,Threat,Vuln,L,I,Score,Owner,Treatment,Due,Status,Notes
│ │ ├─ control_mapping.csv # CSF→800-53/ISO mapping + evidence links
│ │ └─ ir_playbook.md
│ ├─ reports/
│ │ ├─ weekly/
│ │ │ └─ STATUS-2025-09-28.md # rolling weekly status files
│ │ └─ audit/ # security & perf results later
│ └─ api/
│ └─ api-overview.md
├─ src/
│ ├─ backend/
│ │ ├─ app.py
│ │ ├─ api/
│ │ │ ├─ routes_identify.py
│ │ │ ├─ routes_protect.py
│ │ │ ├─ routes_detect.py
│ │ │ ├─ routes_respond.py
│ │ │ ├─ routes_recover.py
│ │ │ └─ routes_govern.py
│ │ ├─ agents/
│ │ │ ├─ identify_agent.py
│ │ │ ├─ protect_agent.py
│ │ │ ├─ detect_agent.py
│ │ │ ├─ respond_agent.py
│ │ │ ├─ recover_agent.py
│ │ │ └─ govern_agent.py
│ │ ├─ services/
│ │ │ ├─ osint/
│ │ │ │ ├─ shodan_client.py
│ │ │ │ ├─ censys_client.py
│ │ │ │ └─ otx_client.py
│ │ │ ├─ risk/scoring.py
│ │ │ ├─ alerts/notifier.py
│ │ │ └─ governance/compliance.py
│ │ ├─ db/
│ │ │ ├─ models.py
│ │ │ ├─ migrations/
│ │ │ └─ seeds/
│ │ ├─ scheduler/jobs.py
│ │ ├─ config/
│ │ │ ├─ settings.example.yaml # refs env vars; no secrets
│ │ │ └─ logging.conf
│ │ └─ tests/
│ │ ├─ unit/
│ │ └─ integration/
│ └─ frontend/
│ ├─ src/
│ │ ├─ components/
│ │ ├─ pages/
│ │ ├─ services/api.ts
│ │ └─ state/
│ └─ public/
├─ data/
│ ├─ samples/ # safe example JSON/CSV
│ └─ private/ # .gitignored
├─ deploy/
│ ├─ docker/
│ │ ├─ Dockerfile.backend
│ │ ├─ Dockerfile.frontend
│ │ └─ docker-compose.yml
│ ├─ nginx/reverse-proxy.conf.example
│ └─ k8s/ # optional
└─ .github/
├─ workflows/ci.yml # lint + tests + secret scan
├─ ISSUE_TEMPLATE.md
├─ PULL_REQUEST_TEMPLATE.md
└─ CODEOWNERS
```

### Repo hygiene

Name: `smb-sec-team-<##>-fall2025` (private; add instructor as Maintainer).
Branches: `main` protected; PRs required; use `feat/`, `fix/`, `docs/`.
Commits: `type(scope): message` (e.g., `feat(detect): add OTX adapter`).
CI gates: ruff/black + pytest; eslint/TypeScript tests; secret scan
(gitleaks/truffleHog); dep audit (pip-audit/npm audit).

### Secrets & safety

Real keys live only in local `.env` and on the VM; never in Git.
Use least-privilege API keys; add exponential backoff; handle 429s.

---

## Timeline & weekly submissions

First weekly report due: Sunday, Sept 28, 2025 (11:59 pm CT).
Weekly STATUS reports continue each Sunday.
Final project completion: Last week of November 2025 (final repo freeze & report
due Sun, Nov 30, 11:59 pm CT; live demos scheduled that week).

### Checkpoints (what’s due each Sunday)

Sep 28 — Team formed; repo scaffold complete; `team_contract.md` &
`infra_request.md`; README Quickstart; CI green.
Oct 5 — App skeleton (backend+frontend); DB connected; ≥1 OSINT adapter stub;
`.env.sample`; dashboard shell.
Oct 12 — Identify Agent + asset register MVP; OSINT ingestion job saves artifacts;
basic list/table UI.
Oct 19 — Detect Agent + live OSINT integration; anomaly flags; alerting path
(console/email/webhook).
Oct 26 — Protect Agent + risk scoring; 800-53 mapping draft; SOP/Safeguard outputs
visible.
Nov 2 — Respond Agent + IR playbook generator; open/close IR records; timestamped
audit trail.
Nov 9 — Recover Agent + backup/restore test plan; RTO/RPO documented; trend
charts.
Nov 16 — Govern Agent + CSF profile view; risk register populated; compliance
metrics/report export (PDF/CSV).
Nov 23 — Security testing (ZAP/Nmap), perf tuning, hardening checklist, deployment
dry-run; finalize docs.
Nov 30 — Final freeze: live site, repo, final report, and slides. (Demos run in
class this week.)

> Each checkpoint: push code + update `/docs/reports/weekly/STATUS-YYYY-MM-DD.md`

## (progress, blockers, next steps).

## 📢 Core deliverables

1. Live deployment on your subdomain (demo creds for grading).
2. Six agents implemented with verifiable artifacts (JSON/YAML) + UI views.
3. Risk & governance docs: CSF profile, risk_register.csv, control_mapping.csv,
   ir_playbook.md.
4. Automated reports: weekly threat digest, IR summary, governance metrics
   (PDF/CSV).
5. Test evidence: unit + integration tests; basic security checks; short attack-
   simulation walkthrough.
6. Repo hygiene: clean README, diagrams, CI passing, changelog.
7. Final presentation & live demo (15–18 min) + Q\&A.

---

## 📢 Quality bars

Definition of Ready (Week 1): repo structure present; README quickstart; team &
infra docs complete; CI green.
MVP (by Oct 26): Live app + Identify/Protect/Detect agents producing stored
artifacts & UI; at least 3 OSINT adapters wired (mock or real); alerts working;
risk register populated.

---

## 📢 Group formation (in class)

Team size: 5–6. Suggested roles (one may hold two):
Project Lead • Backend/Agents • Data/Detection • Frontend • Risk & Compliance •
DevOps
Immediately after forming:
Create your GitHub org/repo and add instructor.
Submit `docs/team_contract.md` and `docs/infra_request.md`.
Choose your SMB profile (retail/clinic/nonprofit/SaaS/etc.) and 3+ OSINT feeds.
Decide LLM strategy (local, cloud, or hybrid).

---

## 📢 Grading (100 pts)

Six agents implemented & verifiable (6×6) ....................................... 36
Platform & deployment quality (auth, logs, health, uptime) ............ 14
Risk & governance docs (CSF/RMF mapping, register) ..................... 14
Detection efficacy & alert flow (tests, triage UX) ........................... 12
Reports & explainability (clarity, audit trail) .................................... 12
Repo hygiene & teamwork (issues/PRs, commits, docs) ..................... 12

---

### What to do now

1. Form teams and create repos following this guide.
2. Submit team contract + infra request so I can provision your VM & domain.
3. Make your first STATUS report by Sun, Sept 28.
   If you want a starter README or .gitignore to paste in, say the word and I’ll drop
   them in your course space.

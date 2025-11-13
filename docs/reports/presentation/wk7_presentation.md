### Ben (Team Lead)

"I'm Ben, team lead and I'm responsible for the overall direction of the project. Small businesses get hit with the same cyberattacks as Fortune 500 companies, but they can't afford security teams. So we're building AI to do the job for them.

This platform follows NIST's cybersecurity framework—six functions that cover everything from finding vulnerabilities to recovering from attacks. We automated all of it with AI agents.

The plan for the system is to pull real threat data, match it to your assets, open incidents automatically, and tell you exactly what to do. It runs 24/7 in the background—threat scans every hour, and automated compliance checks every night.

Let me hand it off to the team."

---

### Tina (Data/Detection)

"I'm Tina. I handle threat intelligence. We currently plan on pulling live data from several sources:Shodan, VirusTotal, AlienVault, and more. These feed us malicious IPs, compromised domains, essentially all the bad stuff happening on the internet right now.

The system normalizes everything into one format and links threats directly to your assets. If your server IP shows up on a threat list, you know immediately.

When something serious hits—high severity or high confidence—we plan on automatically creating incidents. The detection engine runs every hour, so you're always protected."

---

### Bhavani (Backend/Agents)

"I'm Bhavani, I'm responsible for the AI agents. We are building six of them, each handling one part of cybersecurity.

The Identify agent finds and classifies your assets. Protect generates security policies with step-by-step instructions. Detect hunts for threats and maps them to attack patterns. Respond opens an incident and writes the entire response plan automatically. Recover analyzes your backups and disaster recovery plans, and tells you if they'll actually work when you need them.

All powered by GPT-5. Everything saves to the database. Everything runs automatically."

---

### Geethika (Risk & Compliance)

"I'm Geethika, handling risk and compliance. Our risk model is simple: how critical is the asset multiplied by how bad the threat is.

We track NIST controls and show you exactly what you've implemented versus what's missing. The dashboard shows your compliance coverage in real-time.

When you implement a control, the system calculates your residual risk. So you can see: 'If I do these five things, my risk drops by 60%.' That's powerful for small businesses with limited budgets."

---

### Mukunda (DevOps)

"I'm Mukunda, working on DevOps. Everything runs on PostgreSQL with a custom scheduler managing background jobs—threat scans, incident SLAs, backup compliance checks.

When something breaks SLA or a backup is overdue, the alert system fires. We currently plan on supporting email and webhooks with automatic retries.

The database has 15+ tables, all type-safe. The scheduler handles failures gracefully. It's almost production-ready and can scale horizontally."

---

### Srujana (Frontend)

"I'm Srujana, I'm building the frontend experience. We're using React with Material Design principles, Tailwind CSS, and have light and dark mode support.

The UI has collapsible sidebar navigation organized by NIST CSF functions.

Everything uses TanStack Query for optimistic updates and cache invalidation. The UI is fast, intuitive, and small business friendly."

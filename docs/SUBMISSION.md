# Submission Bundle - v1.0.0

**Course**: AI-Augmented Cyber Risk & Threat Intelligence  
**Students**: Ben Blake, Bhavani Adula, Geethika Padamati, Mukunda Chakravartula, Srujana Kunta, Tina Nguyen
**Date**: December 2025

---

## Live Deployment

| Item             | Value                                                |
| ---------------- | ---------------------------------------------------- |
| **Live URL**     | https://cyber-risk-intel-framework.replit.app        |
| **Status**       | Active                                               |
| **TLS**          | Valid                                                |
| **Health Check** | https://cyber-risk-intel-framework.replit.app/health |

## Release Information

| Item             | Value         |
| ---------------- | ------------- |
| **Version**      | v1.0.0        |
| **Git Tag**      | v1.0.0        |
| **Release Date** | December 2025 |

---

## Deliverables Checklist

### 1. Production Release

- [x] Git tag: v1.0.0
- [x] Release Notes: `/docs/RELEASE_NOTES.md`
- [x] Changelog: `/docs/CHANGELOG.md`

### 2. Live Deployment Verification

- [x] HTTPS with valid TLS
- [x] Security headers present
- [x] /health endpoint returning healthy
- [x] /version endpoint returning version info
- [x] Headers saved: `/docs/reports/audit/headers-final.txt`

### 3. Smoke Test

- [x] Checklist: `/docs/CHECKLISTS/smoke_test.md`
- [x] Screenshots: `/docs/reports/audit/smoke/`

### 4. User Documentation

- [x] Analyst Guide: `/docs/user_guides/analyst_guide.md`
- [x] Admin Guide: `/docs/user_guides/admin_guide.md`
- [x] API Reference: `/docs/api/api-overview.md`

### 5. Governance & Risk Pack

- [x] CSF 2.0 Coverage Matrix: In Executive Report
- [x] Risk Register: In Executive Report
- [x] POA&M: In Executive Report
- [x] Residual Risk Comparison: Weeks 5→8→10

### 6. Final Reports

| Report                 | Location                                             |
| ---------------------- | ---------------------------------------------------- |
| Executive Governance   | `/docs/reports/final/executive_governance_report.md` |
| Threat Intel Digest    | `/docs/reports/final/threat_intel_digest.md`         |
| Detections & Incidents | `/docs/reports/final/detections_incidents_30d.md`    |
| Recover/Resilience     | `/docs/reports/final/recover_resilience_status.md`   |
| Control Coverage       | `/docs/reports/final/control_coverage_sop_index.md`  |

### 7. Demo

- [x] 3 narrative use cases defined
- [x] Fallback screenshots prepared

### 8. Performance

- [x] Performance notes: `/docs/reports/audit/perf-final.txt`

### 9. Security

- [x] Security documentation: `/docs/SECURITY.md`
- [x] LLM guardrails documented

### 10. Operations

- [x] Runbooks: `/docs/RUNBOOKS/`
  - deploy.md
  - rollback.md
  - restart.md
  - renew_certs.md
  - rotate_keys.md
  - db_backup_restore.md
  - log_rotate.md
- [x] On-call checklist: `/docs/CHECKLISTS/on_call.md`

### 11. Data & Anonymization

- [x] No real PII/PHI in codebase
- [x] Sample data is synthetic

### 12. Additional Items

- [x] Backlog: `/docs/BACKLOG.md`
- [x] Pre-release checklist: `/docs/CHECKLISTS/pre_release.md`

---

## Demo Presentation

### Presenters

| Section             | Presenter |
| ------------------- | --------- |
| Overview & Identify | [Name]    |
| Detect & Respond    | [Name]    |
| Protect & Recover   | [Name]    |
| Govern & Wrap-up    | [Name]    |

### Duration

Total: 12-15 minutes

### Schedule

1. Introduction (30 sec)
2. Use Case 1: Threat Detection & Response (6 min)
3. Use Case 2: Security Controls (4 min)
4. Use Case 3: Recovery & Governance (4 min)
5. Q&A Buffer (30 sec)

---

## Technical Stack

| Component        | Technology                    |
| ---------------- | ----------------------------- |
| Frontend         | React + TypeScript + Vite     |
| UI Components    | shadcn/ui + Radix + Tailwind  |
| Backend          | Express.js + TypeScript       |
| Database         | PostgreSQL (Neon)             |
| ORM              | Drizzle                       |
| AI               | OpenAI-compatible (Replit AI) |
| State Management | TanStack Query                |

---

## Repository Structure

```
/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                 # Backend Express app
│   ├── middleware/        # Security, logging
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   └── scheduler.ts       # Background jobs
├── shared/                 # Shared types/schemas
│   └── schema.ts          # Drizzle schema
├── docs/                   # Documentation
│   ├── RUNBOOKS/          # Operational runbooks
│   ├── CHECKLISTS/        # Verification checklists
│   ├── DEMO/              # Demo materials
│   ├── api/               # API documentation
│   ├── user_guides/       # User documentation
│   └── reports/           # Generated reports
└── README.md              # Project overview
```

---

## Known Issues

See `/docs/BACKLOG.md` for complete list.

**Critical**: None

**High Priority** (planned for v1.1.0):

- RBAC enforcement incomplete
- PostgreSQL session store migration

---

_Submitted for Week 10 Final Release_

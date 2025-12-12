# Changelog

All notable changes to the SMB Security Platform.

## [1.0.0] - December 2025

### Added

#### Week 1-2: Foundation
- Initial project setup with Express + React + TypeScript
- PostgreSQL database with Drizzle ORM
- Core data models: assets, users, intel_events

#### Week 3: Identify Function
- Asset discovery and inventory management
- Asset criticality scoring (1-5 scale)
- Asset type classification (server, workstation, network, cloud, etc.)

#### Week 4: Detect Function  
- OSINT integration with multiple sources (Shodan, OTX, GreyNoise, AbuseIPDB, VirusTotal)
- Detection engine with severity scoring
- Asset-to-intel correlation and linking
- Automated risk score calculation and persistence

#### Week 5: Respond Function
- Incident management with phase-based workflow
- SLA monitoring and breach detection
- AI-generated incident playbooks
- Evidence tracking with chain-of-custody
- Incident timeline and task management

#### Week 6: Protect Function
- NIST 800-53 r5 control framework
- AI-generated control recommendations
- SOP generation for control implementation
- Control coverage tracking by CSF function

#### Week 7: Recover Function
- DR Plan management with RPO/RTO targets
- Backup tracking and validation
- Restore test logging
- Resilience scoring and gap analysis
- AI-generated remediation recommendations

#### Week 8: Govern Function
- CSF 2.0 coverage metrics by function
- Governance KPI dashboard (MTTD, MTTR, IR SLA%, etc.)
- Evidence freshness tracking
- POA&M integration
- Executive governance report generation

#### Week 9: Security Hardening
- Security headers middleware (HSTS, CSP, X-Frame-Options)
- Rate limiting with abuse detection
- Structured JSON logging with request IDs
- PII/secret redaction in logs
- LLM input/output guards
- Scheduler reliability improvements (jitter, locks, timeouts)
- Operational runbooks and documentation

#### Week 10: Final Release
- v1.0.0 production release
- Comprehensive documentation pack
- User guides (Analyst, Admin)
- API reference
- Final reports and exports
- Demo preparation

### Security

- Session-based authentication with secure cookies
- RBAC schema (viewer, analyst, admin roles)
- Input validation with Zod schemas
- SQL injection prevention via ORM
- XSS prevention via React escaping
- CSRF protection via SameSite cookies

### Performance

- Database indexes on frequently queried columns
- Background scheduler for async processing
- Efficient risk score calculation with single-pass aggregation

## [0.9.0] - November 2025

- Week 9 release candidate
- Security validation and hardening

## [0.8.0] - November 2025

- Govern function implementation
- Compliance dashboard

## [0.7.0] - November 2025

- Recover function implementation
- DR Plans and resilience analysis

## [0.6.0] - November 2025

- Protect function implementation
- Control recommendations and SOPs

## [0.5.0] - October 2025

- Respond function implementation
- Incident management

## [0.4.0] - October 2025

- Detect function implementation
- OSINT integration

## [0.3.0] - October 2025

- Identify function implementation
- Asset management

## [0.2.0] - September 2025

- Core infrastructure
- Database schema

## [0.1.0] - September 2025

- Initial project setup

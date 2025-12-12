# Security Documentation

## Overview

This document describes the security architecture, authentication mechanisms, and hardening measures implemented in the SMB Security Platform.

## Authentication & Session Management

### Session Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Session Lifetime | 24 hours | Balances security with usability for analysts |
| Session Store | PostgreSQL (connect-pg-simple) | Persistent sessions across restarts |
| Cookie Secure Flag | true (production) | Prevents cookie transmission over HTTP |
| Cookie HttpOnly | true | Prevents XSS access to session cookies |
| Cookie SameSite | strict | CSRF protection |
| Session Secret | Environment variable | Never committed to source control |

### RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| viewer | Read-only access to dashboards and reports |
| analyst | Create/update incidents, controls, run OSINT scans |
| admin | Full access including user management, configuration |

### CSRF Protection

- All state-changing requests require valid session
- SameSite=strict cookie attribute provides primary protection
- Future: Add CSRF tokens for form submissions

## Security Headers

All responses include the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer leakage |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Disable unused APIs |
| Content-Security-Policy | See below | Restrict resource loading |
| Strict-Transport-Security | max-age=31536000 (prod) | Enforce HTTPS |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' wss: ws:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

## Rate Limiting

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| /api/* | 100 requests | 60 seconds |

Rate limit responses include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## CORS Configuration

- **Development**: Allows localhost origins
- **Production**: Whitelist specific origins only
  - Replit deployment domain
  - Custom domain (if configured)
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Request-ID
- **Credentials**: Allowed with specific origins

## Request Logging & Observability

### Structured Logging

All API requests are logged in JSON format:

```json
{
  "timestamp": "2025-12-11T20:00:00.000Z",
  "level": "info",
  "request_id": "uuid",
  "method": "GET",
  "path": "/api/assets",
  "status": 200,
  "latency_ms": 45,
  "ip": "redacted",
  "message": "GET /api/assets 200 45ms"
}
```

### Sensitive Data Redaction

The following patterns are automatically redacted from logs:
- Bearer tokens
- API keys (sk-*, etc.)
- Credit card numbers
- Social Security Numbers
- Email addresses (in some contexts)
- Passwords, secrets, session tokens

## LLM/AI Safety

### Input Guards

All user input to LLM prompts is scanned for:
- Prompt injection attempts ("ignore previous instructions")
- Data exfiltration attempts (curl, wget, external URLs)
- Sensitive information requests

### Output Filtering

LLM responses are:
- Scanned for leaked secrets/credentials
- Truncated to 50,000 characters maximum
- Labeled as "[AI-Assisted]" when appropriate

### System Rules

All LLM interactions include system rules that:
- Prohibit revealing secrets or credentials
- Prohibit executing shell commands
- Prohibit making external HTTP requests
- Require following security best practices

## Secrets Management

### Environment Variables

| Variable | Purpose | Rotation |
|----------|---------|----------|
| DATABASE_URL | PostgreSQL connection | On compromise |
| SESSION_SECRET | Session signing | Quarterly |
| AI_INTEGRATIONS_OPENAI_API_KEY | LLM access | Managed by Replit |
| OSINT API Keys | Threat intel access | See ROTATION.md |

### Storage

- All secrets stored as environment variables
- Never committed to Git repository
- Replit Secrets panel for secure storage
- Production uses separate secret store

## Input Validation

- All API inputs validated with Zod schemas
- Request body size limited to 2MB
- SQL injection prevented via Drizzle ORM parameterization
- XSS prevented via React's default escaping

## Database Security

- Connection via SSL/TLS (enforced by Neon)
- Parameterized queries only (Drizzle ORM)
- No raw SQL with user input
- Connection string never logged

## Deployment Security

### Production Checklist

1. [ ] All secrets in environment variables
2. [ ] HTTPS enforced (HSTS header)
3. [ ] Rate limiting enabled
4. [ ] Security headers active
5. [ ] Debug mode disabled
6. [ ] Error details not exposed to clients
7. [ ] Logging configured with redaction

### Container Hardening (Proxmox VM)

- Minimal base image (node:20-slim)
- Non-root user execution
- Drop unnecessary Linux capabilities
- Read-only filesystem where possible
- No secrets in Dockerfile

## Vulnerability Management

### Dependencies

- `npm audit` run in CI pipeline
- High/Critical vulnerabilities block deployment
- Weekly automated dependency updates
- SBOM generated for compliance

### Static Analysis

- ESLint security rules enabled
- TypeScript strict mode
- No `any` types in security-critical code

## Incident Response

If a security incident is detected:

1. Revoke compromised credentials immediately
2. Check access logs for unauthorized access
3. Follow incident response playbook
4. Notify affected parties per compliance requirements

## Compliance Mapping

| Requirement | NIST 800-53 | Implementation |
|-------------|-------------|----------------|
| Access Control | AC-2, AC-3 | RBAC, Session Management |
| Audit Logging | AU-2, AU-3 | Structured Logging |
| Authentication | IA-2, IA-5 | Session-based auth |
| Encryption | SC-8, SC-13 | TLS, Secure cookies |
| Input Validation | SI-10 | Zod schemas |

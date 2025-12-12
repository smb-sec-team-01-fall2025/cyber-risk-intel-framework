# Administrator Guide

## Introduction

This guide covers system administration tasks including configuration, maintenance, backup, and troubleshooting for the SMB Security Platform.

## System Requirements

- **Runtime**: Node.js 20+
- **Database**: PostgreSQL (Neon serverless recommended)
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB for application and logs

## Configuration

### Environment Variables

Configure these in the Replit Secrets panel or `.env` file:

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| SESSION_SECRET | Session signing secret (64+ chars) | Generate with `openssl rand -hex 64` |

#### Optional - OSINT APIs

| Variable | Description | Source |
|----------|-------------|--------|
| SHODAN_API_KEY | Shodan API key | shodan.io |
| OTX_API_KEY | AlienVault OTX key | otx.alienvault.com |
| ABUSEIPDB_API_KEY | AbuseIPDB key | abuseipdb.com |
| VIRUSTOTAL_API_KEY | VirusTotal key | virustotal.com |
| GREYNOISE_API_KEY | GreyNoise key | greynoise.io |

#### Optional - Email Alerts

| Variable | Description |
|----------|-------------|
| SMTP_HOST | SMTP server hostname |
| SMTP_PORT | SMTP port (default: 587) |
| SMTP_USER | SMTP username |
| SMTP_PASS | SMTP password |
| ALERT_FROM_EMAIL | From address for alerts |
| ALERT_TO_EMAIL | Default recipient |

#### Optional - Scheduler

| Variable | Description | Default |
|----------|-------------|---------|
| OSINT_SCAN_INTERVAL | OSINT scan frequency (ms) | 3600000 (1 hour) |
| SLA_CHECK_INTERVAL | SLA check frequency (ms) | 300000 (5 min) |
| RPO_RTO_CHECK_INTERVAL | RPO/RTO check frequency (ms) | 86400000 (24 hours) |

### Updating Configuration

1. Update the environment variable in Replit Secrets or `.env`
2. Restart the application
3. Verify changes took effect via `/health` endpoint

## User Management

### Creating Users

Currently managed via database:

```sql
INSERT INTO users (username, password_hash, role)
VALUES ('analyst1', '$2b$10$...', 'analyst');
```

### Roles

| Role | Permissions |
|------|-------------|
| viewer | Read-only access to dashboards |
| analyst | Create/update incidents, run scans |
| admin | Full access including user management |

### Password Resets

Generate new password hash:
```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('newpassword', 10).then(console.log)"
```

Update in database:
```sql
UPDATE users SET password_hash = '$2b$10$...' WHERE username = 'analyst1';
```

## Database Administration

### Backup Procedures

See `/docs/RUNBOOKS/db_backup_restore.md` for detailed procedures.

Quick backup:
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Schema Migrations

Migrations are handled by Drizzle:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push
```

### Database Studio

```bash
npm run db:studio
```

Opens a web interface for database inspection.

## Scheduler Administration

### Viewing Status

```bash
curl http://localhost:5000/api/scheduler/status
```

### Manual Triggers

```bash
# Trigger OSINT scan
curl -X POST http://localhost:5000/api/osint/scan/trigger

# Trigger RPO/RTO check
curl -X POST http://localhost:5000/api/scheduler/trigger-rpo-rto-check
```

### Job Configuration

Jobs are defined in `server/scheduler.ts`. Intervals can be adjusted via environment variables.

## Secret Rotation

### Session Secret

See `/docs/RUNBOOKS/rotate_keys.md`

1. Generate new secret: `openssl rand -hex 64`
2. Update SESSION_SECRET environment variable
3. Restart application
4. All existing sessions will be invalidated

### OSINT API Keys

1. Generate new key at provider
2. Update corresponding environment variable
3. Restart application
4. Verify with manual OSINT scan trigger

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:5000/health

# Version info
curl http://localhost:5000/version

# Memory metrics
curl http://localhost:5000/metrics
```

### Log Analysis

Logs are in JSON format. Common queries:

```bash
# Find errors
grep '"level":"error"' /var/log/app.log

# Find slow requests (>1s)
grep 'latency_ms' /var/log/app.log | jq 'select(.latency_ms > 1000)'

# Track specific request
grep 'request_id.*abc123' /var/log/app.log
```

### Performance Metrics

Key metrics to monitor:
- P95 request latency (<500ms target)
- Error rate (<1% target)
- Memory usage (stable, no leaks)
- Database connection pool

## Security Administration

### Security Headers

Verify headers are present:
```bash
curl -sI https://your-domain.com | grep -E "(X-Frame|CSP|HSTS)"
```

### Rate Limiting

Current configuration: 100 requests per minute per IP

Adjust in `server/middleware/security.ts` if needed.

### Audit Logging

All API requests are logged with:
- Request ID
- Timestamp
- User (if authenticated)
- IP address
- Path and method
- Response status and latency

## Troubleshooting

### Application Won't Start

1. Check environment variables are set
2. Verify database connectivity
3. Check for port conflicts (5000)
4. Review startup logs for errors

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check network access to database
3. Verify SSL/TLS settings
4. Check connection pool limits

### OSINT Scans Failing

1. Check API keys are valid
2. Verify rate limits not exceeded
3. Check network access to OSINT APIs
4. Review adapter error logs

### Session Issues

1. Verify SESSION_SECRET is set
2. Check cookie settings (Secure, SameSite)
3. Verify session store (database or memory)

### High Memory Usage

1. Check for memory leaks in logs
2. Review active WebSocket connections
3. Consider increasing Node.js memory limit
4. Restart application if necessary

## Maintenance Windows

### Planned Maintenance

1. Notify users in advance
2. Create database backup
3. Apply updates during low-usage period
4. Run smoke tests post-maintenance
5. Monitor for issues

### Emergency Procedures

See `/docs/RUNBOOKS/` for:
- Rollback procedures
- Service restart
- Database restore
- Certificate renewal

## Upgrades

### Application Upgrades

1. Review release notes
2. Create database backup
3. Update code/images
4. Run migrations if needed
5. Restart application
6. Execute smoke tests

### Node.js Upgrades

1. Test in development first
2. Update in production during maintenance window
3. Verify all dependencies compatible

## Support

- **Documentation**: `/docs/` directory
- **Runbooks**: `/docs/RUNBOOKS/`
- **Issue Tracking**: Internal ticketing system
- **Emergency Contact**: On-call rotation

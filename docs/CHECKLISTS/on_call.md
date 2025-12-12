# On-Call Checklist

## On-Call Responsibilities

The on-call engineer is responsible for:
- Monitoring system health and alerts
- Responding to incidents within SLA
- Escalating issues as needed
- Documenting all actions taken

## Shift Start Checklist

- [ ] Review handoff notes from previous shift
- [ ] Check system health dashboard
- [ ] Review open incidents
- [ ] Verify alert channels are working
- [ ] Confirm access to all required systems

## Common Issues & Triage

### Application Not Responding

**Symptoms**: 5xx errors, health check failing

**Triage Steps**:
1. Check `/health` endpoint
2. Review application logs for errors
3. Check database connectivity
4. Verify memory/CPU usage

**Quick Fixes**:
- Restart application: See `/docs/RUNBOOKS/restart.md`
- If DB issue: Check connection pool, restart DB connection

### High Error Rate

**Symptoms**: >1% error rate, user complaints

**Triage Steps**:
1. Identify error type from logs
2. Check recent deployments
3. Look for external service issues

**Quick Fixes**:
- If recent deploy: Consider rollback
- If external service: Implement fallback or retry

### OSINT Scans Failing

**Symptoms**: No new intel events, scan errors in logs

**Triage Steps**:
1. Check API key validity
2. Verify rate limits not exceeded
3. Check network connectivity to OSINT sources

**Quick Fixes**:
- Rotate API key if expired
- Wait for rate limit reset
- Retry scan manually

### Database Connection Issues

**Symptoms**: Database errors, query timeouts

**Triage Steps**:
1. Check DATABASE_URL validity
2. Verify Neon service status
3. Check connection pool saturation

**Quick Fixes**:
- Restart application to reset pool
- Check Neon dashboard for issues

### Session/Auth Issues

**Symptoms**: Users can't log in, session errors

**Triage Steps**:
1. Check SESSION_SECRET is set
2. Verify session store (DB) is accessible
3. Check cookie settings

**Quick Fixes**:
- Restart application
- Verify environment variables

### High Memory Usage

**Symptoms**: OOM errors, slow responses

**Triage Steps**:
1. Check memory metrics endpoint
2. Look for memory leak patterns
3. Review recent code changes

**Quick Fixes**:
- Restart application
- Increase memory limit if available

### Scheduler Not Running

**Symptoms**: No scheduled jobs executing

**Triage Steps**:
1. Check `/api/scheduler/status`
2. Review scheduler logs
3. Check for lock contention

**Quick Fixes**:
- Restart application
- Check for stuck locks

## Escalation Matrix

| Severity | Response Time | Escalate To |
|----------|---------------|-------------|
| P1 Critical | 15 minutes | Team Lead → Engineering Manager |
| P2 High | 1 hour | Team Lead |
| P3 Medium | 4 hours | Team Chat |
| P4 Low | Next Business Day | Ticket Queue |

## Contact Information

| Role | Contact |
|------|---------|
| Primary On-Call | [Check rotation] |
| Secondary On-Call | [Check rotation] |
| Team Lead | [Contact info] |
| Engineering Manager | [Contact info] |

## Alert Response

### Responding to Alerts

1. Acknowledge alert within 5 minutes
2. Begin investigation
3. Update incident channel with status
4. Resolve or escalate within SLA

### Alert Types

| Alert | Severity | Action |
|-------|----------|--------|
| Health Check Failed | P1 | Immediate investigation |
| High Error Rate | P2 | Investigate within 15 min |
| Slow Response Time | P3 | Monitor, investigate if persists |
| Backup Failed | P2 | Retry, investigate cause |
| SLA Breach Warning | P2 | Review incident, expedite |

## Shift End Checklist

- [ ] Update handoff document
- [ ] Document any ongoing issues
- [ ] Transfer incident ownership
- [ ] Notify next on-call
- [ ] Log hours if applicable

## Handoff Template

```
## On-Call Handoff
Date: YYYY-MM-DD
From: [Your name]
To: [Next on-call]

### System Status
- Overall: [Green/Yellow/Red]
- Open P1s: [Count]
- Open P2s: [Count]

### Active Issues
1. [Issue description] - [Status] - [Action needed]

### Completed Actions
1. [Action taken] - [Result]

### Notes for Next Shift
- [Any important context]
```

## Useful Commands

```bash
# Check application health
curl -s https://your-domain.replit.app/health

# Check version
curl -s https://your-domain.replit.app/version

# Check scheduler status
curl -s https://your-domain.replit.app/api/scheduler/status

# Trigger OSINT scan manually
curl -X POST https://your-domain.replit.app/api/osint/scan/trigger

# View recent logs (Replit)
# Check the Workflows tab in Replit console
```

## Documentation Links

- [Deployment Runbook](/docs/RUNBOOKS/deploy.md)
- [Rollback Runbook](/docs/RUNBOOKS/rollback.md)
- [Restart Runbook](/docs/RUNBOOKS/restart.md)
- [Database Backup](/docs/RUNBOOKS/db_backup_restore.md)
- [Key Rotation](/docs/RUNBOOKS/rotate_keys.md)

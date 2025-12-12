# Service Restart Runbook

## When to Restart

- Memory leak suspected (increasing RSS over time)
- Configuration change requiring reload
- After secret rotation
- Hung connections to external services
- Scheduler jobs not firing

## Restart Methods

### Replit Environment

Click "Stop" then "Run" in the Replit interface, or:

```bash
# In Replit Shell
pkill -f "node.*server/index.ts"
# The workflow will automatically restart
```

### Proxmox VM (PM2)

```bash
# Graceful restart (zero-downtime with cluster mode)
pm2 reload smb-security

# Hard restart (brief downtime)
pm2 restart smb-security

# Check status
pm2 status
pm2 logs smb-security --lines 50
```

### Docker Environment

```bash
# Graceful restart
docker-compose restart smb-security

# Full recreate
docker-compose up -d --force-recreate smb-security

# Check logs
docker-compose logs -f smb-security --tail 100
```

## Pre-Restart Checklist

- [ ] No active incident investigations
- [ ] Database connections will reconnect
- [ ] Scheduled jobs will resume
- [ ] Users notified (if expected downtime)

## Post-Restart Verification

```bash
# Check health endpoint
curl -s http://localhost:5000/health

# Verify scheduler is running
curl -s http://localhost:5000/api/scheduler/status

# Check for startup errors in logs
grep -i "error" /var/log/smb-security.log | tail -20
```

## Troubleshooting

### Service Won't Start

1. Check for port conflicts: `lsof -i :5000`
2. Verify database connection: Check DATABASE_URL
3. Check disk space: `df -h`
4. Review recent config changes

### Service Crashes Immediately

1. Check logs for stack trace
2. Verify all environment variables set
3. Test database connectivity
4. Check for syntax errors in recent changes

### High Memory Usage

1. Capture heap dump before restart
2. Check for memory leak patterns
3. Consider increasing NODE_OPTIONS memory limit

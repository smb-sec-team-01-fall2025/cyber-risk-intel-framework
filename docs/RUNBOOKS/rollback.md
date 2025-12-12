# Rollback Runbook

## When to Rollback

- Critical functionality broken
- Security vulnerability discovered
- Data corruption occurring
- Error rate exceeds 5% of requests

## Rollback Decision Matrix

| Severity | Response Time | Approval Required |
|----------|---------------|-------------------|
| P1 - Critical | Immediate | No (rollback first) |
| P2 - High | 15 minutes | Team lead |
| P3 - Medium | 1 hour | Team consensus |
| P4 - Low | Next deploy | None (hotfix) |

## Rollback Steps

### Replit Deployment

1. Go to Deployments tab
2. Find previous successful deployment
3. Click "Redeploy" on that version
4. Verify health check passes

### Proxmox VM (Self-Hosted)

```bash
# SSH into server
ssh deploy@your-server.example.com

# Find previous stable tag
git tag -l | tail -5

# Checkout previous version
cd /opt/smb-security
git checkout v0.9.0  # Previous stable version

# Reinstall dependencies
npm ci --production

# Restart application
pm2 restart smb-security

# Verify rollback
curl -s http://localhost:5000/version
```

### Database Rollback (if needed)

**CAUTION: Only perform if data integrity is at risk**

```bash
# Check recent database changes
npm run db:studio

# If schema changes caused issues, restore from backup
# See db_backup_restore.md

# For minor schema rollback (development only)
# Modify schema.ts to previous state
# Run: npm run db:push --force
```

## Post-Rollback

1. [ ] Verify application health
2. [ ] Check critical user flows work
3. [ ] Document what failed and why
4. [ ] Create incident report
5. [ ] Schedule fix review meeting

## Communication

Notify stakeholders via:
- Status page update
- Team chat (Slack/Discord)
- Email to affected users (if customer-facing)

## Rollback History

| Date | From Version | To Version | Reason | Duration |
|------|--------------|------------|--------|----------|
| YYYY-MM-DD | v1.0.0-rc1 | v0.9.0 | Example | 5 min |

# Deployment Runbook

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] npm audit shows no High/Critical vulnerabilities
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Feature flags configured correctly

## Deployment Steps

### 1. Prepare Release

```bash
# Tag the release
git tag -a v1.0.0-rc1 -m "Release candidate 1"
git push origin v1.0.0-rc1

# Build production assets
npm run build
```

### 2. Deploy to Replit

Replit handles deployment automatically when you click "Deploy":

1. Navigate to the Deployments tab
2. Click "Deploy" button
3. Wait for build to complete
4. Verify deployment health check passes

### 3. Deploy to Proxmox VM (Self-Hosted)

```bash
# SSH into the server
ssh deploy@your-server.example.com

# Pull latest code
cd /opt/smb-security
git pull origin main

# Install dependencies
npm ci --production

# Run database migrations
npm run db:push

# Restart application
pm2 restart smb-security

# Verify health
curl -s http://localhost:5000/health
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl -s https://your-domain.com/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...,"version":"1.0.0-rc1"}

# Check security headers
curl -sI https://your-domain.com | grep -E "(X-Frame|X-Content-Type|Strict-Transport)"
```

## Post-Deployment

1. Monitor logs for errors (first 15 minutes)
2. Verify all scheduled jobs are running
3. Test critical user flows
4. Update status page if applicable

## Rollback Procedure

See [rollback.md](./rollback.md)

## Deployment History

| Version | Date | Deployer | Notes |
|---------|------|----------|-------|
| 1.0.0-rc1 | YYYY-MM-DD | Name | Initial RC |

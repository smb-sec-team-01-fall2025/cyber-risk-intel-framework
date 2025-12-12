# Log Rotation Runbook

## Overview

Proper log rotation prevents disk exhaustion and maintains log usability.

## Replit Environment

Replit manages logs automatically. Logs are available in:
- Workflow output pane
- Browser console (for frontend)

For persistent logging, the application outputs to stdout which Replit captures.

## Proxmox VM Configuration

### Logrotate Configuration

Create `/etc/logrotate.d/smb-security`:

```
/var/log/smb-security/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 app app
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### PM2 Log Rotation

Install PM2 logrotate module:

```bash
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

## Log Locations

| Log Type | Location | Rotation |
|----------|----------|----------|
| Application | /var/log/smb-security/app.log | Daily, 14 days |
| Access | /var/log/smb-security/access.log | Daily, 14 days |
| Error | /var/log/smb-security/error.log | Daily, 30 days |
| Nginx | /var/log/nginx/*.log | Daily, 14 days |
| PM2 | ~/.pm2/logs/*.log | 100MB, 14 files |

## Manual Log Cleanup

```bash
# Check disk usage
df -h

# Find large log files
find /var/log -name "*.log" -size +100M

# Compress old logs
gzip /var/log/smb-security/*.log.*

# Remove logs older than 30 days
find /var/log/smb-security -name "*.gz" -mtime +30 -delete
```

## Log Analysis

### Common Queries

```bash
# Find errors in last hour
grep -E "ERROR|error" /var/log/smb-security/app.log | tail -100

# Count requests by status code
grep "status" /var/log/smb-security/app.log | jq -r '.status' | sort | uniq -c

# Find slow requests (>1000ms)
grep "latency_ms" /var/log/smb-security/app.log | jq 'select(.latency_ms > 1000)'

# Track specific request
grep "request_id.*abc123" /var/log/smb-security/app.log
```

### Archival

For compliance, archive logs before deletion:

```bash
# Monthly archive
tar -czvf logs_$(date +%Y%m).tar.gz /var/log/smb-security/*.gz

# Upload to cold storage
aws s3 cp logs_$(date +%Y%m).tar.gz s3://your-bucket/archives/
```

## Troubleshooting

### Disk Full

```bash
# Emergency cleanup
journalctl --vacuum-size=100M
rm -f /var/log/smb-security/*.log.*.gz

# Restart log rotation
logrotate -f /etc/logrotate.d/smb-security
```

### Logs Not Rotating

```bash
# Debug logrotate
logrotate -d /etc/logrotate.d/smb-security

# Force rotation
logrotate -f /etc/logrotate.d/smb-security

# Check logrotate status
cat /var/lib/logrotate/status
```

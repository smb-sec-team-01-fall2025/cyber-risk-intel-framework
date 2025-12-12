# Secret & Key Rotation Runbook

## Rotation Schedule

| Secret | Rotation Frequency | Last Rotated |
|--------|-------------------|--------------|
| SESSION_SECRET | Quarterly | YYYY-MM-DD |
| OSINT API Keys | On compromise or annually | YYYY-MM-DD |
| Database Password | On compromise | N/A (managed) |

## Session Secret Rotation

**Impact**: Active sessions will be invalidated

### Steps

1. Generate new secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Update in Replit Secrets:
   - Go to Secrets tab
   - Update `SESSION_SECRET` value
   - Restart the application

3. For Proxmox VM:
```bash
# Update .env file
nano /opt/smb-security/.env
# Set SESSION_SECRET=<new-value>

# Restart application
pm2 restart smb-security
```

4. Verify:
```bash
curl -s http://localhost:5000/health
```

## OSINT API Key Rotation

### Shodan API Key

1. Log into [Shodan.io](https://www.shodan.io)
2. Navigate to Account > API
3. Click "Regenerate API Key"
4. Update in Replit Secrets or .env:
   - `SHODAN_API_KEY=<new-key>`
5. Restart application
6. Test:
```bash
curl -s "http://localhost:5000/api/osint/scan/trigger" -X POST
```

### AlienVault OTX Key

1. Log into [OTX.alienvault.com](https://otx.alienvault.com)
2. Navigate to Settings > API
3. Generate new key
4. Update `OTX_API_KEY` in secrets
5. Restart and test

### AbuseIPDB Key

1. Log into [AbuseIPDB.com](https://www.abuseipdb.com)
2. Navigate to API Keys
3. Create new key, delete old key
4. Update `ABUSEIPDB_API_KEY`
5. Restart and test

### VirusTotal Key

1. Log into [VirusTotal.com](https://www.virustotal.com)
2. Navigate to API Key section
3. Generate new key
4. Update `VIRUSTOTAL_API_KEY`
5. Restart and test

### GreyNoise Key

1. Log into [GreyNoise.io](https://www.greynoise.io)
2. Navigate to Account > API
3. Rotate key
4. Update `GREYNOISE_API_KEY`
5. Restart and test

## Verification After Rotation

```bash
# Check OSINT scan works
curl -s "http://localhost:5000/api/osint/scan/trigger" -X POST

# Check logs for errors
grep -i "api" /var/log/smb-security.log | grep -i "error" | tail -10

# Verify specific adapter
curl -s "http://localhost:5000/api/scheduler/status"
```

## Emergency Key Rotation

If a key is compromised:

1. **Immediately revoke** the old key at the provider
2. Generate new key at provider
3. Update in environment
4. Restart application
5. Review access logs for unauthorized use
6. Document incident

## Key Storage Best Practices

- Never commit keys to Git
- Use Replit Secrets or secure vault
- Limit key permissions to minimum required
- Enable provider's key usage alerts
- Maintain offline backup of keys (encrypted)

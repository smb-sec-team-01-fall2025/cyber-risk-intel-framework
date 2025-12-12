# Certificate Renewal Runbook

## Overview

This runbook covers TLS certificate renewal for production deployments.

**Note**: Replit deployments handle certificates automatically. This runbook is for self-hosted Proxmox VM deployments.

## Certificate Provider

- **Provider**: Let's Encrypt
- **Tool**: Certbot
- **Validity**: 90 days
- **Renewal**: 30 days before expiry

## Automatic Renewal

Certbot should be configured for automatic renewal:

```bash
# Check current certificate expiry
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal if needed
sudo certbot renew --force-renewal
```

### Cron Configuration

```bash
# /etc/cron.d/certbot
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
```

## Manual Renewal Steps

If automatic renewal fails:

### 1. Check Current Status

```bash
# View certificate details
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates

# Check for errors
sudo journalctl -u certbot
```

### 2. Renew Certificate

```bash
# Stop web server temporarily (if needed)
sudo systemctl stop nginx

# Renew with standalone mode
sudo certbot certonly --standalone -d your-domain.com

# Or renew with webroot (no downtime)
sudo certbot renew --webroot -w /var/www/html
```

### 3. Restart Services

```bash
# Reload Nginx with new certificate
sudo systemctl restart nginx

# Verify certificate
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### Rate Limit Exceeded

Let's Encrypt has rate limits. If exceeded:
- Wait for the rate limit to reset (weekly)
- Use staging environment for testing

### DNS Validation Failed

```bash
# Check DNS propagation
dig TXT _acme-challenge.your-domain.com

# Retry with DNS challenge
sudo certbot certonly --manual --preferred-challenges dns -d your-domain.com
```

### Port 80/443 Blocked

```bash
# Check firewall
sudo ufw status
sudo iptables -L -n

# Temporarily allow HTTP
sudo ufw allow 80/tcp
```

## Monitoring

Set up certificate expiry monitoring:

```bash
# Check if certificate expires within 30 days
openssl x509 -checkend 2592000 -noout -in /etc/letsencrypt/live/your-domain.com/fullchain.pem
echo $?  # 0 = valid, 1 = expiring soon
```

Add to monitoring system or cron alert.

## Emergency Procedure

If certificate has expired:

1. Renew immediately using steps above
2. If renewal fails, use self-signed temporarily
3. Investigate and fix renewal automation
4. Document incident

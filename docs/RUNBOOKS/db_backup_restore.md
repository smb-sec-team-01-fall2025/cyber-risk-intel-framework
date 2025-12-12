# Database Backup & Restore Runbook

## Overview

The SMB Security Platform uses PostgreSQL (Neon serverless). This runbook covers backup and restore procedures.

## Backup Strategy

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Neon Automatic | Continuous | 7-30 days |
| Manual Export | Weekly | 90 days |
| Pre-migration | Before each schema change | 30 days |

## Neon Built-in Recovery

Neon provides point-in-time recovery:

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Navigate to "Branches" > "Create branch"
4. Select "From point in time"
5. Choose the recovery point
6. Create branch for recovery

## Manual Backup (pg_dump)

### Export Database

```bash
# Set connection string
export DATABASE_URL="postgresql://user:pass@host/dbname"

# Full backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Schema only (for documentation)
pg_dump $DATABASE_URL --schema-only > schema_$(date +%Y%m%d).sql

# Data only
pg_dump $DATABASE_URL --data-only > data_$(date +%Y%m%d).sql
```

### Export Specific Tables

```bash
# Export critical tables
pg_dump $DATABASE_URL -t assets -t incidents -t controls > critical_tables.sql
```

## Restore Procedures

### Restore to Neon Branch

1. Create a new branch from backup point (see above)
2. Update DATABASE_URL to point to new branch
3. Restart application
4. Verify data integrity

### Restore from SQL Dump

```bash
# To empty database
psql $DATABASE_URL < backup_20251211_120000.sql

# From compressed backup
gunzip -c backup_20251211_120000.sql.gz | psql $DATABASE_URL
```

### Selective Table Restore

```bash
# Extract specific table from backup
grep -A 99999 "COPY assets" backup.sql | grep -B 99999 "^\\\." > assets_data.sql

# Restore just that table
psql $DATABASE_URL -c "TRUNCATE assets CASCADE;"
psql $DATABASE_URL < assets_data.sql
```

## Pre-Migration Backup

Before any schema changes:

```bash
# Create timestamped backup
pg_dump $DATABASE_URL > pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup is valid
psql -f pre_migration_*.sql --echo-errors 2>&1 | head -20
```

## Recovery Testing

Monthly recovery test procedure:

1. Create test database branch in Neon
2. Restore latest backup to test branch
3. Run verification queries:

```sql
-- Check record counts
SELECT 'assets' as table_name, COUNT(*) FROM assets
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'controls', COUNT(*) FROM controls;

-- Check data integrity
SELECT id, name FROM assets LIMIT 5;
```

4. Document test results
5. Delete test branch

## Disaster Recovery

If production database is corrupted:

1. **Stop the application** to prevent further damage
2. Identify last known good point in time
3. Create Neon branch from that point
4. Update DATABASE_URL to new branch
5. Restart application
6. Verify data integrity
7. Rename branches (new becomes production)
8. Document incident

## Backup Storage

- Store backups in multiple locations
- Encrypt sensitive backups at rest
- Test restore quarterly
- Keep offline copy for ransomware protection

## Monitoring

Set up alerts for:
- Backup job failures
- Database size thresholds
- Connection issues

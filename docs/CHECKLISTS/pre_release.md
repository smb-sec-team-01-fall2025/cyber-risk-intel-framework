# Pre-Release Checklist

Version: __________ Date: __________

## Security

- [ ] `npm audit` shows no High/Critical vulnerabilities
- [ ] No secrets committed to repository
- [ ] All API keys rotated if previously exposed
- [ ] Security headers verified (run `curl -sI https://your-domain.com`)
- [ ] Rate limiting tested and working
- [ ] CORS configured for production origins only
- [ ] Session cookies have Secure and HttpOnly flags
- [ ] LLM input guards tested against injection attempts

## Code Quality

- [ ] All tests passing
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint critical warnings
- [ ] Code reviewed by team member
- [ ] No debug console.log statements in production code

## Database

- [ ] Schema migrations tested on staging
- [ ] Backup taken before deployment
- [ ] No breaking schema changes without migration plan
- [ ] Indexes exist for frequently queried columns

## Performance

- [ ] Load test completed with acceptable results
- [ ] P95 latency under 500ms for critical endpoints
- [ ] Error rate under 1% under load
- [ ] Memory usage stable (no leaks detected)

## Observability

- [ ] Health endpoint returning 200 (`/health`)
- [ ] Version endpoint shows correct version (`/version`)
- [ ] Structured logging working (JSON format)
- [ ] Sensitive data redacted from logs
- [ ] Request IDs included in all log entries

## Documentation

- [ ] CHANGELOG updated
- [ ] API documentation current
- [ ] Runbooks reviewed and updated
- [ ] Known issues documented

## Infrastructure

- [ ] Environment variables configured for production
- [ ] TLS certificate valid for 30+ days
- [ ] Scheduled jobs configured correctly
- [ ] Alerting configured for critical failures

## Feature Flags

- [ ] Feature flags set correctly for release
- [ ] Experimental features disabled in production

## Rollback Plan

- [ ] Previous stable version identified
- [ ] Rollback procedure tested
- [ ] Database rollback plan (if needed)

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| Lead | | | |

## Go/No-Go Decision

- [ ] **GO** - All items checked, proceed with release
- [ ] **NO-GO** - Issues identified, postpone release

Issues blocking release:
1. 
2. 
3.

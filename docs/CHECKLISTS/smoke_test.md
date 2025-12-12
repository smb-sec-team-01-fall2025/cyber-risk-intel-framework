# Smoke Test Checklist

**Version**: v1.0.0  
**Environment**: Production  
**Tester**: _______________  
**Date**: _______________

## Prerequisites

- [ ] Live URL accessible: `https://your-domain.replit.app`
- [ ] Demo credentials available
- [ ] Browser DevTools open (Network tab)

## 1. Infrastructure Checks

### 1.1 HTTPS & TLS
```bash
curl -sI https://your-domain.replit.app | head -20
```
- [ ] Status: 200 OK
- [ ] TLS certificate valid
- [ ] No mixed content warnings

### 1.2 Health Endpoint
```bash
curl -s https://your-domain.replit.app/health
```
Expected:
```json
{"status":"healthy","timestamp":"...","uptime":...,"version":"1.0.0"}
```
- [ ] Returns healthy status
- [ ] Version matches release

### 1.3 Version Endpoint
```bash
curl -s https://your-domain.replit.app/version
```
- [ ] Returns version info
- [ ] Build info present

### 1.4 Security Headers
```bash
curl -sI https://your-domain.replit.app | grep -E "(X-Frame|X-Content-Type|Strict-Transport|Content-Security)"
```
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security present (production)
- [ ] Content-Security-Policy present

## 2. Authentication

### 2.1 Login
- [ ] Navigate to login page
- [ ] Enter demo credentials
- [ ] Successfully redirected to dashboard
- [ ] Session cookie set (HttpOnly, Secure)

## 3. Identify Function

### 3.1 Dashboard
- [ ] Dashboard loads without errors
- [ ] Stats cards show data (assets, detections, incidents)
- [ ] Top Risky Assets widget populated
- [ ] Trend chart renders

### 3.2 Assets Page
- [ ] Navigate to /assets
- [ ] Asset list loads
- [ ] Search/filter works
- [ ] Click asset → detail page loads
- [ ] Asset shows risk score and recent intel

### 3.3 Asset Detail
- [ ] Overview tab shows asset info
- [ ] Intel tab shows linked events
- [ ] Detections tab shows related detections
- [ ] Recover tab shows DR plan (if exists)

## 4. Detect Function

### 4.1 Intel Page
- [ ] Navigate to /intel
- [ ] Intel events list loads
- [ ] Severity badges display correctly
- [ ] Source attribution shown

### 4.2 Detections Page
- [ ] Navigate to /detections
- [ ] Detections list loads
- [ ] Severity filtering works
- [ ] Click detection → detail loads

### 4.3 Trigger Detection (API)
```bash
curl -X POST https://your-domain.replit.app/api/detect/run \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>"
```
- [ ] Returns success
- [ ] New detections appear (if intel exists)

## 5. Respond Function

### 5.1 Incidents Page
- [ ] Navigate to /incidents
- [ ] Incidents list loads
- [ ] Phase badges display correctly
- [ ] Severity filtering works

### 5.2 Create Incident
- [ ] Click "New Incident" or create from detection
- [ ] Fill form and submit
- [ ] Incident created successfully
- [ ] Redirected to incident detail

### 5.3 Incident Detail
- [ ] Overview shows incident info
- [ ] Tasks tab shows AI-generated tasks
- [ ] Timeline tab shows events
- [ ] Evidence tab allows upload metadata
- [ ] Phase advancement works

## 6. Protect Function

### 6.1 Controls Page
- [ ] Navigate to /controls
- [ ] Controls list loads
- [ ] Filter by family works
- [ ] Filter by status works
- [ ] Control detail shows SOP

### 6.2 Policies Page
- [ ] Navigate to /policies
- [ ] Policies list loads
- [ ] Policy detail shows assigned controls

### 6.3 Trigger Protect (API)
```bash
curl -X POST https://your-domain.replit.app/api/protect/run \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>"
```
- [ ] Returns control recommendations

## 7. Recover Function

### 7.1 Backup Status Page
- [ ] Navigate to /backup-status
- [ ] Dashboard loads
- [ ] RPO/RTO compliance shown
- [ ] Resilience score displayed
- [ ] Findings list populated

### 7.2 DR Plans
- [ ] DR Plans list loads
- [ ] Plan detail shows RPO/RTO targets
- [ ] Backup sets listed
- [ ] Restore tests listed

### 7.3 Record Restore Test
```bash
curl -X POST https://your-domain.replit.app/api/restores/test \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"drPlanId":"...","result":"pass","durationMinutes":30}'
```
- [ ] Restore test recorded
- [ ] Dashboard updates

## 8. Govern Function

### 8.1 Governance Dashboard
- [ ] Navigate to /governance
- [ ] CSF coverage chart loads
- [ ] KPI cards display metrics
- [ ] Evidence freshness shown
- [ ] IR SLA% calculated

### 8.2 Compliance Page
- [ ] Navigate to /compliance
- [ ] CSF matrix loads
- [ ] Function coverage shown
- [ ] Drill-down to controls works

### 8.3 Export Report
- [ ] Click "Export Executive Report"
- [ ] Report downloads/displays
- [ ] Contains all sections

## 9. API Endpoints

### 9.1 Core Endpoints
- [ ] GET /api/assets → 200
- [ ] GET /api/detections → 200
- [ ] GET /api/incidents → 200
- [ ] GET /api/controls → 200
- [ ] GET /api/stats → 200

### 9.2 Rate Limiting
- [ ] X-RateLimit headers present
- [ ] Rate limit not too restrictive

## 10. Reports

### 10.1 Report Downloads
- [ ] Executive Governance Report
- [ ] Threat Intel Digest
- [ ] Detections & Incidents Report
- [ ] Recover/Resilience Status
- [ ] Control Coverage Report

## Sign-Off

| Check | Passed | Failed | Notes |
|-------|--------|--------|-------|
| Infrastructure | | | |
| Authentication | | | |
| Identify | | | |
| Detect | | | |
| Respond | | | |
| Protect | | | |
| Recover | | | |
| Govern | | | |
| API | | | |
| Reports | | | |

**Overall Status**: [ ] PASS / [ ] FAIL

**Tester Signature**: _______________

**Date**: _______________

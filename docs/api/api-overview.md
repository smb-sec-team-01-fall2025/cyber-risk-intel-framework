# API Reference

## Overview

The SMB Security Platform API is a RESTful HTTP API. All responses are in JSON format.

**Base URL**: `https://your-domain.replit.app/api`

## Authentication

Session-based authentication using cookies. Login first to establish a session.

```bash
# Login
curl -X POST https://your-domain.replit.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst","password":"demo123"}' \
  -c cookies.txt

# Use session cookie for subsequent requests
curl https://your-domain.replit.app/api/assets -b cookies.txt
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Login required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Health & Status

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T20:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### GET /version

Version information.

**Response**:
```json
{
  "version": "1.0.0",
  "build": "abc123",
  "environment": "production"
}
```

### GET /metrics

System metrics.

**Response**:
```json
{
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 67108864,
    "rss": 104857600
  },
  "uptime": 86400
}
```

---

## Assets (Identify)

### GET /api/assets

List all assets.

**Query Parameters**:
- `type` (optional): Filter by asset type
- `search` (optional): Search by name/IP

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "web-server-01",
    "type": "server",
    "ip": "192.168.1.10",
    "hostname": "web-server-01.local",
    "criticality": 4,
    "riskScore": 75,
    "status": "active"
  }
]
```

### GET /api/assets/:id

Get asset details.

**Response**:
```json
{
  "id": "uuid",
  "name": "web-server-01",
  "type": "server",
  "ip": "192.168.1.10",
  "hostname": "web-server-01.local",
  "criticality": 4,
  "riskScore": 75,
  "status": "active",
  "metadata": {}
}
```

### POST /api/assets

Create new asset.

**Request Body**:
```json
{
  "name": "new-server",
  "type": "server",
  "ip": "192.168.1.20",
  "criticality": 3
}
```

### GET /api/assets/top-risky

Get top risky assets.

**Query Parameters**:
- `limit` (optional): Number of assets (default: 5)

---

## Intel Events (Detect)

### GET /api/intel

List intel events.

**Query Parameters**:
- `severity` (optional): Filter by severity
- `source` (optional): Filter by source
- `limit` (optional): Number of events

**Response**:
```json
[
  {
    "id": "uuid",
    "indicator": "192.168.1.100",
    "indicatorType": "ip",
    "severity": 4,
    "source": "shodan",
    "title": "Open SSH port detected",
    "description": "...",
    "firstSeen": "2025-12-01T00:00:00Z",
    "lastSeen": "2025-12-11T00:00:00Z"
  }
]
```

### POST /api/osint/scan/trigger

Trigger OSINT scan.

**Response**:
```json
{
  "status": "started",
  "message": "OSINT scan triggered"
}
```

---

## Detections (Detect)

### GET /api/detections

List detections.

**Query Parameters**:
- `severity` (optional): Filter by severity
- `status` (optional): Filter by status

### GET /api/detections/:id

Get detection details.

### GET /api/detections/recent

Get recent detections.

**Query Parameters**:
- `limit` (optional): Number of detections (default: 10)

### POST /api/detect/run

Run detection engine.

**Response**:
```json
{
  "status": "success",
  "newDetections": 5,
  "updatedDetections": 2
}
```

---

## Incidents (Respond)

### GET /api/incidents

List incidents.

**Query Parameters**:
- `phase` (optional): Filter by phase
- `severity` (optional): Filter by severity

### GET /api/incidents/:id

Get incident details including tasks and timeline.

### POST /api/incidents

Create new incident.

**Request Body**:
```json
{
  "title": "Suspicious login activity",
  "description": "Multiple failed login attempts from external IP",
  "severity": "high",
  "detectionId": "optional-detection-uuid"
}
```

### PATCH /api/incidents/:id

Update incident.

**Request Body**:
```json
{
  "phase": "containment",
  "assignee": "analyst@company.com"
}
```

### POST /api/incidents/:id/timeline

Add timeline entry.

**Request Body**:
```json
{
  "type": "note",
  "content": "Contacted asset owner for verification"
}
```

### POST /api/incidents/:id/tasks

Add task.

**Request Body**:
```json
{
  "title": "Block source IP",
  "description": "Add IP to firewall blocklist",
  "dueDate": "2025-12-12T00:00:00Z"
}
```

### POST /api/respond/run

Generate AI playbook for incident.

**Request Body**:
```json
{
  "incidentId": "uuid"
}
```

---

## Controls (Protect)

### GET /api/controls

List controls.

**Query Parameters**:
- `family` (optional): Filter by control family (AC, AU, IA, etc.)
- `status` (optional): Filter by status

### GET /api/controls/:id

Get control details with SOP.

### PATCH /api/controls/:id

Update control status.

**Request Body**:
```json
{
  "status": "implemented",
  "evidence": "Evidence documentation reference"
}
```

### POST /api/protect/run

Generate control recommendations.

**Request Body**:
```json
{
  "assetId": "optional-uuid",
  "focus": "optional-area"
}
```

---

## DR Plans & Recovery

### GET /api/dr-plans

List DR plans.

### GET /api/dr-plans/:id

Get DR plan details.

### POST /api/backups/report

Report backup execution.

**Request Body**:
```json
{
  "drPlanId": "uuid",
  "status": "success",
  "sizeBytes": 1073741824,
  "provider": "aws-s3"
}
```

### POST /api/restores/test

Record restore test.

**Request Body**:
```json
{
  "drPlanId": "uuid",
  "result": "pass",
  "durationMinutes": 45,
  "dataLossPercent": 0,
  "environment": "lab"
}
```

### POST /api/recover/run

Run resilience analysis.

**Request Body**:
```json
{
  "drPlanId": "optional-uuid"
}
```

---

## Governance

### GET /api/coverage

Get CSF coverage metrics.

### GET /api/stats

Get platform statistics.

### GET /api/stats/trend

Get trend data (7 days).

### GET /api/governance/kpis

Get governance KPIs.

**Response**:
```json
{
  "mttd": 4.5,
  "mttr": 12.3,
  "irSlaPercent": 92,
  "controlCoverage": 78,
  "evidenceFreshness": 85,
  "rpoCompliance": 95,
  "rtoCompliance": 88
}
```

### GET /api/governance/report

Generate executive governance report.

### POST /api/govern/run

Run governance analysis.

---

## Scheduler

### GET /api/scheduler/status

Get scheduler status.

**Response**:
```json
{
  "isRunning": true,
  "jobs": {
    "osintScan": { "lastRun": "...", "nextRun": "..." },
    "slaMonitor": { "lastRun": "...", "nextRun": "..." },
    "rpoRtoCheck": { "lastRun": "...", "nextRun": "..." }
  }
}
```

### POST /api/scheduler/trigger-rpo-rto-check

Manually trigger RPO/RTO compliance check.

---

## Error Responses

All errors return:
```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": {} // Optional additional info
}
```

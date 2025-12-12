# Security Analyst User Guide

## Introduction

Welcome to the SMB Security Platform. This guide covers daily operations for security analysts, including threat monitoring, incident response, and compliance tracking.

## Getting Started

### Logging In

1. Navigate to the platform URL
2. Enter your credentials (email and password)
3. You'll be redirected to the main dashboard

### Dashboard Overview

The main dashboard provides a quick security posture snapshot:

- **Stats Cards**: Total assets, intel events, detections, active incidents
- **Trend Chart**: Detection trends over the past 7 days
- **Top Risky Assets**: Assets with highest risk scores
- **Recent Activity**: Latest detections and incidents

## Daily Workflows

### Morning Review (Recommended)

1. Check Dashboard for overnight alerts
2. Review new Intel Events (Detect → Intel Events)
3. Check open incidents requiring attention
4. Review any SLA breaches

### Threat Monitoring

#### Viewing Intel Events

1. Navigate to **Detect → Intel Events**
2. Events are sorted by date (newest first)
3. Filter by severity: Critical, High, Medium, Low, Info
4. Click an event to see details and linked assets

#### Understanding Detections

Detections are generated when threat intel matches your assets:

1. Navigate to **Detect → Detections**
2. Review detection severity and confidence
3. Check linked assets and indicators
4. Determine if incident creation is needed

### Incident Response

#### Creating an Incident

From a detection:
1. Open the detection detail page
2. Click **Create Incident** button
3. Fill in title, description, severity
4. AI will generate a playbook

Manually:
1. Navigate to **Respond → Incidents**
2. Click **New Incident**
3. Complete the form

#### Managing Incidents

**Phases**: Open → Triage → Containment → Eradication → Recovery → Closed

For each phase:
1. Complete assigned tasks
2. Add timeline entries for actions taken
3. Upload evidence references
4. When ready, advance to next phase

#### AI-Generated Playbooks

The system generates task recommendations based on:
- Incident severity
- Linked detections
- Asset criticality
- NIST guidelines

Tasks include:
- Step-by-step actions
- Recommended owners
- Due dates based on SLA

### Asset Management

#### Viewing Assets

1. Navigate to **Identify → Assets**
2. Browse or search the asset inventory
3. Click an asset for detailed view

#### Asset Detail Tabs

- **Overview**: Basic info, criticality, risk score
- **Intel**: Linked threat intelligence events
- **Detections**: Security detections for this asset
- **Recover**: DR plan and backup status

#### Risk Scores

Risk scores (0-100) are calculated based on:
- Asset criticality (1-5)
- Linked threat severity
- Recent detection activity

### Compliance Monitoring

#### Governance Dashboard

1. Navigate to **Govern → Dashboard**
2. Review CSF function coverage
3. Check KPI metrics:
   - MTTD (Mean Time to Detect)
   - MTTR (Mean Time to Resolve)
   - IR SLA compliance %
   - Control coverage %

#### Controls Status

1. Navigate to **Protect → Controls**
2. Filter by family (AC, AU, IA, etc.)
3. Filter by status (Proposed, In-Progress, Implemented)
4. View SOPs for implementation guidance

### Reporting

#### Available Reports

1. **Executive Governance Report**: High-level summary for leadership
2. **Threat Intel Digest**: Recent threat activity summary
3. **Detections & Incidents**: 30-day operational metrics
4. **Recover Status**: RPO/RTO compliance
5. **Control Coverage**: Implementation status

#### Exporting Reports

1. Navigate to the relevant dashboard
2. Click the export/download button
3. Reports generate in Markdown or PDF format

## Best Practices

### Incident Handling

1. Always document your actions in the timeline
2. Reference evidence by adding metadata entries
3. Don't skip phases unless documented and approved
4. Update incident severity if it changes

### Detection Triage

1. Review linked assets first
2. Check historical patterns
3. Correlate with other recent events
4. Document false positives for tuning

### Communication

1. Use timeline entries for status updates
2. Tag relevant team members in tasks
3. Escalate P1/P2 incidents immediately

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+K | Open command palette |
| G then D | Go to Dashboard |
| G then I | Go to Incidents |
| G then A | Go to Assets |

## Troubleshooting

### Dashboard Not Loading

1. Check your network connection
2. Clear browser cache
3. Try refreshing the page
4. Contact admin if issue persists

### Missing Data

1. Check date filters
2. Verify you have access to the data
3. OSINT scans run hourly; new data may take time

### Session Expired

1. Log in again
2. Sessions expire after 24 hours of inactivity

## Getting Help

- **Technical Issues**: Contact your system administrator
- **Security Questions**: Escalate to your security lead
- **Platform Bugs**: Report via the feedback mechanism

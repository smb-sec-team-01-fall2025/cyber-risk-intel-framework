# Detections & Incidents Report

**Report Period**: November 11 - December 11, 2025 (30 Days)  
**Generated**: December 11, 2025  
**Classification**: Internal Use Only

---

## Executive Summary

This report summarizes detection and incident response activity over the past 30 days.

### Key Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Detections | 42 | - | - |
| Total Incidents | 8 | - | - |
| MTTD | 4.2 hours | <8 hours | On Target |
| MTTR | 18.5 hours | <24 hours | On Target |
| SLA Compliance | 92% | >90% | On Target |

---

## Detection Summary

### By Severity

| Severity | Count | % |
|----------|-------|---|
| Critical | 2 | 5% |
| High | 8 | 19% |
| Medium | 18 | 43% |
| Low | 10 | 24% |
| Info | 4 | 9% |
| **Total** | **42** | **100%** |

### By Status

| Status | Count |
|--------|-------|
| New | 5 |
| Investigating | 8 |
| Confirmed | 12 |
| False Positive | 6 |
| Resolved | 11 |

### By Detection Type

| Type | Count | Description |
|------|-------|-------------|
| External Threat | 18 | Malicious external activity |
| Misconfiguration | 12 | Security misconfigurations |
| Vulnerability | 8 | Known CVEs or weaknesses |
| Policy Violation | 4 | Internal policy breaches |

### Top 10 Detections

| ID | Title | Severity | Asset | Status |
|----|-------|----------|-------|--------|
| DET-001 | SSH brute force attempt | High | web-server-01 | Resolved |
| DET-002 | Exposed admin panel | High | app-server-02 | Resolved |
| DET-003 | Outdated SSL/TLS | Medium | lb-primary | Investigating |
| DET-004 | Port scanning activity | Medium | vpn-gateway | Monitoring |
| DET-005 | Malware hash match | Critical | workstation-05 | Resolved |
| DET-006 | DNS tunneling indicators | High | dns-server | Investigating |
| DET-007 | Unauthorized API access | Medium | api-gateway | Resolved |
| DET-008 | Certificate expiring | Low | mail-server | Resolved |
| DET-009 | Suspicious outbound traffic | High | db-primary | Investigating |
| DET-010 | Default credentials | Critical | network-switch | Resolved |

---

## Incident Summary

### By Severity

| Severity | Count | % |
|----------|-------|---|
| P1 (Critical) | 1 | 12.5% |
| P2 (High) | 2 | 25% |
| P3 (Medium) | 4 | 50% |
| P4 (Low) | 1 | 12.5% |
| **Total** | **8** | **100%** |

### By Current Phase

| Phase | Count |
|-------|-------|
| Open | 1 |
| Triage | 1 |
| Containment | 2 |
| Eradication | 0 |
| Recovery | 1 |
| Closed | 3 |

### SLA Performance

| Severity | SLA | Met | Breached | Compliance |
|----------|-----|-----|----------|------------|
| P1 | 4 hours | 1 | 0 | 100% |
| P2 | 8 hours | 2 | 0 | 100% |
| P3 | 24 hours | 3 | 1 | 75% |
| P4 | 72 hours | 1 | 0 | 100% |
| **Total** | - | **7** | **1** | **92%** |

### Incident Details

| ID | Title | Severity | Created | Phase | MTTR |
|----|-------|----------|---------|-------|------|
| INC-2025-041 | Malware detection on workstation | P1 | Nov 15 | Closed | 3.5h |
| INC-2025-042 | SSH brute force campaign | P2 | Nov 20 | Closed | 12h |
| INC-2025-043 | Exposed admin interface | P2 | Nov 28 | Closed | 8h |
| INC-2025-044 | SSL/TLS misconfiguration | P3 | Dec 1 | Recovery | 24h |
| INC-2025-045 | Suspicious API activity | P3 | Dec 3 | Containment | - |
| INC-2025-046 | DNS anomaly investigation | P3 | Dec 5 | Containment | - |
| INC-2025-047 | Certificate renewal urgent | P4 | Dec 8 | Closed | 4h |
| INC-2025-048 | Outbound traffic investigation | P3 | Dec 10 | Triage | - |

---

## Response Metrics

### Mean Time to Detect (MTTD)

Average time from threat occurrence to detection.

| Week | MTTD (hours) | Trend |
|------|--------------|-------|
| Nov 11-17 | 5.2 | - |
| Nov 18-24 | 4.8 | Improving |
| Nov 25 - Dec 1 | 4.5 | Improving |
| Dec 2-8 | 4.0 | Improving |
| Dec 9-11 | 3.8 | Improving |
| **Average** | **4.2** | - |

### Mean Time to Resolve (MTTR)

Average time from incident creation to closure.

| Week | MTTR (hours) | Trend |
|------|--------------|-------|
| Nov 11-17 | 22.0 | - |
| Nov 18-24 | 20.5 | Improving |
| Nov 25 - Dec 1 | 18.0 | Improving |
| Dec 2-8 | 16.5 | Improving |
| Dec 9-11 | 15.5 | Improving |
| **Average** | **18.5** | - |

### Response Time by Severity

| Severity | Avg Detection | Avg Response | Avg Resolution |
|----------|---------------|--------------|----------------|
| P1 | 1.2h | 0.5h | 3.5h |
| P2 | 2.8h | 1.2h | 10h |
| P3 | 5.5h | 2.5h | 24h |
| P4 | 8.0h | 4.0h | 48h |

---

## Asset Impact

### Most Impacted Assets

| Asset | Detections | Incidents | Risk Score |
|-------|------------|-----------|------------|
| web-server-01 | 8 | 2 | 78 |
| app-server-02 | 5 | 1 | 65 |
| vpn-gateway | 4 | 1 | 58 |
| db-primary | 3 | 1 | 55 |
| dns-server | 3 | 1 | 52 |

### Impact by Asset Type

| Type | Detections | Incidents |
|------|------------|-----------|
| Servers | 22 | 5 |
| Network | 10 | 2 |
| Cloud | 6 | 1 |
| Workstations | 4 | 0 |

---

## Trend Analysis

### Weekly Detection Volume

```
Nov 11-17: [########--] 12
Nov 18-24: [######----] 9
Nov 25-Dec 1: [########--] 11
Dec 2-8: [######----] 7
Dec 9-11: [###-------] 3
```

### Incident Closure Rate

| Week | Opened | Closed | Net |
|------|--------|--------|-----|
| Nov 11-17 | 2 | 1 | +1 |
| Nov 18-24 | 2 | 2 | 0 |
| Nov 25 - Dec 1 | 2 | 1 | +1 |
| Dec 2-8 | 1 | 2 | -1 |
| Dec 9-11 | 1 | 0 | +1 |

---

## Lessons Learned

### Successful Responses

1. **Malware incident (INC-2025-041)**: Quick isolation prevented spread
2. **SSH campaign (INC-2025-042)**: Firewall rules effectively blocked attackers
3. **Admin exposure (INC-2025-043)**: VPN restriction eliminated risk

### Areas for Improvement

1. P3 SLA breach due to delayed triage during weekend
2. Detection-to-incident conversion could be faster
3. Need better automation for common response actions

---

## Recommendations

1. **Implement weekend on-call rotation** to prevent SLA breaches
2. **Automate incident creation** for high-severity detections
3. **Create runbooks** for common incident types
4. **Review detection rules** to reduce false positives

---

*Report generated by SMB Security Platform Respond Agent*

# Backlog

Issues and enhancements deferred from v1.0.0 release.

## Priority Definitions

- **P1 Critical**: Blocks core functionality
- **P2 High**: Significant impact, should address soon
- **P3 Medium**: Nice to have, plan for future release
- **P4 Low**: Minor enhancement, address when convenient

---

## Deferred Items

### Security Enhancements

#### SEC-001: Implement CSRF Tokens (P3)
**Description**: Add CSRF token validation for form submissions  
**Rationale**: SameSite cookies provide primary protection; tokens add defense-in-depth  
**Effort**: 4 hours  
**Target**: v1.1.0

#### SEC-002: Implement Full RBAC Enforcement (P2)
**Description**: Enforce role checks on all protected routes  
**Rationale**: Schema defined but route-level enforcement incomplete  
**Effort**: 8 hours  
**Target**: v1.1.0

#### SEC-003: Add MFA Support (P3)
**Description**: Implement TOTP-based multi-factor authentication  
**Rationale**: Enhances account security for admin users  
**Effort**: 16 hours  
**Target**: v1.2.0

### Performance Improvements

#### PERF-001: Add Redis Caching (P3)
**Description**: Implement Redis for session store and query caching  
**Rationale**: Reduces database load, improves response times  
**Effort**: 8 hours  
**Target**: v1.1.0

#### PERF-002: Implement Query Optimization (P4)
**Description**: Add database indexes for complex queries  
**Rationale**: Some queries could benefit from additional indexes  
**Effort**: 4 hours  
**Target**: v1.1.0

#### PERF-003: Lazy Loading for Large Data Sets (P3)
**Description**: Implement pagination and virtual scrolling  
**Rationale**: Intel events page can be slow with many entries  
**Effort**: 8 hours  
**Target**: v1.1.0

### Feature Enhancements

#### FEAT-001: Email Digest Notifications (P3)
**Description**: Daily/weekly email summaries of security posture  
**Rationale**: Keeps stakeholders informed without dashboard access  
**Effort**: 12 hours  
**Target**: v1.2.0

#### FEAT-002: Custom Report Builder (P4)
**Description**: Allow users to create custom report templates  
**Rationale**: Different stakeholders need different views  
**Effort**: 20 hours  
**Target**: v2.0.0

#### FEAT-003: Webhook Integrations (P3)
**Description**: Send alerts to Slack, Teams, PagerDuty  
**Rationale**: Integration with existing incident workflows  
**Effort**: 12 hours  
**Target**: v1.2.0

#### FEAT-004: API Key Authentication (P2)
**Description**: Allow API access via API keys for automation  
**Rationale**: Enables integration with external tools  
**Effort**: 8 hours  
**Target**: v1.1.0

### UI/UX Improvements

#### UX-001: Dark Mode Toggle Persistence (P4)
**Description**: Remember dark mode preference across sessions  
**Rationale**: Minor convenience improvement  
**Effort**: 2 hours  
**Target**: v1.1.0

#### UX-002: Keyboard Shortcuts (P4)
**Description**: Add keyboard navigation for power users  
**Rationale**: Improves analyst efficiency  
**Effort**: 8 hours  
**Target**: v1.2.0

#### UX-003: Mobile Responsive Improvements (P3)
**Description**: Improve mobile experience for dashboards  
**Rationale**: Some views don't render well on mobile  
**Effort**: 12 hours  
**Target**: v1.2.0

### Technical Debt

#### TECH-001: Migrate to PostgreSQL Session Store (P2)
**Description**: Move from memory session store to PostgreSQL  
**Rationale**: Sessions don't persist across restarts  
**Effort**: 4 hours  
**Target**: v1.1.0

#### TECH-002: Add Unit Test Coverage (P2)
**Description**: Increase test coverage to 80%  
**Rationale**: Current coverage insufficient for CI confidence  
**Effort**: 20 hours  
**Target**: v1.1.0

#### TECH-003: Refactor OSINT Adapters (P3)
**Description**: Consolidate adapter patterns, improve error handling  
**Rationale**: Some code duplication across adapters  
**Effort**: 8 hours  
**Target**: v1.2.0

### Documentation

#### DOC-001: Video Tutorials (P4)
**Description**: Create video walkthroughs for common tasks  
**Rationale**: Complements written documentation  
**Effort**: 16 hours  
**Target**: v1.2.0

#### DOC-002: Developer API Documentation (P3)
**Description**: OpenAPI spec with interactive examples  
**Rationale**: Enables third-party integrations  
**Effort**: 8 hours  
**Target**: v1.1.0

---

## Completed (Recently Closed)

| ID | Title | Completed |
|----|-------|-----------|
| SEC-000 | Security Headers | Dec 2025 |
| SEC-000 | Rate Limiting | Dec 2025 |
| FEAT-000 | Recover Agent | Dec 2025 |
| FEAT-000 | Govern Agent | Dec 2025 |

---

## How to Contribute

1. Pick an item from this backlog
2. Create a branch: `feature/ITEM-ID-description`
3. Implement with tests
4. Submit PR for review
5. Update this document when merged

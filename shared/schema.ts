import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { 
  pgTable, text, varchar, integer, timestamp, json, boolean, pgEnum, bigint
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const assetTypeEnum = pgEnum("asset_type", ["HW", "SW", "Data", "User", "Service"]);
export const dataSensitivityEnum = pgEnum("data_sensitivity", ["Low", "Medium", "High", "Critical"]);
export const riskStatusEnum = pgEnum("risk_status", ["Open", "In-Progress", "Mitigated", "Accepted", "Closed"]);
export const detectionSourceEnum = pgEnum("detection_source", ["shodan", "otx", "greynoise", "abuseipdb", "censys", "virustotal", "misp"]);
export const matchTypeEnum = pgEnum("match_type", ["ip", "domain", "hostname", "hash"]);
export const controlFamilyEnum = pgEnum("control_family", ["AC", "AU", "AT", "CM", "CP", "IA", "IR", "MA", "MP", "PS", "PE", "PL", "PM", "RA", "CA", "SC", "SI", "SA", "SR"]);
export const controlStatusEnum = pgEnum("control_status", ["Proposed", "In-Progress", "Implemented", "Declined"]);
export const csfFunctionEnum = pgEnum("csf_function", ["Identify", "Protect", "Detect", "Respond", "Recover", "Govern"]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["P1", "P2", "P3", "P4"]);
export const incidentStatusEnum = pgEnum("incident_status", ["Open", "Triage", "Containment", "Eradication", "Recovery", "Closed"]);
export const incidentPhaseEnum = pgEnum("incident_phase", ["Triage", "Containment", "Eradication", "Recovery", "Close"]);
export const taskStatusEnum = pgEnum("task_status", ["Open", "Done", "Skipped"]);
export const evidenceTypeEnum = pgEnum("evidence_type", ["screenshot", "log", "pcap", "config", "ticket", "other"]);

// Week 7: Recover Function enums
export const backupFrequencyEnum = pgEnum("backup_frequency", ["hourly", "daily", "weekly", "monthly"]);
export const backupTypeEnum = pgEnum("backup_type", ["full", "incremental", "differential", "snapshot"]);
export const backupStatusEnum = pgEnum("backup_status", ["success", "failed", "partial", "in_progress"]);
export const restoreStatusEnum = pgEnum("restore_status", ["in_progress", "passed", "failed", "partial"]);
export const restoreEnvironmentEnum = pgEnum("restore_environment", ["lab", "prod", "sandbox"]);
export const drPlanStatusEnum = pgEnum("dr_plan_status", ["Active", "Inactive", "Under Review"]);
export const resilienceFindingTypeEnum = pgEnum("resilience_finding_type", [
  "coverage_gap",
  "rpo_violation",
  "rto_violation",
  "backup_failure",
  "restore_failure",
  "plan_outdated",
  "resilience_score_drop"
]);
export const resilienceFindingStatusEnum = pgEnum("resilience_finding_status", ["open", "in_progress", "resolved", "accepted_risk"]);

// Week 8: Govern Function enums
export const complianceStatusEnum = pgEnum("compliance_status", ["NotAssessed", "NotApplicable", "Planned", "PartiallyImplemented", "Implemented"]);
export const poamDriverEnum = pgEnum("poam_driver", ["coverage_gap", "stale_evidence", "sla_breach", "rpo_rto_gap", "control_missing", "kpi_below_target"]);
export const poamStatusEnum = pgEnum("poam_status", ["Open", "In-Progress", "Completed", "Deferred"]);

// ============================================================================
// WEEK 1-2: CORE TABLES (Users, Assets, Intel Events, Risk Items)
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("analyst"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 120 }).notNull(),
  type: assetTypeEnum("type").notNull(),
  ip: text("ip"),
  hostname: text("hostname"),
  owner: text("owner"),
  businessUnit: text("business_unit"),
  criticality: integer("criticality").notNull().default(2), // 1-5
  riskScore: integer("risk_score").default(0), // criticality × max_intel_severity_last_7d
  dataSensitivity: dataSensitivityEnum("data_sensitivity").default("Low"),
  description: text("description"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const intelEvents = pgTable("intel_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: detectionSourceEnum("source").notNull(),
  indicator: varchar("indicator", { length: 255 }).notNull(),
  raw: json("raw").notNull(),
  severity: integer("severity").notNull().default(1), // 1-5 (AI-generated)
  description: text("description"), // AI-generated summary of raw data
  createdAt: timestamp("created_at").defaultNow(),
});

export const riskItems = pgTable("risk_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  likelihood: integer("likelihood").notNull(), // 1-5
  impact: integer("impact").notNull(), // 1-5
  score: integer("score").notNull(), // calculated: likelihood × impact
  residualRisk: integer("residual_risk"), // after controls
  status: riskStatusEnum("status").default("Open"),
  owner: text("owner"),
  dueDate: timestamp("due_date"),
  treatment: text("treatment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// WEEK 3: ASSET-INTEL LINKING
// ============================================================================

export const assetIntelLinks = pgTable("asset_intel_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  intelId: varchar("intel_id").notNull().references(() => intelEvents.id, { onDelete: "cascade" }),
  matchType: matchTypeEnum("match_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// WEEK 4: DETECTIONS
// ============================================================================

export const detections = pgTable("detections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  source: detectionSourceEnum("source").notNull(),
  indicator: varchar("indicator", { length: 255 }).notNull(),
  severity: integer("severity").notNull(), // 1-5
  confidence: integer("confidence").notNull().default(60), // 0-100
  ttp: text("ttp").array().default(sql`'{}'::text[]`), // MITRE ATT&CK tactics
  analystNote: text("analyst_note"),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  hitCount: integer("hit_count").default(1),
  rawRef: json("raw_ref"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// WEEK 5: CONTROLS & POLICIES (NIST 800-53)
// ============================================================================

export const controls = pgTable("controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id", { length: 20 }).notNull().unique(), // e.g., "AC-2", "IA-2"
  family: controlFamilyEnum("family").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  csfFunction: csfFunctionEnum("csf_function").notNull(),
  csfCategory: varchar("csf_category", { length: 20 }), // e.g., "PR.AC", "DE.CM"
  csfSubcategory: varchar("csf_subcategory", { length: 50 }), // e.g., "PR.AC-1"
  applicabilityRule: json("applicability_rule"), // JSON logic for which assets it applies to
  implementationStatus: controlStatusEnum("implementation_status").default("Proposed"),
  evidenceRequired: text("evidence_required").array(),
  sopId: varchar("sop_id"),
  priority: integer("priority").default(3), // 1-5, higher = more important
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sops = pgTable("sops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").references(() => controls.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  scope: text("scope"),
  owner: text("owner"),
  cadence: text("cadence"),
  steps: text("steps").array().notNull(),
  evidenceToCollect: text("evidence_to_collect").array(),
  successCriteria: text("success_criteria"),
  content: text("content"), // Full markdown content
  createdAt: timestamp("created_at").defaultNow(),
});

export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  scope: text("scope"), // org/BU/tags
  status: text("status").default("Draft"),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const controlMappings = pgTable("control_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").references(() => controls.id, { onDelete: "cascade" }),
  csfRef: text("csf_ref").notNull(), // "Identify/PR.AC/PR.AC-1"
  references: text("references").array(), // ["CIS 1.1", "ISO 27001 A.9.1"]
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const policyAssignments = pgTable("policy_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  controlId: varchar("control_id").references(() => controls.id, { onDelete: "cascade" }),
  status: controlStatusEnum("status").default("Proposed"),
  owner: text("owner"),
  dueDate: timestamp("due_date"),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const controlEvidence = pgTable("control_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").references(() => controls.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  evidenceType: evidenceTypeEnum("evidence_type").notNull(),
  location: text("location").notNull(),
  hash: text("hash"),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  chainOfCustody: json("chain_of_custody"), // [{who, when, action}]
});

// ============================================================================
// WEEK 6: INCIDENTS & IR WORKFLOW
// ============================================================================

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentNumber: varchar("incident_number", { length: 50 }).unique(), // e.g., "INC-104"
  title: text("title").notNull(),
  description: text("description"), // User-provided incident description
  severity: incidentSeverityEnum("severity").notNull(),
  status: incidentStatusEnum("status").default("Open"),
  openedAt: timestamp("opened_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  owner: text("owner"),
  slaDueAt: timestamp("sla_due_at"),
  slaBreached: boolean("sla_breached").default(false),
  primaryAssetId: varchar("primary_asset_id").references(() => assets.id),
  detectionRefs: text("detection_refs").array(), // Array of detection IDs
  riskItemRefs: text("risk_item_refs").array(), // Array of risk item IDs
  summary: text("summary"),
  rootCause: text("root_cause"),
  lessonsLearned: text("lessons_learned"),
  tags: text("tags").array(),
});

export const incidentTasks = pgTable("incident_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  phase: incidentPhaseEnum("phase").notNull(),
  title: text("title").notNull(),
  assignee: text("assignee"),
  dueAt: timestamp("due_at"),
  status: taskStatusEnum("status").default("Open"),
  notes: text("notes"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incidentTimeline = pgTable("incident_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow(),
  actor: text("actor").notNull(), // "system" or "user:<id>"
  eventType: text("event_type").notNull(), // opened, status_change, note, comms, evidence, task_update, link_added
  detail: json("detail"),
});

export const incidentEvidence = pgTable("incident_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => assets.id),
  detectionId: varchar("detection_id").references(() => detections.id),
  evidenceType: evidenceTypeEnum("evidence_type").notNull(),
  location: text("location").notNull(),
  hash: text("hash"),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  chainOfCustody: json("chain_of_custody"),
});

export const detectionIncidentLinks = pgTable("detection_incident_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  detectionId: varchar("detection_id").notNull().references(() => detections.id, { onDelete: "cascade" }),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  linkedAt: timestamp("linked_at").defaultNow(),
  linkageType: text("linkage_type").default("auto"), // "auto" | "manual"
});

// ============================================================================
// WEEK 7: RECOVER FUNCTION (Disaster Recovery & Business Continuity)
// ============================================================================

export const drPlans = pgTable("dr_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  scope: text("scope"), // business function or process description
  rpoMinutes: integer("rpo_minutes").notNull(), // Recovery Point Objective in minutes
  rtoMinutes: integer("rto_minutes").notNull(), // Recovery Time Objective in minutes
  backupFrequency: backupFrequencyEnum("backup_frequency").notNull(),
  retentionDays: integer("retention_days").notNull().default(30),
  status: drPlanStatusEnum("status").notNull().default("Active"),
  owner: text("owner"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  lastEvaluatedAt: timestamp("last_evaluated_at"), // by nightly scheduler
  lastResilienceScore: integer("last_resilience_score"), // 0-100
  lastRpoMinutesObserved: integer("last_rpo_minutes_observed"), // actual RPO from last backup
  lastRtoMinutesObserved: integer("last_rto_minutes_observed"), // actual RTO from last restore test
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const backupSets = pgTable("backup_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  drPlanId: varchar("dr_plan_id").references(() => drPlans.id, { onDelete: "set null" }),
  backupType: backupTypeEnum("backup_type").notNull(),
  backupWindowStart: timestamp("backup_window_start").notNull(),
  backupWindowEnd: timestamp("backup_window_end"),
  bytesStored: bigint("bytes_stored", { mode: "number" }), // backup size in bytes
  location: text("location").notNull(), // S3 bucket, tape ID, etc.
  status: backupStatusEnum("status").notNull().default("in_progress"),
  errorMessage: text("error_message"),
  checksum: text("checksum"), // SHA-256 or provider hash
  rpoBreached: boolean("rpo_breached").default(false),
  dataAgeMinutes: integer("data_age_minutes"), // time between data snapshot and backup completion
  metadata: json("metadata"), // provider-specific details (snapshot IDs, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const restoreTests = pgTable("restore_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  backupSetId: varchar("backup_set_id").notNull().references(() => backupSets.id, { onDelete: "cascade" }),
  drPlanId: varchar("dr_plan_id").references(() => drPlans.id, { onDelete: "set null" }),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  restoreDurationMinutes: integer("restore_duration_minutes"), // actual RTO achieved
  dataLossMinutes: integer("data_loss_minutes"), // actual RPO gap
  environment: restoreEnvironmentEnum("environment").notNull().default("lab"),
  status: restoreStatusEnum("status").notNull().default("in_progress"),
  failureReason: text("failure_reason"),
  testedBy: text("tested_by"),
  validationNotes: json("validation_notes"), // structured test artifacts
  findings: text("findings"), // what was learned
});

export const resilienceFindings = pgTable("resilience_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "cascade" }), // nullable for org-wide findings
  drPlanId: varchar("dr_plan_id").references(() => drPlans.id, { onDelete: "set null" }),
  findingType: resilienceFindingTypeEnum("finding_type").notNull(),
  severity: integer("severity").notNull(), // 1-5 scale
  title: text("title").notNull(),
  description: text("description").notNull(), // AI-generated analysis
  recommendation: text("recommendation").notNull(), // AI-generated remediation
  status: resilienceFindingStatusEnum("status").notNull().default("open"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  assignee: text("assignee"),
  aiRunId: varchar("ai_run_id"), // correlate with agent execution
});

// ============================================================================
// WEEK 8: GOVERN FUNCTION TABLES
// ============================================================================

// Compliance Assertions - structured assertion per CSF subcategory
export const complianceAssertions = pgTable("compliance_assertions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  csfFunction: csfFunctionEnum("csf_function").notNull(),
  category: varchar("category", { length: 20 }).notNull(), // e.g., "ID.AM", "PR.AC"
  subcategory: varchar("subcategory", { length: 50 }).notNull(), // e.g., "ID.AM-1", "PR.AC-1"
  status: complianceStatusEnum("status").notNull().default("NotAssessed"),
  owner: text("owner"),
  evidenceRefs: text("evidence_refs").array().default(sql`'{}'::text[]`), // references to evidence catalog
  lastVerifiedAt: timestamp("last_verified_at"),
  nextReviewDue: timestamp("next_review_due"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evidence Catalog - centralized evidence repository
export const evidenceCatalog = pgTable("evidence_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").references(() => controls.id, { onDelete: "set null" }),
  assertionId: varchar("assertion_id").references(() => complianceAssertions.id, { onDelete: "set null" }),
  evidenceType: evidenceTypeEnum("evidence_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(), // file path, URL, or reference
  hash: text("hash"), // file hash for integrity verification
  submittedBy: text("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // for time-sensitive evidence
});

// Govern Metrics Snapshots - KPI history for trend analysis
export const governMetricsSnapshots = pgTable("govern_metrics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),
  coveragePct: integer("coverage_pct").notNull(), // 0-100
  evidenceFreshPct: integer("evidence_fresh_pct").notNull(), // 0-100
  mttrMinutes: integer("mttr_minutes"), // Mean Time To Resolve
  mttdMinutes: integer("mttd_minutes"), // Mean Time To Detect
  irSlaPct: integer("ir_sla_pct"), // IR SLA compliance 0-100
  rpoRtoPct: integer("rpo_rto_pct"), // RPO/RTO compliance 0-100
  openRisksCritical: integer("open_risks_critical").default(0),
  openRisksHigh: integer("open_risks_high").default(0),
  openRisksMedium: integer("open_risks_medium").default(0),
  openRisksLow: integer("open_risks_low").default(0),
  openPoamItems: integer("open_poam_items").default(0),
  totalAssets: integer("total_assets").default(0),
  totalControls: integer("total_controls").default(0),
  implementedControls: integer("implemented_controls").default(0),
  metrics: json("metrics"), // Additional metrics as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// POA&M Items - Plan of Action & Milestones
export const poamItems = pgTable("poam_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  driver: poamDriverEnum("driver").notNull(), // What caused this POA&M item
  severity: integer("severity").notNull().default(3), // 1-5
  owner: text("owner"),
  dueDate: timestamp("due_date"),
  status: poamStatusEnum("status").notNull().default("Open"),
  linkedAssertionId: varchar("linked_assertion_id").references(() => complianceAssertions.id, { onDelete: "set null" }),
  linkedRiskItemId: varchar("linked_risk_item_id").references(() => riskItems.id, { onDelete: "set null" }),
  linkedControlId: varchar("linked_control_id").references(() => controls.id, { onDelete: "set null" }),
  milestonesJson: json("milestones_json"), // [{title, dueDate, status}]
  remediation: text("remediation"), // Planned remediation steps
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const assetsRelations = relations(assets, ({ many }) => ({
  riskItems: many(riskItems),
  intelLinks: many(assetIntelLinks),
  detections: many(detections),
  policyAssignments: many(policyAssignments),
  incidents: many(incidents),
  drPlans: many(drPlans),
  backupSets: many(backupSets),
  restoreTests: many(restoreTests),
  resilienceFindings: many(resilienceFindings),
}));

export const intelEventsRelations = relations(intelEvents, ({ many }) => ({
  assetLinks: many(assetIntelLinks),
}));

export const riskItemsRelations = relations(riskItems, ({ one }) => ({
  asset: one(assets, {
    fields: [riskItems.assetId],
    references: [assets.id],
  }),
}));

export const detectionsRelations = relations(detections, ({ one }) => ({
  asset: one(assets, {
    fields: [detections.assetId],
    references: [assets.id],
  }),
}));

export const controlsRelations = relations(controls, ({ many, one }) => ({
  mappings: many(controlMappings),
  assignments: many(policyAssignments),
  evidence: many(controlEvidence),
  sop: one(sops, {
    fields: [controls.sopId],
    references: [sops.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  asset: one(assets, {
    fields: [incidents.primaryAssetId],
    references: [assets.id],
  }),
  tasks: many(incidentTasks),
  timeline: many(incidentTimeline),
  evidence: many(incidentEvidence),
}));

export const drPlansRelations = relations(drPlans, ({ one, many }) => ({
  asset: one(assets, {
    fields: [drPlans.assetId],
    references: [assets.id],
  }),
  backupSets: many(backupSets),
  restoreTests: many(restoreTests),
  resilienceFindings: many(resilienceFindings),
}));

export const backupSetsRelations = relations(backupSets, ({ one, many }) => ({
  asset: one(assets, {
    fields: [backupSets.assetId],
    references: [assets.id],
  }),
  drPlan: one(drPlans, {
    fields: [backupSets.drPlanId],
    references: [drPlans.id],
  }),
  restoreTests: many(restoreTests),
}));

export const restoreTestsRelations = relations(restoreTests, ({ one }) => ({
  asset: one(assets, {
    fields: [restoreTests.assetId],
    references: [assets.id],
  }),
  backupSet: one(backupSets, {
    fields: [restoreTests.backupSetId],
    references: [backupSets.id],
  }),
  drPlan: one(drPlans, {
    fields: [restoreTests.drPlanId],
    references: [drPlans.id],
  }),
}));

export const resilienceFindingsRelations = relations(resilienceFindings, ({ one }) => ({
  asset: one(assets, {
    fields: [resilienceFindings.assetId],
    references: [assets.id],
  }),
  drPlan: one(drPlans, {
    fields: [resilienceFindings.drPlanId],
    references: [drPlans.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// Assets
export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  criticality: z.number().min(1).max(5),
  ip: z.string().ip().optional().or(z.literal("")),
});

export const selectAssetSchema = createSelectSchema(assets);

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Intel Events
export const insertIntelEventSchema = createInsertSchema(intelEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertIntelEvent = z.infer<typeof insertIntelEventSchema>;
export type IntelEvent = typeof intelEvents.$inferSelect;

// Risk Items
export const insertRiskItemSchema = createInsertSchema(riskItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  score: true, // calculated
}).extend({
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
});

export type InsertRiskItem = z.infer<typeof insertRiskItemSchema>;
export type RiskItem = typeof riskItems.$inferSelect;

// Detections
export const insertDetectionSchema = createInsertSchema(detections).omit({
  id: true,
  createdAt: true,
  firstSeen: true,
  lastSeen: true,
  hitCount: true,
});

export type InsertDetection = z.infer<typeof insertDetectionSchema>;
export type Detection = typeof detections.$inferSelect;

// Controls
export const insertControlSchema = createInsertSchema(controls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertControl = z.infer<typeof insertControlSchema>;
export type Control = typeof controls.$inferSelect;

// SOPs
export const insertSopSchema = createInsertSchema(sops).omit({
  id: true,
  createdAt: true,
});

export type InsertSop = z.infer<typeof insertSopSchema>;
export type Sop = typeof sops.$inferSelect;

// Incidents
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  openedAt: true,
  updatedAt: true,
  closedAt: true,
  incidentNumber: true, // auto-generated
}).extend({
  severity: z.enum(["P1", "P2", "P3", "P4"]),
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// Incident Tasks
export const insertIncidentTaskSchema = createInsertSchema(incidentTasks).omit({
  id: true,
  createdAt: true,
});

export type InsertIncidentTask = z.infer<typeof insertIncidentTaskSchema>;
export type IncidentTask = typeof incidentTasks.$inferSelect;

// Detection Incident Links
export const insertDetectionIncidentLinkSchema = createInsertSchema(detectionIncidentLinks).omit({
  id: true,
  linkedAt: true,
});

export type InsertDetectionIncidentLink = z.infer<typeof insertDetectionIncidentLinkSchema>;
export type DetectionIncidentLink = typeof detectionIncidentLinks.$inferSelect;

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Week 7: Recover Function Tables

// DR Plans
export const insertDrPlanSchema = createInsertSchema(drPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastEvaluatedAt: true,
  lastResilienceScore: true,
  lastRpoMinutesObserved: true,
  lastRtoMinutesObserved: true,
}).extend({
  rpoMinutes: z.number().min(1),
  rtoMinutes: z.number().min(1),
  retentionDays: z.number().min(1),
});

export type InsertDrPlan = z.infer<typeof insertDrPlanSchema>;
export type DrPlan = typeof drPlans.$inferSelect;

// Backup Sets
export const insertBackupSetSchema = createInsertSchema(backupSets).omit({
  id: true,
  createdAt: true,
});

export type InsertBackupSet = z.infer<typeof insertBackupSetSchema>;
export type BackupSet = typeof backupSets.$inferSelect;

// Restore Tests
export const insertRestoreTestSchema = createInsertSchema(restoreTests).omit({
  id: true,
});

export type InsertRestoreTest = z.infer<typeof insertRestoreTestSchema>;
export type RestoreTest = typeof restoreTests.$inferSelect;

// Resilience Findings
export const insertResilienceFindingSchema = createInsertSchema(resilienceFindings).omit({
  id: true,
  detectedAt: true,
}).extend({
  severity: z.number().min(1).max(5),
});

export type InsertResilienceFinding = z.infer<typeof insertResilienceFindingSchema>;
export type ResilienceFinding = typeof resilienceFindings.$inferSelect;

// Week 8: Govern Function Tables

// Compliance Assertions
export const insertComplianceAssertionSchema = createInsertSchema(complianceAssertions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["NotAssessed", "NotApplicable", "Planned", "PartiallyImplemented", "Implemented"]),
  csfFunction: z.enum(["Identify", "Protect", "Detect", "Respond", "Recover", "Govern"]),
});

export type InsertComplianceAssertion = z.infer<typeof insertComplianceAssertionSchema>;
export type ComplianceAssertion = typeof complianceAssertions.$inferSelect;

// Evidence Catalog
export const insertEvidenceCatalogSchema = createInsertSchema(evidenceCatalog).omit({
  id: true,
  submittedAt: true,
});

export type InsertEvidenceCatalog = z.infer<typeof insertEvidenceCatalogSchema>;
export type EvidenceCatalog = typeof evidenceCatalog.$inferSelect;

// Govern Metrics Snapshots
export const insertGovernMetricsSnapshotSchema = createInsertSchema(governMetricsSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertGovernMetricsSnapshot = z.infer<typeof insertGovernMetricsSnapshotSchema>;
export type GovernMetricsSnapshot = typeof governMetricsSnapshots.$inferSelect;

// POA&M Items
export const insertPoamItemSchema = createInsertSchema(poamItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  driver: z.enum(["coverage_gap", "stale_evidence", "sla_breach", "rpo_rto_gap", "control_missing", "kpi_below_target"]),
  status: z.enum(["Open", "In-Progress", "Completed", "Deferred"]),
  severity: z.number().min(1).max(5),
});

export type InsertPoamItem = z.infer<typeof insertPoamItemSchema>;
export type PoamItem = typeof poamItems.$inferSelect;

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { 
  pgTable, text, varchar, integer, timestamp, json, boolean, pgEnum
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
  severity: integer("severity").notNull().default(1), // 1-5
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

// ============================================================================
// RELATIONS
// ============================================================================

export const assetsRelations = relations(assets, ({ many }) => ({
  riskItems: many(riskItems),
  intelLinks: many(assetIntelLinks),
  detections: many(detections),
  policyAssignments: many(policyAssignments),
  incidents: many(incidents),
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

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

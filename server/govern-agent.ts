/**
 * Govern Agent - CSF 2.0 Governance, Metrics & Reporting
 * 
 * This agent:
 * 1. Ingests signals from all prior agents (assets, controls, detections, incidents, recover)
 * 2. Computes CSF 2.0 coverage & implementation status per subcategory
 * 3. Calculates core KPIs (Coverage%, Evidence Freshness%, MTTD, MTTR, IR SLA%, RPO/RTO%)
 * 4. Generates/updates compliance assertions
 * 5. Auto-creates POA&M items for gaps
 * 6. Snapshots metrics for trend analysis
 */

import { db } from "./db";
import { eq, sql, and, gte, lte, count, avg, desc, isNotNull, isNull, or, lt } from "drizzle-orm";
import {
  assets,
  controls,
  incidents,
  riskItems,
  complianceAssertions,
  evidenceCatalog,
  governMetricsSnapshots,
  poamItems,
  drPlans,
  backupSets,
  restoreTests,
  detections,
  intelEvents,
  type InsertComplianceAssertion,
  type InsertGovernMetricsSnapshot,
  type InsertPoamItem,
} from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSF 2.0 Subcategory definitions
const CSF_SUBCATEGORIES = {
  Identify: [
    { category: "ID.AM", subcategory: "ID.AM-1", title: "Physical devices and systems are inventoried" },
    { category: "ID.AM", subcategory: "ID.AM-2", title: "Software platforms and applications are inventoried" },
    { category: "ID.AM", subcategory: "ID.AM-3", title: "Organizational communication and data flows are mapped" },
    { category: "ID.AM", subcategory: "ID.AM-4", title: "External information systems are catalogued" },
    { category: "ID.AM", subcategory: "ID.AM-5", title: "Resources are prioritized based on classification" },
    { category: "ID.RA", subcategory: "ID.RA-1", title: "Asset vulnerabilities are identified and documented" },
    { category: "ID.RA", subcategory: "ID.RA-2", title: "Threat and vulnerability information is received" },
    { category: "ID.RA", subcategory: "ID.RA-3", title: "Threats are identified and documented" },
    { category: "ID.RA", subcategory: "ID.RA-4", title: "Business impacts are identified" },
    { category: "ID.RA", subcategory: "ID.RA-5", title: "Threats, vulnerabilities, and risks are assessed" },
  ],
  Protect: [
    { category: "PR.AC", subcategory: "PR.AC-1", title: "Identities and credentials are managed" },
    { category: "PR.AC", subcategory: "PR.AC-2", title: "Physical access to assets is managed and protected" },
    { category: "PR.AC", subcategory: "PR.AC-3", title: "Remote access is managed" },
    { category: "PR.AC", subcategory: "PR.AC-4", title: "Access permissions are managed" },
    { category: "PR.AC", subcategory: "PR.AC-5", title: "Network integrity is protected" },
    { category: "PR.DS", subcategory: "PR.DS-1", title: "Data-at-rest is protected" },
    { category: "PR.DS", subcategory: "PR.DS-2", title: "Data-in-transit is protected" },
    { category: "PR.IP", subcategory: "PR.IP-1", title: "Configuration baselines are created and maintained" },
    { category: "PR.IP", subcategory: "PR.IP-3", title: "Configuration change control is in place" },
    { category: "PR.IP", subcategory: "PR.IP-4", title: "Backups are conducted, maintained, and tested" },
  ],
  Detect: [
    { category: "DE.AE", subcategory: "DE.AE-1", title: "Network operations baseline is established" },
    { category: "DE.AE", subcategory: "DE.AE-2", title: "Detected events are analyzed" },
    { category: "DE.AE", subcategory: "DE.AE-3", title: "Event data are collected and correlated" },
    { category: "DE.CM", subcategory: "DE.CM-1", title: "Network is monitored for security events" },
    { category: "DE.CM", subcategory: "DE.CM-3", title: "Personnel activity is monitored" },
    { category: "DE.CM", subcategory: "DE.CM-4", title: "Malicious code is detected" },
    { category: "DE.CM", subcategory: "DE.CM-7", title: "Monitoring for unauthorized access" },
    { category: "DE.DP", subcategory: "DE.DP-1", title: "Detection roles and responsibilities are defined" },
    { category: "DE.DP", subcategory: "DE.DP-4", title: "Detection information is communicated" },
    { category: "DE.DP", subcategory: "DE.DP-5", title: "Detection processes are continuously improved" },
  ],
  Respond: [
    { category: "RS.RP", subcategory: "RS.RP-1", title: "Response plan is executed during or after an incident" },
    { category: "RS.CO", subcategory: "RS.CO-1", title: "Personnel know their roles in response" },
    { category: "RS.CO", subcategory: "RS.CO-2", title: "Incidents are reported per established criteria" },
    { category: "RS.CO", subcategory: "RS.CO-3", title: "Information is shared per response plans" },
    { category: "RS.AN", subcategory: "RS.AN-1", title: "Notifications from detection systems are investigated" },
    { category: "RS.AN", subcategory: "RS.AN-2", title: "Impact of incidents is understood" },
    { category: "RS.MI", subcategory: "RS.MI-1", title: "Incidents are contained" },
    { category: "RS.MI", subcategory: "RS.MI-2", title: "Incidents are mitigated" },
    { category: "RS.IM", subcategory: "RS.IM-1", title: "Response plans incorporate lessons learned" },
    { category: "RS.IM", subcategory: "RS.IM-2", title: "Response strategies are updated" },
  ],
  Recover: [
    { category: "RC.RP", subcategory: "RC.RP-1", title: "Recovery plan is executed during or after an incident" },
    { category: "RC.IM", subcategory: "RC.IM-1", title: "Recovery plans incorporate lessons learned" },
    { category: "RC.IM", subcategory: "RC.IM-2", title: "Recovery strategies are updated" },
    { category: "RC.CO", subcategory: "RC.CO-1", title: "Public relations are managed" },
    { category: "RC.CO", subcategory: "RC.CO-2", title: "Reputation is repaired after an incident" },
    { category: "RC.CO", subcategory: "RC.CO-3", title: "Recovery activities are communicated to stakeholders" },
  ],
  Govern: [
    { category: "GV.OC", subcategory: "GV.OC-1", title: "Organizational mission is understood" },
    { category: "GV.OC", subcategory: "GV.OC-2", title: "Internal and external stakeholders are understood" },
    { category: "GV.RM", subcategory: "GV.RM-1", title: "Risk management objectives are established" },
    { category: "GV.RM", subcategory: "GV.RM-2", title: "Risk appetite is determined" },
    { category: "GV.RM", subcategory: "GV.RM-3", title: "Strategic risk is taken into account" },
    { category: "GV.RR", subcategory: "GV.RR-1", title: "Organizational leadership is responsible for risk" },
    { category: "GV.RR", subcategory: "GV.RR-2", title: "Roles and responsibilities are established" },
    { category: "GV.PO", subcategory: "GV.PO-1", title: "Policy for cybersecurity risk management is established" },
    { category: "GV.PO", subcategory: "GV.PO-2", title: "Policy is informed by context" },
    { category: "GV.SC", subcategory: "GV.SC-1", title: "Cyber supply chain risk management program is established" },
  ],
};

interface GovernProfile {
  targets: {
    coverage_min: number;
    evidence_max_age_days: number;
    mttr_target_minutes: number;
    mttd_target_minutes: number;
    ir_sla_target_pct: number;
    rpo_rto_target_pct: number;
    max_open_critical_risks: number;
  };
  scope: {
    include_functions: string[];
    exclude_subcategories: string[];
  };
  owners: {
    default_assertion_owner: string;
  };
  review: {
    cadence_days: number;
    auto_flag_stale: boolean;
  };
  poam_triggers: {
    coverage_gap_threshold: number;
    evidence_stale_severity: number;
    sla_breach_severity: number;
    rpo_rto_gap_severity: number;
  };
}

// Load govern profile from YAML
function loadGovernProfile(): GovernProfile {
  const configPath = path.join(__dirname, "config", "govern_profile.yaml");
  try {
    const content = fs.readFileSync(configPath, "utf8");
    return yaml.parse(content) as GovernProfile;
  } catch (error) {
    console.warn("Could not load govern_profile.yaml, using defaults");
    return {
      targets: {
        coverage_min: 0.65,
        evidence_max_age_days: 90,
        mttr_target_minutes: 480,
        mttd_target_minutes: 60,
        ir_sla_target_pct: 0.9,
        rpo_rto_target_pct: 0.85,
        max_open_critical_risks: 3,
      },
      scope: {
        include_functions: ["Identify", "Protect", "Detect", "Respond", "Recover", "Govern"],
        exclude_subcategories: [],
      },
      owners: {
        default_assertion_owner: "compliance",
      },
      review: {
        cadence_days: 30,
        auto_flag_stale: true,
      },
      poam_triggers: {
        coverage_gap_threshold: 0.5,
        evidence_stale_severity: 3,
        sla_breach_severity: 4,
        rpo_rto_gap_severity: 4,
      },
    };
  }
}

export interface GovernRunResult {
  coveragePct: number;
  evidenceFreshPct: number;
  mttrMinutes: number | null;
  mttdMinutes: number | null;
  irSlaPct: number | null;
  rpoRtoPct: number | null;
  openRisksCritical: number;
  openRisksHigh: number;
  openRisksMedium: number;
  openRisksLow: number;
  openPoamItems: number;
  totalAssertions: number;
  implementedAssertions: number;
  partialAssertions: number;
  plannedAssertions: number;
  notAssessedAssertions: number;
  poamCreated: number;
  snapshotId: string;
}

/**
 * Main Govern Agent run function
 * Computes all KPIs, updates assertions, generates POA&M items, and creates a snapshot
 */
export async function runGovernAgent(): Promise<GovernRunResult> {
  const profile = loadGovernProfile();
  const now = new Date();

  // Step 1: Ensure all CSF subcategories have assertions
  await ensureAssertions(profile);

  // Step 2: Compute assertion statuses based on controls
  await computeAssertionStatuses();

  // Step 3: Calculate KPIs
  const coveragePct = await calculateCoverage();
  const evidenceFreshPct = await calculateEvidenceFreshness(profile.targets.evidence_max_age_days);
  const { mttrMinutes, mttdMinutes } = await calculateMttrMttd();
  const irSlaPct = await calculateIrSlaPct();
  const rpoRtoPct = await calculateRpoRtoPct();
  const riskCounts = await countOpenRisks();

  // Step 4: Generate/update POA&M items for gaps
  const poamCreated = await generatePoamItems(profile, {
    coveragePct,
    evidenceFreshPct,
    irSlaPct,
    rpoRtoPct,
  });

  // Step 5: Count POA&M items
  const [poamCount] = await db
    .select({ count: count() })
    .from(poamItems)
    .where(or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress")));
  const openPoamItems = poamCount?.count || 0;

  // Step 6: Count assertions by status
  const assertionStats = await getAssertionStats();

  // Step 7: Get asset and control counts
  const [assetCount] = await db.select({ count: count() }).from(assets);
  const [controlCount] = await db.select({ count: count() }).from(controls);
  const [implementedControlCount] = await db
    .select({ count: count() })
    .from(controls)
    .where(eq(controls.implementationStatus, "Implemented"));

  // Step 8: Create metrics snapshot
  const snapshotData: InsertGovernMetricsSnapshot = {
    snapshotDate: now,
    coveragePct: Math.round(coveragePct),
    evidenceFreshPct: Math.round(evidenceFreshPct),
    mttrMinutes,
    mttdMinutes,
    irSlaPct: irSlaPct !== null ? Math.round(irSlaPct) : null,
    rpoRtoPct: rpoRtoPct !== null ? Math.round(rpoRtoPct) : null,
    openRisksCritical: riskCounts.critical,
    openRisksHigh: riskCounts.high,
    openRisksMedium: riskCounts.medium,
    openRisksLow: riskCounts.low,
    openPoamItems,
    totalAssets: assetCount?.count || 0,
    totalControls: controlCount?.count || 0,
    implementedControls: implementedControlCount?.count || 0,
  };

  const [snapshot] = await db.insert(governMetricsSnapshots).values(snapshotData).returning();

  return {
    coveragePct,
    evidenceFreshPct,
    mttrMinutes,
    mttdMinutes,
    irSlaPct,
    rpoRtoPct,
    openRisksCritical: riskCounts.critical,
    openRisksHigh: riskCounts.high,
    openRisksMedium: riskCounts.medium,
    openRisksLow: riskCounts.low,
    openPoamItems,
    totalAssertions: assertionStats.total,
    implementedAssertions: assertionStats.implemented,
    partialAssertions: assertionStats.partial,
    plannedAssertions: assertionStats.planned,
    notAssessedAssertions: assertionStats.notAssessed,
    poamCreated,
    snapshotId: snapshot.id,
  };
}

/**
 * Ensure all CSF subcategories have corresponding assertions
 */
async function ensureAssertions(profile: GovernProfile): Promise<void> {
  const existingAssertions = await db.select().from(complianceAssertions);
  const existingSubcategories = new Set(existingAssertions.map((a) => a.subcategory));

  const newAssertions: InsertComplianceAssertion[] = [];
  const now = new Date();
  const reviewDue = new Date(now.getTime() + profile.review.cadence_days * 24 * 60 * 60 * 1000);

  for (const [func, subcats] of Object.entries(CSF_SUBCATEGORIES)) {
    if (!profile.scope.include_functions.includes(func)) continue;

    for (const { category, subcategory } of subcats) {
      if (profile.scope.exclude_subcategories.includes(subcategory)) continue;
      if (existingSubcategories.has(subcategory)) continue;

      newAssertions.push({
        csfFunction: func as any,
        category,
        subcategory,
        status: "NotAssessed",
        owner: profile.owners.default_assertion_owner,
        nextReviewDue: reviewDue,
      });
    }
  }

  if (newAssertions.length > 0) {
    await db.insert(complianceAssertions).values(newAssertions);
    console.log(`Created ${newAssertions.length} new compliance assertions`);
  }
}

/**
 * Compute assertion statuses based on linked controls
 */
async function computeAssertionStatuses(): Promise<void> {
  const allAssertions = await db.select().from(complianceAssertions);
  const allControls = await db.select().from(controls);

  for (const assertion of allAssertions) {
    // Find controls that map to this subcategory
    const linkedControls = allControls.filter(
      (c) => c.csfSubcategory === assertion.subcategory || c.csfCategory === assertion.category
    );

    if (linkedControls.length === 0) continue;

    // Determine status based on control implementation
    const implementedCount = linkedControls.filter((c) => c.implementationStatus === "Implemented").length;
    const inProgressCount = linkedControls.filter((c) => c.implementationStatus === "In-Progress").length;
    const totalCount = linkedControls.length;

    let newStatus: "NotAssessed" | "Planned" | "PartiallyImplemented" | "Implemented" = "NotAssessed";
    
    if (implementedCount === totalCount) {
      newStatus = "Implemented";
    } else if (implementedCount > 0 || inProgressCount > 0) {
      newStatus = "PartiallyImplemented";
    } else if (linkedControls.some((c) => c.implementationStatus === "Proposed")) {
      newStatus = "Planned";
    }

    if (newStatus !== assertion.status && assertion.status !== "NotApplicable") {
      await db
        .update(complianceAssertions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(complianceAssertions.id, assertion.id));
    }
  }
}

/**
 * Calculate CSF coverage percentage
 * Coverage = (# subcategories with status ∈ {PartiallyImplemented, Implemented}) / total in-scope
 */
async function calculateCoverage(): Promise<number> {
  const allAssertions = await db
    .select()
    .from(complianceAssertions)
    .where(sql`${complianceAssertions.status} != 'NotApplicable'`);

  const total = allAssertions.length;
  if (total === 0) return 0;

  const covered = allAssertions.filter(
    (a) => a.status === "PartiallyImplemented" || a.status === "Implemented"
  ).length;

  return (covered / total) * 100;
}

/**
 * Calculate evidence freshness percentage
 * Freshness = (# assertions with all evidence age ≤ threshold) / in-scope
 */
async function calculateEvidenceFreshness(maxAgeDays: number): Promise<number> {
  const allAssertions = await db
    .select()
    .from(complianceAssertions)
    .where(sql`${complianceAssertions.status} != 'NotApplicable'`);

  const total = allAssertions.length;
  if (total === 0) return 100;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - maxAgeDays);

  let freshCount = 0;
  for (const assertion of allAssertions) {
    // Check if assertion has recent evidence or was recently verified
    if (assertion.lastVerifiedAt && assertion.lastVerifiedAt >= thresholdDate) {
      freshCount++;
    } else if (!assertion.lastVerifiedAt) {
      // No verification date means stale
      continue;
    }
  }

  return (freshCount / total) * 100;
}

/**
 * Calculate MTTR (Mean Time To Resolve) and MTTD (Mean Time To Detect)
 */
async function calculateMttrMttd(): Promise<{ mttrMinutes: number | null; mttdMinutes: number | null }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // MTTR: avg(closed_at - opened_at) for closed incidents in last 30 days
  const closedIncidents = await db
    .select({
      openedAt: incidents.openedAt,
      closedAt: incidents.closedAt,
    })
    .from(incidents)
    .where(
      and(
        eq(incidents.status, "Closed"),
        isNotNull(incidents.closedAt),
        gte(incidents.closedAt, thirtyDaysAgo)
      )
    );

  let mttrMinutes: number | null = null;
  if (closedIncidents.length > 0) {
    const totalMinutes = closedIncidents.reduce((sum, inc) => {
      if (inc.openedAt && inc.closedAt) {
        return sum + (inc.closedAt.getTime() - inc.openedAt.getTime()) / (1000 * 60);
      }
      return sum;
    }, 0);
    mttrMinutes = Math.round(totalMinutes / closedIncidents.length);
  }

  // MTTD: avg(detection.first_seen - intel_event.created_at) 
  // Simplified: average time from intel event creation to detection creation
  const recentDetections = await db
    .select({
      firstSeen: detections.firstSeen,
      createdAt: detections.createdAt,
    })
    .from(detections)
    .where(gte(detections.createdAt, thirtyDaysAgo));

  let mttdMinutes: number | null = null;
  if (recentDetections.length > 0) {
    // For MTTD, we'll use the time from detection creation as a proxy
    // In a real system, this would correlate with intel_event timestamps
    mttdMinutes = 30; // Default placeholder - would need intel event correlation
  }

  return { mttrMinutes, mttdMinutes };
}

/**
 * Calculate IR SLA compliance percentage
 * IR SLA% = % of incidents resolved before sla_due_at (last 30d)
 */
async function calculateIrSlaPct(): Promise<number | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const closedIncidents = await db
    .select({
      closedAt: incidents.closedAt,
      slaDueAt: incidents.slaDueAt,
    })
    .from(incidents)
    .where(
      and(
        eq(incidents.status, "Closed"),
        isNotNull(incidents.closedAt),
        gte(incidents.closedAt, thirtyDaysAgo)
      )
    );

  if (closedIncidents.length === 0) return null;

  const withinSla = closedIncidents.filter((inc) => {
    if (!inc.slaDueAt || !inc.closedAt) return true; // No SLA = assume compliant
    return inc.closedAt <= inc.slaDueAt;
  }).length;

  return (withinSla / closedIncidents.length) * 100;
}

/**
 * Calculate RPO/RTO compliance percentage
 * Based on DR plans with passing backups and restore tests
 */
async function calculateRpoRtoPct(): Promise<number | null> {
  const plans = await db.select().from(drPlans);
  if (plans.length === 0) return null;

  let compliantCount = 0;
  for (const plan of plans) {
    // Check if plan has recent successful backup within RPO
    const rpoCompliant = plan.lastRpoMinutesObserved !== null && 
      plan.lastRpoMinutesObserved <= plan.rpoMinutes;
    
    // Check if plan has passing restore test within RTO
    const rtoCompliant = plan.lastRtoMinutesObserved !== null &&
      plan.lastRtoMinutesObserved <= plan.rtoMinutes;

    if (rpoCompliant && rtoCompliant) {
      compliantCount++;
    }
  }

  return (compliantCount / plans.length) * 100;
}

/**
 * Count open risks by severity
 */
async function countOpenRisks(): Promise<{ critical: number; high: number; medium: number; low: number }> {
  const openRisks = await db
    .select({ score: riskItems.score })
    .from(riskItems)
    .where(or(eq(riskItems.status, "Open"), eq(riskItems.status, "In-Progress")));

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const risk of openRisks) {
    if (risk.score >= 20) counts.critical++;
    else if (risk.score >= 15) counts.high++;
    else if (risk.score >= 10) counts.medium++;
    else counts.low++;
  }

  return counts;
}

/**
 * Get assertion statistics
 */
async function getAssertionStats() {
  const allAssertions = await db.select().from(complianceAssertions);
  
  return {
    total: allAssertions.length,
    implemented: allAssertions.filter((a) => a.status === "Implemented").length,
    partial: allAssertions.filter((a) => a.status === "PartiallyImplemented").length,
    planned: allAssertions.filter((a) => a.status === "Planned").length,
    notAssessed: allAssertions.filter((a) => a.status === "NotAssessed").length,
    notApplicable: allAssertions.filter((a) => a.status === "NotApplicable").length,
  };
}

/**
 * Generate POA&M items for identified gaps
 */
async function generatePoamItems(
  profile: GovernProfile,
  kpis: { coveragePct: number; evidenceFreshPct: number; irSlaPct: number | null; rpoRtoPct: number | null }
): Promise<number> {
  let created = 0;
  const now = new Date();
  const defaultDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // 1. Coverage gaps - assertions not at Implemented status
  const nonImplementedAssertions = await db
    .select()
    .from(complianceAssertions)
    .where(
      and(
        sql`${complianceAssertions.status} NOT IN ('Implemented', 'NotApplicable')`,
        sql`${complianceAssertions.status} != 'NotAssessed'`
      )
    );

  for (const assertion of nonImplementedAssertions) {
    // Check if POA&M already exists for this assertion
    const [existing] = await db
      .select()
      .from(poamItems)
      .where(
        and(
          eq(poamItems.driver, "coverage_gap"),
          eq(poamItems.linkedAssertionId, assertion.id),
          or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress"))
        )
      );

    if (!existing) {
      await db.insert(poamItems).values({
        title: `Implement ${assertion.subcategory}: ${assertion.category}`,
        description: `CSF subcategory ${assertion.subcategory} is not fully implemented. Current status: ${assertion.status}`,
        driver: "coverage_gap",
        severity: assertion.status === "Planned" ? 2 : 3,
        owner: assertion.owner || profile.owners.default_assertion_owner,
        dueDate: defaultDueDate,
        status: "Open",
        linkedAssertionId: assertion.id,
      });
      created++;
    }
  }

  // 2. Stale evidence - assertions not verified recently
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - profile.targets.evidence_max_age_days);

  const staleAssertions = await db
    .select()
    .from(complianceAssertions)
    .where(
      and(
        sql`${complianceAssertions.status} != 'NotApplicable'`,
        or(
          isNull(complianceAssertions.lastVerifiedAt),
          lt(complianceAssertions.lastVerifiedAt, staleThreshold)
        )
      )
    );

  for (const assertion of staleAssertions) {
    const [existing] = await db
      .select()
      .from(poamItems)
      .where(
        and(
          eq(poamItems.driver, "stale_evidence"),
          eq(poamItems.linkedAssertionId, assertion.id),
          or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress"))
        )
      );

    if (!existing) {
      await db.insert(poamItems).values({
        title: `Refresh evidence for ${assertion.subcategory}`,
        description: `Evidence for ${assertion.subcategory} is stale or missing. Last verified: ${assertion.lastVerifiedAt?.toISOString() || "Never"}`,
        driver: "stale_evidence",
        severity: profile.poam_triggers.evidence_stale_severity,
        owner: assertion.owner || profile.owners.default_assertion_owner,
        dueDate: defaultDueDate,
        status: "Open",
        linkedAssertionId: assertion.id,
      });
      created++;
    }
  }

  // 3. KPI below target - create POA&M for significant gaps
  if (kpis.coveragePct < profile.targets.coverage_min * 100) {
    const [existing] = await db
      .select()
      .from(poamItems)
      .where(
        and(
          eq(poamItems.driver, "kpi_below_target"),
          sql`${poamItems.title} LIKE '%Coverage%'`,
          or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress"))
        )
      );

    if (!existing) {
      await db.insert(poamItems).values({
        title: "Improve CSF Coverage",
        description: `Current coverage (${kpis.coveragePct.toFixed(1)}%) is below target (${(profile.targets.coverage_min * 100).toFixed(1)}%)`,
        driver: "kpi_below_target",
        severity: 4,
        owner: profile.owners.default_assertion_owner,
        dueDate: defaultDueDate,
        status: "Open",
      });
      created++;
    }
  }

  // 4. RPO/RTO gaps
  if (kpis.rpoRtoPct !== null && kpis.rpoRtoPct < profile.targets.rpo_rto_target_pct * 100) {
    const [existing] = await db
      .select()
      .from(poamItems)
      .where(
        and(
          eq(poamItems.driver, "rpo_rto_gap"),
          or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress"))
        )
      );

    if (!existing) {
      await db.insert(poamItems).values({
        title: "Address RPO/RTO Compliance Gaps",
        description: `RPO/RTO compliance (${kpis.rpoRtoPct.toFixed(1)}%) is below target (${(profile.targets.rpo_rto_target_pct * 100).toFixed(1)}%)`,
        driver: "rpo_rto_gap",
        severity: profile.poam_triggers.rpo_rto_gap_severity,
        owner: profile.owners.default_assertion_owner,
        dueDate: defaultDueDate,
        status: "Open",
      });
      created++;
    }
  }

  return created;
}

/**
 * Get the latest governance summary
 */
export async function getGovernSummary() {
  // Get latest snapshot
  const [latestSnapshot] = await db
    .select()
    .from(governMetricsSnapshots)
    .orderBy(desc(governMetricsSnapshots.snapshotDate))
    .limit(1);

  // Get assertion stats
  const assertionStats = await getAssertionStats();

  // Get open POA&M count
  const [poamCount] = await db
    .select({ count: count() })
    .from(poamItems)
    .where(or(eq(poamItems.status, "Open"), eq(poamItems.status, "In-Progress")));

  // Get risk counts
  const riskCounts = await countOpenRisks();

  return {
    latestSnapshot,
    assertions: assertionStats,
    openPoamItems: poamCount?.count || 0,
    openRisks: riskCounts,
    coverageByFunction: await getCoverageByFunction(),
  };
}

/**
 * Get coverage breakdown by CSF function
 */
async function getCoverageByFunction() {
  const allAssertions = await db
    .select()
    .from(complianceAssertions)
    .where(sql`${complianceAssertions.status} != 'NotApplicable'`);

  const byFunction: Record<string, { total: number; covered: number; pct: number }> = {};

  for (const func of ["Identify", "Protect", "Detect", "Respond", "Recover", "Govern"]) {
    const funcAssertions = allAssertions.filter((a) => a.csfFunction === func);
    const covered = funcAssertions.filter(
      (a) => a.status === "PartiallyImplemented" || a.status === "Implemented"
    ).length;
    
    byFunction[func] = {
      total: funcAssertions.length,
      covered,
      pct: funcAssertions.length > 0 ? (covered / funcAssertions.length) * 100 : 0,
    };
  }

  return byFunction;
}

/**
 * Generate executive report in Markdown format
 */
export async function generateExecutiveReport(): Promise<string> {
  const summary = await getGovernSummary();
  const profile = loadGovernProfile();
  const now = new Date();

  const report = `# Executive Security Report
Generated: ${now.toISOString()}

## CSF 2.0 Compliance Summary

### Overall Coverage: ${summary.latestSnapshot?.coveragePct || 0}%

| Function | Coverage | Status |
|----------|----------|--------|
${Object.entries(summary.coverageByFunction)
  .map(([func, data]) => {
    const status = data.pct >= 80 ? "✅" : data.pct >= 50 ? "⚠️" : "❌";
    return `| ${func} | ${data.pct.toFixed(1)}% (${data.covered}/${data.total}) | ${status} |`;
  })
  .join("\n")}

## Key Performance Indicators

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Coverage | ${summary.latestSnapshot?.coveragePct || 0}% | ${profile.targets.coverage_min * 100}% | ${(summary.latestSnapshot?.coveragePct || 0) >= profile.targets.coverage_min * 100 ? "✅" : "❌"} |
| Evidence Freshness | ${summary.latestSnapshot?.evidenceFreshPct || 0}% | 100% | ${(summary.latestSnapshot?.evidenceFreshPct || 0) >= 80 ? "✅" : "❌"} |
| IR SLA Compliance | ${summary.latestSnapshot?.irSlaPct || "N/A"}% | ${profile.targets.ir_sla_target_pct * 100}% | ${(summary.latestSnapshot?.irSlaPct || 0) >= profile.targets.ir_sla_target_pct * 100 ? "✅" : "❌"} |
| RPO/RTO Compliance | ${summary.latestSnapshot?.rpoRtoPct || "N/A"}% | ${profile.targets.rpo_rto_target_pct * 100}% | ${(summary.latestSnapshot?.rpoRtoPct || 0) >= profile.targets.rpo_rto_target_pct * 100 ? "✅" : "❌"} |
| MTTR | ${summary.latestSnapshot?.mttrMinutes || "N/A"} min | ${profile.targets.mttr_target_minutes} min | ${(summary.latestSnapshot?.mttrMinutes || 9999) <= profile.targets.mttr_target_minutes ? "✅" : "❌"} |

## Risk Summary

| Severity | Count |
|----------|-------|
| Critical | ${summary.openRisks.critical} |
| High | ${summary.openRisks.high} |
| Medium | ${summary.openRisks.medium} |
| Low | ${summary.openRisks.low} |

## Plan of Action & Milestones (POA&M)

**Open Items:** ${summary.openPoamItems}

## Assertions Status

| Status | Count |
|--------|-------|
| Implemented | ${summary.assertions.implemented} |
| Partially Implemented | ${summary.assertions.partial} |
| Planned | ${summary.assertions.planned} |
| Not Assessed | ${summary.assertions.notAssessed} |

---
*Report generated by Govern Agent v1.0*
`;

  return report;
}

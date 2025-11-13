import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "./db";
import { 
  detections, 
  incidents, 
  incidentTasks, 
  detectionIncidentLinks,
  incidentTimeline,
  assets,
  type InsertIncident,
  type InsertIncidentTask,
  type InsertDetectionIncidentLink
} from "@shared/schema";
import OpenAI from "openai";
import { alertManager } from "./alert-system";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface RunCriteria {
  detectionIds?: string[];
  severityThreshold?: number;
  confidenceThreshold?: number;
  timeWindowHours?: number;
}

interface DedupeResult {
  existingIncidentId: string | null;
  reason: string | null;
}

interface AutomationResult {
  created: Array<{ incident: any; tasks: any[] }>;
  updatedLinks: string[];
  skipped: Array<{ detectionId: string; reason: string }>;
}

export class RespondAutomationService {
  private readonly DEDUPE_WINDOW_HOURS = 24;
  private readonly DEFAULT_SEVERITY_THRESHOLD = 4;
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 70;

  async run(criteria: RunCriteria = {}): Promise<AutomationResult> {
    const {
      detectionIds,
      severityThreshold = this.DEFAULT_SEVERITY_THRESHOLD,
      confidenceThreshold = this.DEFAULT_CONFIDENCE_THRESHOLD,
      timeWindowHours = 24,
    } = criteria;

    const eligibleDetections = await this.fetchEligibleDetections(
      detectionIds,
      severityThreshold,
      confidenceThreshold,
      timeWindowHours
    );

    console.log(`[Respond] Found ${eligibleDetections.length} eligible detections`);

    const results: AutomationResult = {
      created: [],
      updatedLinks: [],
      skipped: [],
    };

    const processResults = await Promise.allSettled(
      eligibleDetections.map((detection) => this.processDetection(detection))
    );

    processResults.forEach((result, idx) => {
      const detection = eligibleDetections[idx];
      if (result.status === "fulfilled") {
        if (result.value.created) {
          results.created.push(result.value.created);
        } else if (result.value.linkedTo) {
          results.updatedLinks.push(result.value.linkedTo);
        } else if (result.value.skipped) {
          results.skipped.push({
            detectionId: detection.id,
            reason: result.value.skipped,
          });
        }
      } else {
        console.error(`[Respond] Failed to process detection ${detection.id}:`, result.reason);
        results.skipped.push({
          detectionId: detection.id,
          reason: `Error: ${result.reason}`,
        });
      }
    });

    return results;
  }

  private async fetchEligibleDetections(
    detectionIds: string[] | undefined,
    severityThreshold: number,
    confidenceThreshold: number,
    timeWindowHours: number
  ) {
    const timeWindowCutoff = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    let query = db.select().from(detections);

    if (detectionIds && detectionIds.length > 0) {
      query = query.where(sql`${detections.id} = ANY(${detectionIds})`) as any;
    } else {
      query = query.where(
        and(
          gte(detections.lastSeen, timeWindowCutoff),
          sql`(
            ${detections.severity} >= ${severityThreshold}
            OR (${detections.severity} >= ${severityThreshold - 1} AND ${detections.confidence} >= ${confidenceThreshold})
          )`
        )
      ) as any;
    }

    return await query;
  }

  private async processDetection(detection: any): Promise<{
    created?: { incident: any; tasks: any[] };
    linkedTo?: string;
    skipped?: string;
  }> {
    const dedupeResult = await this.checkDedupe(detection);

    if (dedupeResult.existingIncidentId) {
      if (dedupeResult.reason === "Detection already linked to incident") {
        return { skipped: dedupeResult.reason };
      }
      
      await this.linkDetectionToIncident(detection.id, dedupeResult.existingIncidentId);
      return { linkedTo: dedupeResult.existingIncidentId };
    }

    const incident = await this.createIncident(detection);
    const tasks = await this.generateAndPersistPlaybook(incident, detection);
    
    await this.linkDetectionToIncident(detection.id, incident.id);
    
    await this.sendIncidentAlert(incident, detection);

    return {
      created: { incident, tasks },
    };
  }

  private async checkDedupe(detection: any): Promise<DedupeResult> {
    const dedupeWindow = new Date(Date.now() - this.DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
    
    const existingLinks = await db
      .select({
        incidentId: detectionIncidentLinks.incidentId,
        linkedAt: detectionIncidentLinks.linkedAt,
      })
      .from(detectionIncidentLinks)
      .where(eq(detectionIncidentLinks.detectionId, detection.id))
      .limit(1);

    if (existingLinks.length > 0) {
      return {
        existingIncidentId: existingLinks[0].incidentId,
        reason: `Detection already linked to incident`,
      };
    }

    if (!detection.assetId) {
      return { existingIncidentId: null, reason: null };
    }

    const existingIncidents = await db
      .select({
        incident: incidents,
        detection: detections,
      })
      .from(incidents)
      .innerJoin(
        detectionIncidentLinks,
        eq(detectionIncidentLinks.incidentId, incidents.id)
      )
      .innerJoin(
        detections,
        eq(detections.id, detectionIncidentLinks.detectionId)
      )
      .where(
        and(
          eq(incidents.primaryAssetId, detection.assetId),
          sql`${incidents.openedAt} >= ${dedupeWindow}`,
          sql`${incidents.status} != 'Closed'`,
          sql`${detections.indicator} = ${detection.indicator}`
        )
      )
      .limit(1);

    if (existingIncidents.length > 0) {
      return {
        existingIncidentId: existingIncidents[0].incident.id,
        reason: `Open incident exists for same asset+indicator within 24h window`,
      };
    }

    return { existingIncidentId: null, reason: null };
  }

  private computeIndicatorHash(detection: any): string {
    const parts = [detection.indicator];
    if (detection.ttp && detection.ttp.length > 0) {
      parts.push(...detection.ttp.sort());
    }
    return parts.join("|");
  }

  private async createIncident(detection: any): Promise<any> {
    const incidentNumber = await this.generateIncidentNumber();
    const slaDueAt = this.calculateSLA(detection.severity);
    const now = new Date();
    
    let asset = null;
    if (detection.assetId) {
      [asset] = await db.select().from(assets).where(eq(assets.id, detection.assetId));
    }

    const indicatorHash = this.computeIndicatorHash(detection);

    const insertData: InsertIncident = {
      title: `${detection.source || "Security Alert"} - ${detection.indicator}`,
      severity: this.mapSeverityToIncidentLevel(detection.severity),
      status: "Open",
      owner: "SOC Analyst",
      slaDueAt,
      slaBreached: false,
      primaryAssetId: detection.assetId || null,
      detectionRefs: [detection.id],
      riskItemRefs: [],
      summary: `Auto-created from detection. Indicator: ${indicatorHash}. Confidence: ${detection.confidence}%. Source: ${detection.source}.`,
      rootCause: null,
      lessonsLearned: null,
      tags: detection.ttp || [],
    };

    const [incident] = await db.insert(incidents).values(insertData).returning();
    
    const [updatedIncident] = await db
      .update(incidents)
      .set({ 
        incidentNumber,
        openedAt: now,
        updatedAt: now,
      })
      .where(eq(incidents.id, incident.id))
      .returning();
    
    await db.insert(incidentTimeline).values({
      incidentId: updatedIncident.id,
      timestamp: now,
      actor: "System",
      eventType: "opened",
      detail: {
        source: "auto-detection",
        detectionId: detection.id,
        severity: detection.severity,
        confidence: detection.confidence,
      },
    });
    
    console.log(`[Respond] Created incident ${updatedIncident.incidentNumber} from detection ${detection.id}`);
    
    return updatedIncident;
  }

  private async generateIncidentNumber(): Promise<string> {
    const count = await db.select({ count: sql<number>`count(*)` }).from(incidents);
    const nextNum = (count[0]?.count || 0) + 1;
    return `INC-${nextNum.toString().padStart(4, "0")}`;
  }

  private calculateSLA(severity: number): Date {
    const slaHours = {
      1: 72,
      2: 24,
      3: 8,
      4: 4,
      5: 4,
    }[severity] || 24;

    return new Date(Date.now() + slaHours * 60 * 60 * 1000);
  }

  private mapSeverityToIncidentLevel(severity: number): "P1" | "P2" | "P3" | "P4" {
    if (severity >= 5) return "P1";
    if (severity >= 4) return "P2";
    if (severity >= 3) return "P3";
    return "P4";
  }

  private async generateAndPersistPlaybook(incident: any, detection: any): Promise<any[]> {
    const affectedAssets = incident.primaryAssetId ? [incident.primaryAssetId] : [];
    
    const prompt = `You are an incident response expert. Generate an IR playbook for:

Incident Type: ${detection.source || "Security Alert"}
Severity: ${incident.severity}
Affected Assets: ${affectedAssets.join(", ") || "Unknown"}
Indicator: ${detection.indicator}
TTPs: ${detection.ttp?.join(", ") || "None"}

Generate a phased incident response playbook with tasks for each phase:
- Triage
- Containment
- Eradication
- Recovery
- Close

Each task should have:
1. Phase
2. Title
3. Assignee role (e.g., "SOC Analyst", "CISO")
4. Order (sequence number)

Respond in JSON format:
{
  "tasks": [
    {
      "phase": "<Triage|Containment|Eradication|Recovery|Close>",
      "title": "<task title>",
      "assignee": "<role>",
      "order": <number>
    }
  ],
  "estimatedDuration": "<duration estimate>"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      const tasks = result.tasks || [];

      const insertedTasks = [];
      for (const task of tasks) {
        const taskData: InsertIncidentTask = {
          incidentId: incident.id,
          phase: task.phase,
          title: task.title,
          assignee: task.assignee,
          dueAt: null,
          status: "Open",
          notes: null,
          order: task.order,
        };

        const [inserted] = await db.insert(incidentTasks).values(taskData).returning();
        insertedTasks.push(inserted);
      }

      console.log(`[Respond] Generated ${insertedTasks.length} tasks for incident ${incident.incidentNumber}`);
      return insertedTasks;
    } catch (error) {
      console.error("[Respond] Failed to generate playbook:", error);
      return [];
    }
  }

  private async linkDetectionToIncident(detectionId: string, incidentId: string): Promise<void> {
    const linkData: InsertDetectionIncidentLink = {
      detectionId,
      incidentId,
      linkageType: "auto",
    };

    await db.insert(detectionIncidentLinks).values(linkData);
    console.log(`[Respond] Linked detection ${detectionId} to incident ${incidentId}`);
  }

  private async sendIncidentAlert(incident: any, detection: any): Promise<void> {
    const description = `Incident: ${incident.incidentNumber}
Severity: ${incident.severity}
Title: ${incident.title}
SLA Due: ${incident.slaDueAt?.toISOString()}

Triggered by detection: ${detection.indicator}
Confidence: ${detection.confidence}%

Action Required: Review and triage immediately.`;

    try {
      await alertManager.sendAlert({
        type: "incident",
        severity: incident.severity,
        title: `Incident ${incident.incidentNumber} Auto-Created`,
        description,
        affectedAssets: incident.primaryAssetId ? [incident.primaryAssetId] : [],
        metadata: {
          incidentId: incident.id,
          incidentNumber: incident.incidentNumber,
          detectionId: detection.id,
          assetId: detection.assetId,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("[Respond] Failed to send alert:", error);
    }
  }
}

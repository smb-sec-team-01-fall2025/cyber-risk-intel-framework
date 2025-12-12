import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { 
  assets, intelEvents, detections, incidents, controls, riskItems, 
  assetIntelLinks, incidentTasks, incidentTimeline, incidentEvidence, sops, policyAssignments,
  drPlans, backupSets, restoreTests, resilienceFindings,
  insertAssetSchema, insertIntelEventSchema, insertDetectionSchema,
  insertIncidentSchema, insertControlSchema, insertRiskItemSchema,
  insertBackupSetSchema, insertRestoreTestSchema, insertResilienceFindingSchema,
  type Asset, type IntelEvent, type Detection, type Incident,
  type Control, type RiskItem, type BackupSet, type RestoreTest
} from "@shared/schema";
import { eq, desc, asc, sql, and, gte, lte, count } from "drizzle-orm";
import OpenAI from "openai";
import { osintOrchestrator } from "./osint-adapters";
import { alertManager } from "./alert-system";
import { scheduler } from "./scheduler";
import { resilienceAgent } from "./resilience-agent";
import { riskScorer } from "./risk-scorer";
import { runGovernAgent, getGovernSummary, generateExecutiveReport } from "./govern-agent";
import { complianceAssertions, poamItems, governMetricsSnapshots, evidenceCatalog,
  insertComplianceAssertionSchema, insertPoamItemSchema, insertEvidenceCatalogSchema
} from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================================================
  // ASSETS API (Identify Function)
  // ============================================================================
  
  app.get("/api/assets", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const type = req.query.type as string;
      const search = req.query.search as string;
      
      // Build WHERE conditions for filtering
      const conditions = [];
      if (type && type !== "all") conditions.push(eq(assets.type, type as any));
      if (search) {
        conditions.push(sql`${assets.name} ILIKE ${`%${search}%`} OR ${assets.hostname} ILIKE ${`%${search}%`}`);
      }
      
      // Fetch assets with risk score from the assets table
      let query = db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          ip: assets.ip,
          hostname: assets.hostname,
          owner: assets.owner,
          businessUnit: assets.businessUnit,
          criticality: assets.criticality,
          dataSensitivity: assets.dataSensitivity,
          description: assets.description,
          tags: assets.tags,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
          riskScore: assets.riskScore,
        })
        .from(assets);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const allAssets = await query
        .orderBy(desc(assets.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      
      // Get total count for pagination
      let countQuery = db.select({ count: count() }).from(assets);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      res.json({ assets: allAssets, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });
  
  app.get("/api/assets/top-risky", async (req: Request, res: Response) => {
    try {
      const topAssets = await db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          criticality: assets.criticality,
          riskScore: assets.riskScore,
        })
        .from(assets)
        .orderBy(desc(assets.riskScore))
        .limit(5);
      
      res.json(topAssets);
    } catch (error) {
      console.error("Error fetching top risky assets:", error);
      res.status(500).json({ error: "Failed to fetch top risky assets" });
    }
  });
  
  app.post("/api/assets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAssetSchema.parse(req.body);
      const [newAsset] = await db.insert(assets).values(validatedData).returning();
      
      res.status(201).json(newAsset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create asset" });
    }
  });
  
  app.post("/api/assets/import", async (req: Request, res: Response) => {
    try {
      const { assets: assetsData } = req.body;
      
      if (!Array.isArray(assetsData) || assetsData.length === 0) {
        return res.status(400).json({ error: "Invalid import data. Expected an array of assets." });
      }
      
      const validatedAssets = assetsData.map((asset, index) => {
        try {
          return insertAssetSchema.parse(asset);
        } catch (error) {
          throw new Error(`Validation error at row ${index + 1}: ${error instanceof Error ? error.message : "Invalid data"}`);
        }
      });
      
      const insertedAssets = await db.insert(assets).values(validatedAssets).returning();
      
      res.status(201).json({ 
        success: true, 
        imported: insertedAssets.length,
        assets: insertedAssets 
      });
    } catch (error) {
      console.error("Error importing assets:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import assets" });
    }
  });
  
  app.get("/api/assets/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Fetch asset with risk score from the assets table
      const [assetWithRisk] = await db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          ip: assets.ip,
          hostname: assets.hostname,
          owner: assets.owner,
          businessUnit: assets.businessUnit,
          criticality: assets.criticality,
          dataSensitivity: assets.dataSensitivity,
          description: assets.description,
          tags: assets.tags,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
          riskScore: assets.riskScore,
        })
        .from(assets)
        .where(eq(assets.id, id));
      
      if (!assetWithRisk) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      const linkedIntel = await db
        .select({
          id: intelEvents.id,
          source: intelEvents.source,
          indicator: intelEvents.indicator,
          severity: intelEvents.severity,
          createdAt: intelEvents.createdAt,
        })
        .from(assetIntelLinks)
        .innerJoin(intelEvents, eq(assetIntelLinks.intelId, intelEvents.id))
        .where(eq(assetIntelLinks.assetId, id))
        .orderBy(desc(intelEvents.createdAt))
        .limit(10);
      
      const assignedControls = await db
        .select({
          id: controls.id,
          controlId: controls.controlId,
          title: controls.title,
          implementationStatus: controls.implementationStatus,
        })
        .from(policyAssignments)
        .innerJoin(controls, eq(policyAssignments.controlId, controls.id))
        .where(eq(policyAssignments.assetId, id));
      
      res.json({ asset: assetWithRisk, linkedIntel, assignedControls });
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });
  
  app.post("/api/assets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAssetSchema.parse(req.body);
      const [newAsset] = await db.insert(assets).values(validatedData).returning();
      res.status(201).json(newAsset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(400).json({ error: "Failed to create asset" });
    }
  });
  
  app.patch("/api/assets/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [updated] = await db
        .update(assets)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(assets.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(400).json({ error: "Failed to update asset" });
    }
  });
  
  app.delete("/api/assets/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(assets).where(eq(assets.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });
  
  app.get("/api/assets/:id/recover", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Find DR plan for this asset
      const [drPlan] = await db
        .select()
        .from(drPlans)
        .where(eq(drPlans.assetId, id))
        .limit(1);
      
      // If no DR plan, return empty response
      if (!drPlan) {
        return res.json({
          drPlan: null,
          recentBackups: [],
          recentRestoreTests: [],
          openFindings: []
        });
      }
      
      // Fetch recent backups (last 10)
      const recentBackups = await db
        .select()
        .from(backupSets)
        .where(eq(backupSets.drPlanId, drPlan.id))
        .orderBy(desc(backupSets.backupWindowEnd))
        .limit(10);
      
      // Fetch recent restore tests (last 10)
      const recentRestoreTests = await db
        .select()
        .from(restoreTests)
        .where(eq(restoreTests.drPlanId, drPlan.id))
        .orderBy(desc(restoreTests.testDate))
        .limit(10);
      
      // Fetch open resilience findings
      const openFindings = await db
        .select()
        .from(resilienceFindings)
        .where(and(
          eq(resilienceFindings.drPlanId, drPlan.id),
          eq(resilienceFindings.status, 'open')
        ))
        .orderBy(desc(resilienceFindings.severity));
      
      // Express automatically serializes Date objects to ISO strings via JSON.stringify()
      res.json({
        drPlan,
        recentBackups,
        recentRestoreTests,
        openFindings
      });
    } catch (error) {
      console.error("Error fetching asset recover data:", error);
      res.status(500).json({ error: "Failed to fetch recover data" });
    }
  });
  
  // ============================================================================
  // INTEL EVENTS API (Detect Function)
  // ============================================================================
  
  app.get("/api/intel-events", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const source = req.query.source as string;
      const search = req.query.search as string;
      
      let query = db.select().from(intelEvents);
      const conditions = [];
      
      if (source && source !== "all") {
        conditions.push(eq(intelEvents.source, source as any));
      }
      if (search) {
        conditions.push(sql`${intelEvents.indicator} ILIKE ${`%${search}%`}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const events = await query.orderBy(desc(intelEvents.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
      
      const eventsWithLinks = await Promise.all(
        events.map(async (event) => {
          const [linkCount] = await db
            .select({ count: count() })
            .from(assetIntelLinks)
            .where(eq(assetIntelLinks.intelId, event.id));
          
          return {
            ...event,
            linkedAssets: linkCount?.count || 0,
          };
        })
      );
      
      let countQuery = db.select({ count: count() }).from(intelEvents);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      res.json({ events: eventsWithLinks, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching intel events:", error);
      res.status(500).json({ error: "Failed to fetch intel events" });
    }
  });
  
  app.post("/api/intel-events", async (req: Request, res: Response) => {
    try {
      const validatedData = insertIntelEventSchema.parse(req.body);
      const [newEvent] = await db.insert(intelEvents).values(validatedData).returning();
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating intel event:", error);
      res.status(400).json({ error: "Failed to create intel event" });
    }
  });
  
  // ============================================================================
  // DETECTIONS API (Detect Function)
  // ============================================================================
  
  app.get("/api/detections", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const source = req.query.source as string;
      const severity = req.query.severity as string;
      const search = req.query.search as string;
      
      let query = db.select().from(detections);
      const conditions = [];
      
      if (source && source !== "all") conditions.push(eq(detections.source, source as any));
      if (severity && severity !== "all") conditions.push(eq(detections.severity, parseInt(severity)));
      if (search) {
        conditions.push(sql`${detections.indicator} ILIKE ${`%${search}%`}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const allDetections = await query.orderBy(desc(detections.lastSeen)).limit(pageSize).offset((page - 1) * pageSize);
      
      let countQuery = db.select({ count: count() }).from(detections);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      res.json({ detections: allDetections, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching detections:", error);
      res.status(500).json({ error: "Failed to fetch detections" });
    }
  });
  
  app.get("/api/detections/recent", async (req: Request, res: Response) => {
    try {
      const recentDetections = await db
        .select()
        .from(detections)
        .orderBy(desc(detections.lastSeen))
        .limit(5);
      
      res.json(recentDetections);
    } catch (error) {
      console.error("Error fetching recent detections:", error);
      res.status(500).json({ error: "Failed to fetch recent detections" });
    }
  });
  
  app.post("/api/detections", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDetectionSchema.parse(req.body);
      const [newDetection] = await db.insert(detections).values({
        ...validatedData,
        firstSeen: new Date(),
        lastSeen: new Date(),
        hitCount: 1,
      }).returning();
      res.status(201).json(newDetection);
    } catch (error) {
      console.error("Error creating detection:", error);
      res.status(400).json({ error: "Failed to create detection" });
    }
  });
  
  app.get("/api/detections/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [detection] = await db.select().from(detections).where(eq(detections.id, id));
      
      if (!detection) {
        return res.status(404).json({ error: "Detection not found" });
      }
      
      let linkedAsset = null;
      if (detection.assetId) {
        [linkedAsset] = await db.select().from(assets).where(eq(assets.id, detection.assetId));
      }
      
      res.json({ detection, linkedAsset });
    } catch (error) {
      console.error("Error fetching detection:", error);
      res.status(500).json({ error: "Failed to fetch detection" });
    }
  });
  
  // ============================================================================
  // INCIDENTS API (Respond Function)
  // ============================================================================
  
  app.get("/api/incidents", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const status = req.query.status as string;
      const severity = req.query.severity as string;
      const search = req.query.search as string;
      
      let query = db.select().from(incidents);
      const conditions = [];
      
      if (status && status !== "all") conditions.push(eq(incidents.status, status as any));
      if (severity && severity !== "all") conditions.push(eq(incidents.severity, severity as any));
      if (search) {
        conditions.push(sql`${incidents.title} ILIKE ${`%${search}%`} OR ${incidents.incidentNumber} ILIKE ${`%${search}%`}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const allIncidents = await query.orderBy(desc(incidents.openedAt)).limit(pageSize).offset((page - 1) * pageSize);
      
      let countQuery = db.select({ count: count() }).from(incidents);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      res.json({ incidents: allIncidents, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });
  
  app.get("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const tasks = await db
        .select()
        .from(incidentTasks)
        .where(eq(incidentTasks.incidentId, id))
        .orderBy(incidentTasks.order);
      
      let primaryAsset = null;
      if (incident.primaryAssetId) {
        [primaryAsset] = await db.select().from(assets).where(eq(assets.id, incident.primaryAssetId));
      }
      
      res.json({ incident, tasks, primaryAsset });
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });
  
  app.post("/api/incidents", async (req: Request, res: Response) => {
    try {
      const validatedData = insertIncidentSchema.parse(req.body);
      
      const [lastIncident] = await db
        .select({ incidentNumber: incidents.incidentNumber })
        .from(incidents)
        .orderBy(desc(incidents.openedAt))
        .limit(1);
      
      const nextNumber = lastIncident?.incidentNumber
        ? parseInt(lastIncident.incidentNumber.split("-")[1]) + 1
        : 1;
      const incidentNumber = `INC-${nextNumber.toString().padStart(3, "0")}`;
      
      const slaDueAt = new Date();
      const severityHours = { P1: 4, P2: 24, P3: 72, P4: 168 };
      slaDueAt.setHours(slaDueAt.getHours() + (severityHours[validatedData.severity as keyof typeof severityHours] || 24));
      
      const [newIncident] = await db.insert(incidents).values({
        ...validatedData,
        incidentNumber,
        slaDueAt,
      }).returning();
      
      // Generate AI tasks for the incident
      try {
        const prompt = `You are an incident response expert. Generate an IR playbook for:

Incident Type: ${validatedData.title}
Severity: ${validatedData.severity}
Description: ${validatedData.description || "Security incident requiring response"}

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
  ]
}`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
        
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const generatedTasks = result.tasks || [];
        
        for (const task of generatedTasks) {
          await db.insert(incidentTasks).values({
            incidentId: newIncident.id,
            phase: task.phase,
            title: task.title,
            assignee: task.assignee,
            status: "Open",
            order: task.order,
          });
        }
        
        console.log(`[Incidents] Generated ${generatedTasks.length} AI tasks for ${incidentNumber}`);
      } catch (aiError) {
        console.error("[Incidents] Failed to generate AI tasks:", aiError);
        // Continue - incident created successfully, tasks are optional
      }
      
      res.status(201).json(newIncident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(400).json({ error: "Failed to create incident" });
    }
  });
  
  // Delete closed incident
  app.delete("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      if (incident.status !== "Closed") {
        return res.status(400).json({ error: "Only closed incidents can be deleted" });
      }
      
      // Delete related records first
      await db.delete(incidentTasks).where(eq(incidentTasks.incidentId, id));
      await db.delete(incidentTimeline).where(eq(incidentTimeline.incidentId, id));
      await db.delete(incidentEvidence).where(eq(incidentEvidence.incidentId, id));
      
      // Delete the incident
      await db.delete(incidents).where(eq(incidents.id, id));
      
      console.log(`[Incidents] Deleted closed incident ${incident.incidentNumber}`);
      res.json({ success: true, message: `Incident ${incident.incidentNumber} deleted` });
    } catch (error) {
      console.error("Error deleting incident:", error);
      res.status(500).json({ error: "Failed to delete incident" });
    }
  });
  
  app.patch("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [existingIncident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!existingIncident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const updateData = { ...req.body, updatedAt: new Date() };
      
      if (req.body.status && req.body.status !== existingIncident.status) {
        const statusTransitions: Record<string, string[]> = {
          "Open": ["Triage", "Closed"],
          "Triage": ["Containment", "Closed"],
          "Containment": ["Eradication", "Closed"],
          "Eradication": ["Recovery", "Closed"],
          "Recovery": ["Closed"],
          "Closed": [],
        };
        
        const currentStatus = existingIncident.status || "Open";
        const newStatus = req.body.status;
        const allowedTransitions = statusTransitions[currentStatus] || [];
        
        if (!allowedTransitions.includes(newStatus)) {
          return res.status(400).json({
            error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
          });
        }
        
        if (newStatus === "Closed") {
          updateData.closedAt = new Date();
        }
        
        await db.insert(incidentTimeline).values({
          incidentId: id,
          timestamp: new Date(),
          actor: req.body.updatedBy || "System",
          eventType: "status_change",
          detail: {
            fromStatus: currentStatus,
            toStatus: newStatus,
            reason: req.body.statusChangeReason || null,
          },
        });
      }
      
      const [updated] = await db
        .update(incidents)
        .set(updateData)
        .where(eq(incidents.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(400).json({ error: "Failed to update incident" });
    }
  });

  app.post("/api/incidents/:id/tasks", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const taskData = {
        ...req.body,
        incidentId: id,
      };
      
      const [created] = await db.insert(incidentTasks).values(taskData).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/incidents/:id/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const { id, taskId } = req.params;
      
      const [updated] = await db
        .update(incidentTasks)
        .set(req.body)
        .where(and(
          eq(incidentTasks.id, taskId),
          eq(incidentTasks.incidentId, id)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/incidents/:id/timeline", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const timeline = await db
        .select()
        .from(incidentTimeline)
        .where(eq(incidentTimeline.incidentId, id))
        .orderBy(desc(incidentTimeline.timestamp));
      
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });

  app.post("/api/incidents/:id/timeline", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { eventType, description, actor } = req.body;
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const [entry] = await db.insert(incidentTimeline).values({
        incidentId: id,
        timestamp: new Date(),
        actor: actor || "analyst",
        eventType: eventType || "note",
        detail: { description },
      }).returning();
      
      res.status(201).json({ ...entry, description });
    } catch (error) {
      console.error("Error adding timeline entry:", error);
      res.status(400).json({ error: "Failed to add timeline entry" });
    }
  });

  app.post("/api/incidents/:id/comms", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message, author } = req.body;
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const [entry] = await db.insert(incidentTimeline).values({
        incidentId: id,
        timestamp: new Date(),
        actor: author || "System",
        eventType: "comms",
        detail: { message },
      }).returning();
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error adding communication:", error);
      res.status(400).json({ error: "Failed to add communication" });
    }
  });

  app.post("/api/incidents/:id/evidence", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { evidenceType, description, location } = req.body;
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const evidenceData = {
        incidentId: id,
        evidenceType: evidenceType || "log",
        location: location || "N/A",
        submittedBy: "analyst",
      };
      
      const [created] = await db.insert(incidentEvidence).values(evidenceData).returning();
      
      await db.insert(incidentTimeline).values({
        incidentId: id,
        timestamp: new Date(),
        actor: "analyst",
        eventType: "evidence",
        detail: { 
          evidenceId: created.id,
          evidenceType: created.evidenceType,
          location: created.location,
          description: description || `Added ${created.evidenceType} evidence`,
        },
      });
      
      res.status(201).json(created);
    } catch (error) {
      console.error("Error adding evidence:", error);
      res.status(400).json({ error: "Failed to add evidence" });
    }
  });

  app.get("/api/incidents/:id/export", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const format = req.query.format || "md";
      
      if (format !== "md") {
        return res.status(400).json({ error: "Only markdown format is supported" });
      }
      
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const tasks = await db.select().from(incidentTasks).where(eq(incidentTasks.incidentId, id)).orderBy(incidentTasks.phase, incidentTasks.priority);
      
      const timeline = await db.select().from(incidentTimeline).where(eq(incidentTimeline.incidentId, id)).orderBy(asc(incidentTimeline.timestamp));
      
      const evidence = await db.select().from(incidentEvidence).where(eq(incidentEvidence.incidentId, id)).orderBy(incidentEvidence.collectedAt);
      
      const linkedDetections = await db
        .select({
          detection: detections,
        })
        .from(detectionIncidentLinks)
        .innerJoin(detections, eq(detections.id, detectionIncidentLinks.detectionId))
        .where(eq(detectionIncidentLinks.incidentId, id));
      
      let markdown = `# Incident Report: ${incident.incidentNumber || incident.id}\n\n`;
      markdown += `**Title:** ${incident.title}\n`;
      markdown += `**Severity:** ${incident.severity}\n`;
      markdown += `**Status:** ${incident.status}\n`;
      markdown += `**Owner:** ${incident.owner || "Unassigned"}\n`;
      markdown += `**Opened:** ${incident.openedAt?.toISOString() || "N/A"}\n`;
      markdown += `**Closed:** ${incident.closedAt?.toISOString() || "N/A"}\n`;
      markdown += `**SLA Due:** ${incident.slaDueAt?.toISOString() || "N/A"}\n`;
      markdown += `**SLA Breached:** ${incident.slaBreached ? "Yes" : "No"}\n\n`;
      
      markdown += `## Summary\n\n${incident.summary || "No summary provided."}\n\n`;
      
      if (incident.rootCause) {
        markdown += `## Root Cause\n\n${incident.rootCause}\n\n`;
      }
      
      if (incident.lessonsLearned) {
        markdown += `## Lessons Learned\n\n${incident.lessonsLearned}\n\n`;
      }
      
      if (linkedDetections.length > 0) {
        markdown += `## Linked Detections (${linkedDetections.length})\n\n`;
        for (const { detection } of linkedDetections) {
          markdown += `- **${detection.source}** - ${detection.indicator} (Severity: ${detection.severity}, Confidence: ${detection.confidence}%)\n`;
          if (detection.ttp && detection.ttp.length > 0) {
            markdown += `  - TTPs: ${detection.ttp.join(", ")}\n`;
          }
          if (detection.analystNote) {
            markdown += `  - Note: ${detection.analystNote}\n`;
          }
        }
        markdown += `\n`;
      }
      
      if (tasks.length > 0) {
        markdown += `## Tasks (${tasks.length})\n\n`;
        const tasksByPhase = tasks.reduce((acc, task) => {
          if (!acc[task.phase]) acc[task.phase] = [];
          acc[task.phase].push(task);
          return acc;
        }, {} as Record<string, typeof tasks>);
        
        for (const [phase, phaseTasks] of Object.entries(tasksByPhase)) {
          markdown += `### ${phase}\n\n`;
          for (const task of phaseTasks) {
            const statusIcon = task.status === "Completed" ? "✅" : task.status === "In Progress" ? "🔄" : "⬜";
            markdown += `${statusIcon} **${task.title}**\n`;
            if (task.description) markdown += `   ${task.description}\n`;
            markdown += `   - Owner: ${task.owner || "Unassigned"}\n`;
            markdown += `   - Status: ${task.status}\n`;
            if (task.dueDate) markdown += `   - Due: ${task.dueDate.toISOString()}\n`;
            markdown += `\n`;
          }
        }
      }
      
      if (timeline.length > 0) {
        markdown += `## Timeline (${timeline.length} events)\n\n`;
        for (const entry of timeline) {
          markdown += `- **${entry.timestamp.toISOString()}** - ${entry.actor} - ${entry.eventType}\n`;
          if (entry.detail) {
            markdown += `  \`\`\`json\n  ${JSON.stringify(entry.detail, null, 2)}\n  \`\`\`\n`;
          }
        }
        markdown += `\n`;
      }
      
      if (evidence.length > 0) {
        markdown += `## Evidence (${evidence.length} items)\n\n`;
        for (const item of evidence) {
          markdown += `### ${item.evidenceType}\n`;
          markdown += `- **Location:** ${item.location}\n`;
          markdown += `- **Collected:** ${item.collectedAt.toISOString()}\n`;
          markdown += `- **Submitted by:** ${item.submittedBy || "Unknown"}\n`;
          if (item.description) markdown += `- **Description:** ${item.description}\n`;
          if (item.hash) markdown += `- **Hash:** ${item.hash}\n`;
          markdown += `\n`;
        }
      }
      
      markdown += `---\n*Generated on ${new Date().toISOString()}*\n`;
      
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="incident-${incident.incidentNumber || incident.id}.md"`);
      res.send(markdown);
    } catch (error) {
      console.error("Error exporting incident:", error);
      res.status(500).json({ error: "Failed to export incident" });
    }
  });
  
  // ============================================================================
  // CONTROLS API (Protect Function)
  // ============================================================================
  
  app.get("/api/controls", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const family = req.query.family as string;
      const csfFunction = req.query.function as string;
      const search = req.query.search as string;
      
      let query = db.select().from(controls);
      const conditions = [];
      
      if (family && family !== "all") conditions.push(eq(controls.family, family as any));
      if (csfFunction && csfFunction !== "all") conditions.push(eq(controls.csfFunction, csfFunction as any));
      if (search) {
        conditions.push(sql`${controls.title} ILIKE ${`%${search}%`} OR ${controls.controlId} ILIKE ${`%${search}%`}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const allControls = await query.orderBy(desc(controls.priority)).limit(pageSize).offset((page - 1) * pageSize);
      
      const controlsWithSops = await Promise.all(
        allControls.map(async (control) => {
          let sop = null;
          if (control.sopId) {
            [sop] = await db.select().from(sops).where(eq(sops.id, control.sopId));
          }
          return { ...control, sop: sop?.title || null };
        })
      );
      
      let countQuery = db.select({ count: count() }).from(controls);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      res.json({ controls: controlsWithSops, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching controls:", error);
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });
  
  app.get("/api/controls/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [control] = await db.select().from(controls).where(eq(controls.id, id));
      
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      
      let sop = null;
      if (control.sopId) {
        [sop] = await db.select().from(sops).where(eq(sops.id, control.sopId));
      }
      
      const assignments = await db
        .select({
          id: policyAssignments.id,
          assetId: policyAssignments.assetId,
          assetName: assets.name,
          status: policyAssignments.status,
          owner: policyAssignments.owner,
        })
        .from(policyAssignments)
        .leftJoin(assets, eq(policyAssignments.assetId, assets.id))
        .where(eq(policyAssignments.controlId, id));
      
      res.json({ control, sop, assignments });
    } catch (error) {
      console.error("Error fetching control:", error);
      res.status(500).json({ error: "Failed to fetch control" });
    }
  });
  
  app.post("/api/controls", async (req: Request, res: Response) => {
    try {
      const validatedData = insertControlSchema.parse(req.body);
      
      // Check if control with same controlId already exists
      const [existing] = await db.select().from(controls).where(eq(controls.controlId, validatedData.controlId));
      if (existing) {
        return res.status(409).json({ error: `Control ${validatedData.controlId} already exists` });
      }
      
      const [newControl] = await db.insert(controls).values(validatedData).returning();
      res.status(201).json(newControl);
    } catch (error) {
      console.error("Error creating control:", error);
      res.status(400).json({ error: "Failed to create control" });
    }
  });

  app.delete("/api/controls/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Delete related SOPs first
      const [control] = await db.select().from(controls).where(eq(controls.id, id));
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      
      if (control.sopId) {
        await db.delete(sops).where(eq(sops.id, control.sopId));
      }
      
      // Delete policy assignments
      await db.delete(policyAssignments).where(eq(policyAssignments.controlId, id));
      
      // Delete the control
      await db.delete(controls).where(eq(controls.id, id));
      
      console.log(`[Controls] Deleted control ${control.controlId}`);
      res.json({ success: true, message: `Control ${control.controlId} deleted` });
    } catch (error) {
      console.error("Error deleting control:", error);
      res.status(500).json({ error: "Failed to delete control" });
    }
  });

  app.patch("/api/controls/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updatedControl] = await db
        .update(controls)
        .set(updates)
        .where(eq(controls.id, id))
        .returning();
      
      if (!updatedControl) {
        return res.status(404).json({ error: "Control not found" });
      }
      
      res.json(updatedControl);
    } catch (error) {
      console.error("Error updating control:", error);
      res.status(500).json({ error: "Failed to update control" });
    }
  });
  
  // ============================================================================
  // RISK REGISTER API (Govern Function)
  // ============================================================================
  
  app.get("/api/risk-items", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      const allRisks = await db
        .select({
          id: riskItems.id,
          title: riskItems.title,
          assetId: riskItems.assetId,
          assetName: assets.name,
          likelihood: riskItems.likelihood,
          impact: riskItems.impact,
          score: riskItems.score,
          residualRisk: riskItems.residualRisk,
          status: riskItems.status,
          owner: riskItems.owner,
        })
        .from(riskItems)
        .leftJoin(assets, eq(riskItems.assetId, assets.id))
        .orderBy(desc(riskItems.score))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      
      const [totalResult] = await db.select({ count: count() }).from(riskItems);
      const total = totalResult?.count || 0;
      
      res.json({ data: allRisks, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching risk items:", error);
      res.status(500).json({ error: "Failed to fetch risk items" });
    }
  });
  
  app.get("/api/risk-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [risk] = await db
        .select({
          id: riskItems.id,
          title: riskItems.title,
          description: riskItems.description,
          assetId: riskItems.assetId,
          assetName: assets.name,
          likelihood: riskItems.likelihood,
          impact: riskItems.impact,
          score: riskItems.score,
          residualRisk: riskItems.residualRisk,
          status: riskItems.status,
          owner: riskItems.owner,
        })
        .from(riskItems)
        .leftJoin(assets, eq(riskItems.assetId, assets.id))
        .where(eq(riskItems.id, id));
      
      if (!risk) {
        return res.status(404).json({ error: "Risk not found" });
      }
      
      res.json(risk);
    } catch (error) {
      console.error("Error fetching risk item:", error);
      res.status(500).json({ error: "Failed to fetch risk item" });
    }
  });

  app.post("/api/risk-items", async (req: Request, res: Response) => {
    try {
      const validatedData = insertRiskItemSchema.parse(req.body);
      const score = validatedData.likelihood * validatedData.impact;
      
      const [newRisk] = await db.insert(riskItems).values({
        ...validatedData,
        score,
      }).returning();
      
      res.status(201).json(newRisk);
    } catch (error) {
      console.error("Error creating risk item:", error);
      res.status(400).json({ error: "Failed to create risk item" });
    }
  });

  app.patch("/api/risk-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Recalculate score if likelihood or impact changed
      if (updates.likelihood !== undefined || updates.impact !== undefined) {
        const [existing] = await db.select().from(riskItems).where(eq(riskItems.id, id));
        if (existing) {
          const likelihood = updates.likelihood ?? existing.likelihood;
          const impact = updates.impact ?? existing.impact;
          updates.score = likelihood * impact;
        }
      }
      
      const [updatedRisk] = await db
        .update(riskItems)
        .set(updates)
        .where(eq(riskItems.id, id))
        .returning();
      
      if (!updatedRisk) {
        return res.status(404).json({ error: "Risk not found" });
      }
      
      res.json(updatedRisk);
    } catch (error) {
      console.error("Error updating risk item:", error);
      res.status(500).json({ error: "Failed to update risk item" });
    }
  });

  app.delete("/api/risk-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db.delete(riskItems).where(eq(riskItems.id, id)).returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Risk not found" });
      }
      
      console.log(`[Risks] Deleted risk: ${deleted.title}`);
      res.json({ success: true, message: "Risk deleted" });
    } catch (error) {
      console.error("Error deleting risk item:", error);
      res.status(500).json({ error: "Failed to delete risk item" });
    }
  });

  app.get("/api/risk/stats", async (req: Request, res: Response) => {
    try {
      const [totalResult] = await db.select({ count: count() }).from(riskItems);
      const [criticalResult] = await db
        .select({ count: count() })
        .from(riskItems)
        .where(gte(riskItems.score, 20));
      const [openResult] = await db
        .select({ count: count() })
        .from(riskItems)
        .where(eq(riskItems.status, "Open"));
      const [avgResult] = await db
        .select({ avg: sql<number>`COALESCE(AVG(${riskItems.score}), 0)` })
        .from(riskItems);
      
      res.json({
        total: totalResult?.count || 0,
        critical: criticalResult?.count || 0,
        open: openResult?.count || 0,
        avgScore: parseFloat(avgResult?.avg?.toString() || "0"),
      });
    } catch (error) {
      console.error("Error fetching risk stats:", error);
      res.status(500).json({ error: "Failed to fetch risk stats" });
    }
  });
  
  // ============================================================================
  // DASHBOARD STATS API
  // ============================================================================
  
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const [assetCount] = await db.select({ count: count() }).from(assets);
      const [intelEventCount] = await db.select({ count: count() }).from(intelEvents);
      const [controlCount] = await db.select({ count: count() }).from(controls);
      const [openIncidents] = await db
        .select({ count: count() })
        .from(incidents)
        .where(eq(incidents.status, "Open"));
      
      res.json({
        assets: assetCount?.count || 0,
        intelEvents: intelEventCount?.count || 0,
        controls: controlCount?.count || 0,
        incidents: openIncidents?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  app.get("/api/stats/trend", async (req: Request, res: Response) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const eventsByDay = await db
        .select({
          date: sql<string>`DATE(${intelEvents.createdAt})`,
          count: count(),
        })
        .from(intelEvents)
        .where(gte(intelEvents.createdAt, sevenDaysAgo))
        .groupBy(sql`DATE(${intelEvents.createdAt})`)
        .orderBy(sql`DATE(${intelEvents.createdAt})`);
      
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const dayData = eventsByDay.find((d) => d.date === dateStr);
        days.push({
          date: dateStr,
          events: dayData?.count || 0,
        });
      }
      
      res.json(days);
    } catch (error) {
      console.error("Error fetching trend:", error);
      res.status(500).json({ error: "Failed to fetch trend" });
    }
  });
  
  app.get("/api/coverage", async (req: Request, res: Response) => {
    try {
      const coverageByFunction = await db
        .select({
          csfFunction: controls.csfFunction,
          total: count(),
          implemented: sql<number>`SUM(CASE WHEN ${controls.implementationStatus} = 'Implemented' THEN 1 ELSE 0 END)`,
        })
        .from(controls)
        .groupBy(controls.csfFunction);
      
      res.json(coverageByFunction);
    } catch (error) {
      console.error("Error fetching coverage:", error);
      res.status(500).json({ error: "Failed to fetch coverage" });
    }
  });
  
  // ============================================================================
  // RISK SCORING API
  // ============================================================================
  
  app.get("/api/risk-scores", async (req: Request, res: Response) => {
    try {
      const riskScores = await riskScorer.calculateAllAssetRisks();
      res.json(riskScores);
    } catch (error) {
      console.error("Error calculating risk scores:", error);
      res.status(500).json({ error: "Failed to calculate risk scores" });
    }
  });
  
  app.get("/api/risk-scores/:assetId", async (req: Request, res: Response) => {
    try {
      const { assetId } = req.params;
      const riskScore = await riskScorer.calculateAssetRisk(assetId);
      
      if (!riskScore) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(riskScore);
    } catch (error) {
      console.error("Error calculating risk score:", error);
      res.status(500).json({ error: "Failed to calculate risk score" });
    }
  });
  
  // ============================================================================
  // AI AGENTS API
  // ============================================================================
  
  // Identify Agent: Asset Discovery & Classification
  app.post("/api/identify/classify", async (req: Request, res: Response) => {
    try {
      const { assetData } = req.body;
      
      const prompt = `You are a cybersecurity asset classification expert. Analyze this asset and provide:
1. Recommended criticality (1-5, where 5 is most critical)
2. Data sensitivity (Low, Moderate, High)
3. Suggested tags (array of strings)
4. Business impact assessment

Asset Data:
${JSON.stringify(assetData, null, 2)}

Respond in JSON format:
{
  "criticality": <number>,
  "dataSensitivity": "<Low|Moderate|High>",
  "tags": ["<tag1>", "<tag2>"],
  "businessImpact": "<assessment>"
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Error in identify agent:", error);
      res.status(500).json({ error: "Failed to classify asset" });
    }
  });
  
  // Detect Agent: Threat Correlation & Deduplication
  app.post("/api/detect/correlate", async (req: Request, res: Response) => {
    try {
      const { indicator, source } = req.body;
      
      const existingDetections = await db
        .select()
        .from(detections)
        .where(eq(detections.indicator, indicator))
        .limit(5);
      
      const matchingAssets = await db
        .select()
        .from(assets)
        .where(
          sql`${assets.ip} = ${indicator} OR ${assets.hostname} = ${indicator}`
        )
        .limit(5);
      
      const prompt = `You are a threat intelligence analyst. Analyze this detection:

Indicator: ${indicator}
Source: ${source}

Existing Detections: ${JSON.stringify(existingDetections, null, 2)}
Matching Assets: ${JSON.stringify(matchingAssets, null, 2)}

Provide:
1. Is this a duplicate? (true/false)
2. Recommended severity (1-5)
3. Confidence level (0-100)
4. MITRE ATT&CK TTPs (array of strings like "T1071", "T1566")
5. Correlation summary

Respond in JSON format:
{
  "isDuplicate": <boolean>,
  "severity": <number>,
  "confidence": <number>,
  "ttps": ["<ttp1>", "<ttp2>"],
  "summary": "<correlation analysis>"
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ ...result, matchingAssets, existingDetections });
    } catch (error) {
      console.error("Error in detect agent:", error);
      res.status(500).json({ error: "Failed to correlate detection" });
    }
  });
  
  // Protect Agent: NIST 800-53 Control Generation
  app.post("/api/protect/generate-controls", async (req: Request, res: Response) => {
    try {
      const { assetType, criticality, threats } = req.body;
      
      const prompt = `You are a NIST 800-53 control expert. Generate appropriate controls for:

Asset Type: ${assetType}
Criticality: ${criticality}/5
Identified Threats: ${threats?.join(", ") || "None"}

Generate 3-5 relevant NIST 800-53 controls with:
1. Control ID (e.g., "AC-2", "IA-2")
2. Control Family (e.g., "AC", "IA")
3. Title
4. Description
5. CSF Function (Identify, Protect, Detect, Respond, Recover, Govern)
6. Priority (1-5)

Respond in JSON format:
{
  "controls": [
    {
      "controlId": "<id>",
      "family": "<family>",
      "title": "<title>",
      "description": "<description>",
      "csfFunction": "<function>",
      "priority": <number>
    }
  ]
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Save generated controls to database (skip existing ones)
      const savedControls = [];
      const skippedControls = [];
      if (result.controls && Array.isArray(result.controls)) {
        console.log(`[Protect Agent] Processing ${result.controls.length} generated controls`);
        for (const control of result.controls) {
          // Check if control already exists
          const [existing] = await db.select().from(controls).where(eq(controls.controlId, control.controlId));
          if (existing) {
            console.log(`[Protect Agent] Skipping existing control ${control.controlId}`);
            skippedControls.push(control.controlId);
            continue;
          }
          
          const controlData = {
            controlId: control.controlId,
            family: control.family,
            title: control.title,
            description: control.description,
            csfFunction: control.csfFunction,
            priority: control.priority || 3,
            implementationStatus: "Proposed" as const,
            csfCategory: null,
            csfSubcategory: null,
          };
          
          const [saved] = await db.insert(controls).values(controlData).returning();
          savedControls.push(saved);
        }
        console.log(`[Protect Agent] Saved ${savedControls.length} new controls, skipped ${skippedControls.length} existing`);
      }
      
      res.json({ controls: savedControls, skipped: skippedControls });
    } catch (error) {
      console.error("Error in protect agent:", error);
      res.status(500).json({ error: "Failed to generate controls" });
    }
  });

  // Protect Agent: Generate SOP for Control
  app.post("/api/protect/generate-sop/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Fetch the control
      const [control] = await db.select().from(controls).where(eq(controls.id, id));
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      
      const prompt = `You are a cybersecurity SOP expert. Generate a Standard Operating Procedure for implementing this NIST 800-53 control:

Control ID: ${control.controlId}
Title: ${control.title}
Description: ${control.description}
Family: ${control.family}
CSF Function: ${control.csfFunction}

Generate a comprehensive SOP with:
1. Title - SOP title
2. Scope - What this SOP covers
3. Owner - Suggested role responsible
4. Cadence - How often this should be reviewed/performed
5. Steps - Array of step-by-step implementation instructions (5-10 steps)
6. Evidence to Collect - Array of evidence items needed for audit
7. Success Criteria - How to know the control is properly implemented
8. Content - Full markdown-formatted SOP document

Respond in JSON format:
{
  "title": "<sop title>",
  "scope": "<scope description>",
  "owner": "<responsible role>",
  "cadence": "<review frequency>",
  "steps": ["<step1>", "<step2>", ...],
  "evidenceToCollect": ["<evidence1>", "<evidence2>", ...],
  "successCriteria": "<success criteria>",
  "content": "<full markdown SOP document>"
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Create or update SOP
      const sopData = {
        controlId: id,
        title: result.title || `SOP for ${control.title}`,
        scope: result.scope,
        owner: result.owner,
        cadence: result.cadence,
        steps: result.steps || [],
        evidenceToCollect: result.evidenceToCollect || [],
        successCriteria: result.successCriteria,
        content: result.content,
      };
      
      // Check if SOP already exists for this control
      const [existingSop] = await db.select().from(sops).where(eq(sops.controlId, id));
      
      let savedSop;
      if (existingSop) {
        // Update existing SOP
        [savedSop] = await db.update(sops)
          .set({ ...sopData, updatedAt: new Date() })
          .where(eq(sops.id, existingSop.id))
          .returning();
      } else {
        // Insert new SOP
        [savedSop] = await db.insert(sops).values(sopData).returning();
        
        // Link SOP to control
        await db.update(controls)
          .set({ sopId: savedSop.id, updatedAt: new Date() })
          .where(eq(controls.id, id));
      }
      
      console.log(`[Protect] Generated SOP for control ${control.controlId}`);
      res.json({ sop: savedSop });
    } catch (error) {
      console.error("Error generating SOP:", error);
      res.status(500).json({ error: "Failed to generate SOP" });
    }
  });
  
  // Respond Agent: Auto-Incident Creation from Detections
  app.post("/api/respond/run", async (req: Request, res: Response) => {
    try {
      const { RespondAutomationService } = await import("./respond-automation");
      const service = new RespondAutomationService();
      
      const criteria = {
        detectionIds: req.body.detectionIds,
        severityThreshold: req.body.severityThreshold,
        confidenceThreshold: req.body.confidenceThreshold,
        timeWindowHours: req.body.timeWindowHours,
      };
      
      const result = await service.run(criteria);
      
      res.json({
        success: true,
        created: result.created.length,
        linkedExisting: result.updatedLinks.length,
        skipped: result.skipped.length,
        incidents: result.created.map(c => ({
          id: c.incident.id,
          incidentNumber: c.incident.incidentNumber,
          title: c.incident.title,
          severity: c.incident.severity,
          taskCount: c.tasks.length,
        })),
        skippedDetails: result.skipped,
      });
    } catch (error) {
      console.error("Error in respond automation:", error);
      res.status(500).json({ error: "Failed to run respond automation" });
    }
  });

  // Respond Agent: Incident Playbook Generation
  app.post("/api/respond/generate-playbook", async (req: Request, res: Response) => {
    try {
      const { incidentType, severity, affectedAssets } = req.body;
      
      const prompt = `You are an incident response expert. Generate an IR playbook for:

Incident Type: ${incidentType}
Severity: ${severity}
Affected Assets: ${affectedAssets?.join(", ") || "Unknown"}

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
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Error in respond agent:", error);
      res.status(500).json({ error: "Failed to generate playbook" });
    }
  });
  
  // Recover Agent: BCP/DR Recommendations
  app.post("/api/recover/recommendations", async (req: Request, res: Response) => {
    try {
      const { incidentSummary, impactedSystems } = req.body;
      
      const prompt = `You are a business continuity and disaster recovery expert. Provide recovery recommendations for:

Incident Summary: ${incidentSummary}
Impacted Systems: ${impactedSystems?.join(", ") || "Unknown"}

Provide:
1. RTO (Recovery Time Objective) recommendation
2. RPO (Recovery Point Objective) recommendation
3. Recovery priorities (ordered list)
4. Backup verification steps
5. Communication plan

Respond in JSON format:
{
  "rto": "<time>",
  "rpo": "<time>",
  "priorities": ["<priority1>", "<priority2>"],
  "backupSteps": ["<step1>", "<step2>"],
  "communicationPlan": "<plan description>"
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Error in recover agent:", error);
      res.status(500).json({ error: "Failed to generate recovery recommendations" });
    }
  });
  
  // Govern Agent: Compliance Gap Analysis
  app.post("/api/govern/gap-analysis", async (req: Request, res: Response) => {
    try {
      const currentControls = await db
        .select({
          csfFunction: controls.csfFunction,
          implementationStatus: controls.implementationStatus,
        })
        .from(controls);
      
      const prompt = `You are a compliance and governance expert. Analyze the current control implementation status:

Current Controls:
${JSON.stringify(currentControls, null, 2)}

Provide a gap analysis with:
1. Overall maturity level (1-5)
2. Top 5 priority gaps with CSF category
3. Recommended next actions
4. Compliance risk assessment

Respond in JSON format:
{
  "maturityLevel": <number>,
  "topGaps": [
    {
      "category": "<CSF category>",
      "description": "<gap description>",
      "priority": <number>
    }
  ],
  "nextActions": ["<action1>", "<action2>"],
  "riskAssessment": "<assessment>"
}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Error in govern agent:", error);
      res.status(500).json({ error: "Failed to perform gap analysis" });
    }
  });
  
  // ============================================================================
  // OSINT API
  // ============================================================================
  
  app.post("/api/osint/scan", async (req: Request, res: Response) => {
    try {
      const result = await osintOrchestrator.runFullScan();
      res.json(result);
    } catch (error) {
      console.error("Error running OSINT scan:", error);
      res.status(500).json({ error: "Failed to run OSINT scan" });
    }
  });
  
  app.post("/api/osint/query", async (req: Request, res: Response) => {
    try {
      const { indicator } = req.body;
      
      if (!indicator) {
        return res.status(400).json({ error: "Indicator is required" });
      }
      
      const results = await osintOrchestrator.queryIndicator(indicator);
      res.json(results);
    } catch (error) {
      console.error("Error querying OSINT:", error);
      res.status(500).json({ error: "Failed to query OSINT sources" });
    }
  });
  
  // ============================================================================
  // SCHEDULER API
  // ============================================================================
  
  app.get("/api/scheduler/status", (req: Request, res: Response) => {
    try {
      const status = scheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });
  
  app.post("/api/scheduler/trigger-osint", async (req: Request, res: Response) => {
    try {
      const result = await scheduler.runOsintScanNow();
      res.json(result);
    } catch (error) {
      console.error("Error triggering OSINT scan:", error);
      res.status(500).json({ error: "Failed to trigger OSINT scan" });
    }
  });
  
  app.post("/api/scheduler/trigger-sla-check", async (req: Request, res: Response) => {
    try {
      const breachCount = await scheduler.checkSlaNow();
      res.json({ breachCount });
    } catch (error) {
      console.error("Error checking SLA:", error);
      res.status(500).json({ error: "Failed to check SLA" });
    }
  });
  
  app.post("/api/scheduler/trigger-rpo-rto-check", async (req: Request, res: Response) => {
    try {
      const result = await scheduler.checkRpoRtoNow();
      res.json(result);
    } catch (error) {
      console.error("Error checking RPO/RTO:", error);
      res.status(500).json({ error: "Failed to check RPO/RTO" });
    }
  });

  // ============================================================================
  // BACKUP & RESTORE API (Week 7 - Recover Function)
  // ============================================================================
  
  app.post("/api/backups/report", async (req: Request, res: Response) => {
    try {
      const validationResult = insertBackupSetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.issues 
        });
      }

      const data = validationResult.data;

      // Validate asset exists
      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, data.assetId)
      });
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Validate drPlan if provided
      let drPlan = null;
      if (data.drPlanId) {
        drPlan = await db.query.drPlans.findFirst({
          where: eq(drPlans.id, data.drPlanId)
        });
        if (!drPlan) {
          return res.status(404).json({ error: "DR Plan not found" });
        }
      }

      // Check RPO breach if drPlan and rpoMinutesObserved are provided
      let rpoBreached = false;
      if (drPlan && data.rpoMinutesObserved !== undefined && data.rpoMinutesObserved !== null) {
        rpoBreached = data.rpoMinutesObserved > drPlan.rpoMinutes;
        
        // Update drPlan's cached RPO observation
        await db.update(drPlans)
          .set({ 
            lastRpoMinutesObserved: data.rpoMinutesObserved,
            updatedAt: new Date()
          })
          .where(eq(drPlans.id, data.drPlanId!));
      }

      // Create backup set record
      const [backupSet] = await db.insert(backupSets)
        .values({
          ...data,
          rpoBreached
        })
        .returning();

      res.status(201).json(backupSet);
    } catch (error) {
      console.error("Error creating backup set:", error);
      res.status(500).json({ error: "Failed to create backup set" });
    }
  });

  app.post("/api/restores/test", async (req: Request, res: Response) => {
    try {
      const validationResult = insertRestoreTestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.issues 
        });
      }

      const data = validationResult.data;

      // Validate asset exists
      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, data.assetId)
      });
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Validate backupSet exists
      const backupSet = await db.query.backupSets.findFirst({
        where: eq(backupSets.id, data.backupSetId)
      });
      if (!backupSet) {
        return res.status(404).json({ error: "Backup set not found" });
      }

      // Validate drPlan if provided
      let drPlan = null;
      if (data.drPlanId) {
        drPlan = await db.query.drPlans.findFirst({
          where: eq(drPlans.id, data.drPlanId)
        });
        if (!drPlan) {
          return res.status(404).json({ error: "DR Plan not found" });
        }

        // Update drPlan's cached RTO observation if restoreDurationMinutes provided
        if (data.restoreDurationMinutes !== undefined && data.restoreDurationMinutes !== null) {
          await db.update(drPlans)
            .set({ 
              lastRtoMinutesObserved: data.restoreDurationMinutes,
              updatedAt: new Date()
            })
            .where(eq(drPlans.id, data.drPlanId));
        }
      }

      // Create restore test record
      const [restoreTest] = await db.insert(restoreTests)
        .values(data)
        .returning();

      res.status(201).json(restoreTest);
    } catch (error) {
      console.error("Error creating restore test:", error);
      res.status(500).json({ error: "Failed to create restore test" });
    }
  });

  // ============================================================================
  // RESILIENCE AGENT API (Week 7 - Recover Function)
  // ============================================================================

  app.post("/api/recover/run", async (req: Request, res: Response) => {
    try {
      const { assetId } = req.body;

      // Validate asset if provided
      if (assetId) {
        const asset = await db.query.assets.findFirst({
          where: eq(assets.id, assetId)
        });
        if (!asset) {
          return res.status(404).json({ error: "Asset not found" });
        }
      }

      const result = await resilienceAgent.runAnalysis(assetId);
      res.json(result);
    } catch (error) {
      console.error("Error running resilience analysis:", error);
      res.status(500).json({ error: "Failed to run resilience analysis" });
    }
  });

  app.get("/api/recover/summary", async (req: Request, res: Response) => {
    try {
      const summary = await resilienceAgent.getSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error getting recovery summary:", error);
      res.status(500).json({ error: "Failed to get recovery summary" });
    }
  });

  // ============================================================================
  // GOVERN AGENT API (Week 8 - Govern Function)
  // ============================================================================

  // Run the Govern Agent - computes assertions, KPIs, POA&M, and creates snapshot
  app.post("/api/govern/run", async (req: Request, res: Response) => {
    try {
      const result = await runGovernAgent();
      res.json(result);
    } catch (error) {
      console.error("Error running govern agent:", error);
      res.status(500).json({ error: "Failed to run govern agent" });
    }
  });

  // Get governance summary with latest KPIs
  app.get("/api/govern/summary", async (req: Request, res: Response) => {
    try {
      const summary = await getGovernSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error getting governance summary:", error);
      res.status(500).json({ error: "Failed to get governance summary" });
    }
  });

  // Generate executive report
  app.get("/api/govern/report", async (req: Request, res: Response) => {
    try {
      const report = await generateExecutiveReport();
      res.json({ report });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // ============================================================================
  // COMPLIANCE ASSERTIONS API
  // ============================================================================

  // Get all assertions with filtering
  app.get("/api/compliance/assertions", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const func = req.query.function as string;
      const status = req.query.status as string;
      const owner = req.query.owner as string;
      const stale = req.query.stale === "true";

      const conditions = [];
      if (func && func !== "all") conditions.push(eq(complianceAssertions.csfFunction, func as any));
      if (status && status !== "all") conditions.push(eq(complianceAssertions.status, status as any));
      if (owner) conditions.push(eq(complianceAssertions.owner, owner));
      
      if (stale) {
        const staleThreshold = new Date();
        staleThreshold.setDate(staleThreshold.getDate() - 90);
        conditions.push(sql`${complianceAssertions.lastVerifiedAt} < ${staleThreshold} OR ${complianceAssertions.lastVerifiedAt} IS NULL`);
      }

      let query = db.select().from(complianceAssertions);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const allAssertions = await query
        .orderBy(asc(complianceAssertions.csfFunction), asc(complianceAssertions.category))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [totalResult] = await db.select({ count: count() }).from(complianceAssertions);
      const total = totalResult?.count || 0;

      res.json({ assertions: allAssertions, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching assertions:", error);
      res.status(500).json({ error: "Failed to fetch assertions" });
    }
  });

  // Get single assertion
  app.get("/api/compliance/assertions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [assertion] = await db.select().from(complianceAssertions).where(eq(complianceAssertions.id, id));
      
      if (!assertion) {
        return res.status(404).json({ error: "Assertion not found" });
      }

      // Get linked evidence
      const evidence = await db.select().from(evidenceCatalog).where(eq(evidenceCatalog.assertionId, id));

      res.json({ assertion, evidence });
    } catch (error) {
      console.error("Error fetching assertion:", error);
      res.status(500).json({ error: "Failed to fetch assertion" });
    }
  });

  // Create/update assertion
  app.post("/api/compliance/assertions", async (req: Request, res: Response) => {
    try {
      const data = insertComplianceAssertionSchema.parse(req.body);
      const [newAssertion] = await db.insert(complianceAssertions).values(data).returning();
      res.status(201).json(newAssertion);
    } catch (error) {
      console.error("Error creating assertion:", error);
      res.status(400).json({ error: "Failed to create assertion" });
    }
  });

  // Update assertion
  app.patch("/api/compliance/assertions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db
        .update(complianceAssertions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(complianceAssertions.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Assertion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating assertion:", error);
      res.status(500).json({ error: "Failed to update assertion" });
    }
  });

  // ============================================================================
  // POA&M API
  // ============================================================================

  // Get all POA&M items
  app.get("/api/poam", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const status = req.query.status as string;
      const driver = req.query.driver as string;
      const owner = req.query.owner as string;

      const conditions = [];
      if (status && status !== "all") conditions.push(eq(poamItems.status, status as any));
      if (driver && driver !== "all") conditions.push(eq(poamItems.driver, driver as any));
      if (owner) conditions.push(eq(poamItems.owner, owner));

      let query = db.select().from(poamItems);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const allItems = await query
        .orderBy(desc(poamItems.severity), asc(poamItems.dueDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [totalResult] = await db.select({ count: count() }).from(poamItems);
      const total = totalResult?.count || 0;

      res.json({ items: allItems, total, page, pageSize });
    } catch (error) {
      console.error("Error fetching POA&M items:", error);
      res.status(500).json({ error: "Failed to fetch POA&M items" });
    }
  });

  // Get single POA&M item
  app.get("/api/poam/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [item] = await db.select().from(poamItems).where(eq(poamItems.id, id));
      
      if (!item) {
        return res.status(404).json({ error: "POA&M item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching POA&M item:", error);
      res.status(500).json({ error: "Failed to fetch POA&M item" });
    }
  });

  // Create POA&M item
  app.post("/api/poam", async (req: Request, res: Response) => {
    try {
      const data = insertPoamItemSchema.parse(req.body);
      const [newItem] = await db.insert(poamItems).values(data).returning();
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating POA&M item:", error);
      res.status(400).json({ error: "Failed to create POA&M item" });
    }
  });

  // Update POA&M item
  app.patch("/api/poam/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // If status is being set to Completed, set completedAt
      if (updates.status === "Completed" && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      const [updated] = await db
        .update(poamItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(poamItems.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "POA&M item not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating POA&M item:", error);
      res.status(500).json({ error: "Failed to update POA&M item" });
    }
  });

  // ============================================================================
  // METRICS SNAPSHOTS API
  // ============================================================================

  // Get metrics snapshots for trends
  app.get("/api/metrics/snapshots", async (req: Request, res: Response) => {
    try {
      const metric = req.query.metric as string;
      const period = req.query.period as string || "30d";
      
      // Parse period (e.g., "30d", "7d", "90d")
      const days = parseInt(period.replace("d", "")) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const snapshots = await db
        .select()
        .from(governMetricsSnapshots)
        .where(gte(governMetricsSnapshots.snapshotDate, startDate))
        .orderBy(asc(governMetricsSnapshots.snapshotDate));

      res.json({ snapshots, period, metric });
    } catch (error) {
      console.error("Error fetching metrics snapshots:", error);
      res.status(500).json({ error: "Failed to fetch metrics snapshots" });
    }
  });

  // ============================================================================
  // EVIDENCE CATALOG API
  // ============================================================================

  // Get evidence items
  app.get("/api/evidence", async (req: Request, res: Response) => {
    try {
      const controlId = req.query.controlId as string;
      const assertionId = req.query.assertionId as string;

      const conditions = [];
      if (controlId) conditions.push(eq(evidenceCatalog.controlId, controlId));
      if (assertionId) conditions.push(eq(evidenceCatalog.assertionId, assertionId));

      let query = db.select().from(evidenceCatalog);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const items = await query.orderBy(desc(evidenceCatalog.submittedAt));
      res.json({ items });
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  // Add evidence
  app.post("/api/evidence", async (req: Request, res: Response) => {
    try {
      const data = insertEvidenceCatalogSchema.parse(req.body);
      const [newEvidence] = await db.insert(evidenceCatalog).values(data).returning();
      res.status(201).json(newEvidence);
    } catch (error) {
      console.error("Error creating evidence:", error);
      res.status(400).json({ error: "Failed to create evidence" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

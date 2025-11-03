import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { 
  assets, intelEvents, detections, incidents, controls, riskItems, 
  assetIntelLinks, incidentTasks, sops, policyAssignments,
  insertAssetSchema, insertIntelEventSchema, insertDetectionSchema,
  insertIncidentSchema, insertControlSchema, insertRiskItemSchema,
  type Asset, type IntelEvent, type Detection, type Incident,
  type Control, type RiskItem
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count } from "drizzle-orm";
import OpenAI from "openai";
import { osintOrchestrator } from "./osint-adapters";
import { alertManager } from "./alert-system";
import { scheduler } from "./scheduler";

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
      
      let query = db.select().from(assets);
      const conditions = [];
      
      if (type && type !== "all") conditions.push(eq(assets.type, type as any));
      if (search) {
        conditions.push(sql`${assets.name} ILIKE ${`%${search}%`} OR ${assets.hostname} ILIKE ${`%${search}%`}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const allAssets = await query.orderBy(desc(assets.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
      
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
          riskScore: sql<number>`COALESCE(SUM(${riskItems.score}), 0)`,
        })
        .from(assets)
        .leftJoin(riskItems, eq(assets.id, riskItems.assetId))
        .groupBy(assets.id)
        .orderBy(desc(sql`COALESCE(SUM(${riskItems.score}), 0)`))
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
      const [asset] = await db.select().from(assets).where(eq(assets.id, id));
      
      if (!asset) {
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
      
      res.json({ asset, linkedIntel, assignedControls });
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
      
      res.status(201).json(newIncident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(400).json({ error: "Failed to create incident" });
    }
  });
  
  app.patch("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };
      
      if (req.body.status === "Closed") {
        updateData.closedAt = new Date();
      }
      
      const [updated] = await db
        .update(incidents)
        .set(updateData)
        .where(eq(incidents.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(400).json({ error: "Failed to update incident" });
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
      const [newControl] = await db.insert(controls).values(validatedData).returning();
      res.status(201).json(newControl);
    } catch (error) {
      console.error("Error creating control:", error);
      res.status(400).json({ error: "Failed to create control" });
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
  
  // ============================================================================
  // DASHBOARD STATS API
  // ============================================================================
  
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const [assetCount] = await db.select({ count: count() }).from(assets);
      const [detectionCount] = await db.select({ count: count() }).from(detections);
      const [openIncidents] = await db
        .select({ count: count() })
        .from(incidents)
        .where(eq(incidents.status, "Open"));
      const [controlCount] = await db.select({ count: count() }).from(controls);
      
      res.json({
        totalAssets: assetCount?.count || 0,
        totalDetections: detectionCount?.count || 0,
        openIncidents: openIncidents?.count || 0,
        totalControls: controlCount?.count || 0,
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
      
      const detectionsByDay = await db
        .select({
          date: sql<string>`DATE(${detections.firstSeen})`,
          count: count(),
        })
        .from(detections)
        .where(gte(detections.firstSeen, sevenDaysAgo))
        .groupBy(sql`DATE(${detections.firstSeen})`)
        .orderBy(sql`DATE(${detections.firstSeen})`);
      
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const dayData = detectionsByDay.find((d) => d.date === dateStr);
        days.push({
          date: dateStr,
          detections: dayData?.count || 0,
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
      res.json(result);
    } catch (error) {
      console.error("Error in protect agent:", error);
      res.status(500).json({ error: "Failed to generate controls" });
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

  const httpServer = createServer(app);
  return httpServer;
}

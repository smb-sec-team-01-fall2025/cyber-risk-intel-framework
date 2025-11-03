import { db } from "./db";
import { incidents } from "@shared/schema";
import { osintOrchestrator } from "./osint-adapters";
import { alertManager } from "./alert-system";
import { sql, and, eq, lte } from "drizzle-orm";

// ============================================================================
// SCHEDULER CONFIGURATION
// ============================================================================

export interface SchedulerConfig {
  osintScanInterval?: number;
  slaCheckInterval?: number;
  enableOsintScans?: boolean;
  enableSlaMonitoring?: boolean;
}

// ============================================================================
// BACKGROUND SCHEDULER
// ============================================================================

export class BackgroundScheduler {
  private config: SchedulerConfig;
  private osintIntervalId?: NodeJS.Timeout;
  private slaIntervalId?: NodeJS.Timeout;
  private isRunning = false;
  
  constructor(config?: SchedulerConfig) {
    this.config = {
      osintScanInterval: config?.osintScanInterval || 3600000, // 1 hour default
      slaCheckInterval: config?.slaCheckInterval || 300000, // 5 minutes default
      enableOsintScans: config?.enableOsintScans ?? true,
      enableSlaMonitoring: config?.enableSlaMonitoring ?? true,
    };
  }
  
  start(): void {
    if (this.isRunning) {
      console.log("[Scheduler] Already running");
      return;
    }
    
    console.log("[Scheduler] Starting background jobs...");
    this.isRunning = true;
    
    if (this.config.enableOsintScans) {
      this.startOsintScans();
    }
    
    if (this.config.enableSlaMonitoring) {
      this.startSlaMonitoring();
    }
    
    console.log("[Scheduler] Background jobs started successfully");
  }
  
  stop(): void {
    if (!this.isRunning) {
      console.log("[Scheduler] Not running");
      return;
    }
    
    console.log("[Scheduler] Stopping background jobs...");
    
    if (this.osintIntervalId) {
      clearInterval(this.osintIntervalId);
      this.osintIntervalId = undefined;
    }
    
    if (this.slaIntervalId) {
      clearInterval(this.slaIntervalId);
      this.slaIntervalId = undefined;
    }
    
    this.isRunning = false;
    console.log("[Scheduler] Background jobs stopped");
  }
  
  private startOsintScans(): void {
    console.log(`[Scheduler] Starting OSINT scans every ${this.config.osintScanInterval}ms`);
    
    this.runOsintScan();
    
    this.osintIntervalId = setInterval(() => {
      this.runOsintScan();
    }, this.config.osintScanInterval);
  }
  
  private async runOsintScan(): Promise<void> {
    try {
      console.log("[Scheduler] Running scheduled OSINT scan...");
      
      const result = await osintOrchestrator.runFullScan();
      
      console.log(
        `[Scheduler] OSINT scan complete: ${result.totalScanned} scanned, ` +
        `${result.newIntelEvents} new intel events, ${result.newLinks} new links`
      );
      
      if (result.newIntelEvents > 0) {
        console.log(`[Scheduler] Found ${result.newIntelEvents} new threat intelligence events`);
      }
    } catch (error) {
      console.error("[Scheduler] Error running OSINT scan:", error);
    }
  }
  
  private startSlaMonitoring(): void {
    console.log(`[Scheduler] Starting SLA monitoring every ${this.config.slaCheckInterval}ms`);
    
    this.checkSlaBreaches();
    
    this.slaIntervalId = setInterval(() => {
      this.checkSlaBreaches();
    }, this.config.slaCheckInterval);
  }
  
  private async checkSlaBreaches(): Promise<void> {
    try {
      const now = new Date();
      
      const breachedIncidents = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.slaBreached, false),
            lte(incidents.slaDueAt, now),
            sql`${incidents.status} != 'Closed'`
          )
        );
      
      if (breachedIncidents.length === 0) {
        return;
      }
      
      console.log(`[Scheduler] Found ${breachedIncidents.length} SLA breaches`);
      
      for (const incident of breachedIncidents) {
        try {
          await db
            .update(incidents)
            .set({ slaBreached: true })
            .where(eq(incidents.id, incident.id));
          
          await alertManager.alertOnSlaBreached(incident.id);
          
          console.log(`[Scheduler] SLA breach alert sent for ${incident.incidentNumber}`);
        } catch (error) {
          console.error(
            `[Scheduler] Error processing SLA breach for ${incident.incidentNumber}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("[Scheduler] Error checking SLA breaches:", error);
    }
  }
  
  async runOsintScanNow(): Promise<any> {
    console.log("[Scheduler] Manual OSINT scan triggered");
    return await osintOrchestrator.runFullScan();
  }
  
  async checkSlaNow(): Promise<number> {
    console.log("[Scheduler] Manual SLA check triggered");
    await this.checkSlaBreaches();
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(eq(incidents.slaBreached, true));
    
    return result?.count || 0;
  }
  
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    jobs: {
      osintScans: { enabled: boolean; intervalMs: number };
      slaMonitoring: { enabled: boolean; intervalMs: number };
    };
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      jobs: {
        osintScans: {
          enabled: this.config.enableOsintScans || false,
          intervalMs: this.config.osintScanInterval || 0,
        },
        slaMonitoring: {
          enabled: this.config.enableSlaMonitoring || false,
          intervalMs: this.config.slaCheckInterval || 0,
        },
      },
    };
  }
}

// ============================================================================
// GLOBAL SCHEDULER INSTANCE
// ============================================================================

export const scheduler = new BackgroundScheduler({
  osintScanInterval: parseInt(process.env.OSINT_SCAN_INTERVAL || "3600000"),
  slaCheckInterval: parseInt(process.env.SLA_CHECK_INTERVAL || "300000"),
  enableOsintScans: process.env.ENABLE_OSINT_SCANS !== "false",
  enableSlaMonitoring: process.env.ENABLE_SLA_MONITORING !== "false",
});

import { db } from "./db";
import { incidents, drPlans, backupSets, restoreTests } from "@shared/schema";
import { osintOrchestrator } from "./osint-adapters";
import { alertManager } from "./alert-system";
import { riskScorer } from "./risk-scorer";
import { sql, and, eq, lte, desc } from "drizzle-orm";

// ============================================================================
// SCHEDULER CONFIGURATION
// ============================================================================

export interface SchedulerConfig {
  osintScanInterval?: number;
  slaCheckInterval?: number;
  rpoRtoCheckInterval?: number;
  enableOsintScans?: boolean;
  enableSlaMonitoring?: boolean;
  enableRpoRtoChecks?: boolean;
}

// ============================================================================
// BACKGROUND SCHEDULER WITH JITTER, LOCKS, AND TIMEOUTS
// ============================================================================

function addJitter(intervalMs: number, maxJitterPercent = 10): number {
  const jitterRange = intervalMs * (maxJitterPercent / 100);
  const jitter = Math.floor(Math.random() * jitterRange * 2) - jitterRange;
  return Math.max(1000, intervalMs + jitter);
}

const jobLocks = new Map<string, { locked: boolean; startedAt: number }>();

function acquireLock(jobName: string, timeoutMs: number = 300000): boolean {
  const lock = jobLocks.get(jobName);
  const now = Date.now();
  
  if (lock && lock.locked) {
    if (now - lock.startedAt > timeoutMs) {
      console.warn(`[Scheduler] Lock timeout for ${jobName}, forcing release`);
      releaseLock(jobName);
    } else {
      console.log(`[Scheduler] Job ${jobName} already running, skipping`);
      return false;
    }
  }
  
  jobLocks.set(jobName, { locked: true, startedAt: now });
  return true;
}

function releaseLock(jobName: string): void {
  jobLocks.set(jobName, { locked: false, startedAt: 0 });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, jobName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Job ${jobName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export class BackgroundScheduler {
  private config: SchedulerConfig;
  private osintIntervalId?: NodeJS.Timeout;
  private slaIntervalId?: NodeJS.Timeout;
  private rpoRtoIntervalId?: NodeJS.Timeout;
  private isRunning = false;
  private readonly JOB_TIMEOUT_MS = 300000; // 5 minutes
  
  constructor(config?: SchedulerConfig) {
    this.config = {
      osintScanInterval: config?.osintScanInterval || 3600000, // 1 hour default
      slaCheckInterval: config?.slaCheckInterval || 300000, // 5 minutes default
      rpoRtoCheckInterval: config?.rpoRtoCheckInterval || 86400000, // 24 hours default
      enableOsintScans: config?.enableOsintScans ?? true,
      enableSlaMonitoring: config?.enableSlaMonitoring ?? true,
      enableRpoRtoChecks: config?.enableRpoRtoChecks ?? true,
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
    
    if (this.config.enableRpoRtoChecks) {
      this.startRpoRtoChecks();
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
    
    if (this.rpoRtoIntervalId) {
      clearInterval(this.rpoRtoIntervalId);
      this.rpoRtoIntervalId = undefined;
    }
    
    this.isRunning = false;
    console.log("[Scheduler] Background jobs stopped");
  }
  
  private startOsintScans(): void {
    const baseInterval = this.config.osintScanInterval || 3600000;
    console.log(`[Scheduler] Starting OSINT scans with base interval ${baseInterval}ms (jitter applied each run)`);
    
    setTimeout(() => this.runOsintScan(), addJitter(5000, 50));
    
    const scheduleNext = () => {
      const nextInterval = addJitter(baseInterval);
      this.osintIntervalId = setTimeout(() => {
        this.runOsintScan().finally(() => {
          if (this.isRunning && this.config.enableOsintScans) {
            scheduleNext();
          }
        });
      }, nextInterval);
    };
    
    setTimeout(scheduleNext, addJitter(baseInterval));
  }
  
  private async runOsintScan(): Promise<void> {
    if (!acquireLock("osint_scan", this.JOB_TIMEOUT_MS)) {
      return;
    }
    
    try {
      console.log("[Scheduler] Running scheduled OSINT scan...");
      
      const result = await withTimeout(
        osintOrchestrator.runFullScan(),
        this.JOB_TIMEOUT_MS,
        "osint_scan"
      );
      
      console.log(
        `[Scheduler] OSINT scan complete: ${result.totalScanned} scanned, ` +
        `${result.newIntelEvents} new intel events, ${result.newLinks} new links`
      );
      
      if (result.newIntelEvents > 0) {
        console.log(`[Scheduler] Found ${result.newIntelEvents} new threat intelligence events`);
        console.log("[Scheduler] Recalculating asset risk scores...");
        await riskScorer.calculateAndPersistRiskScores();
      }
    } catch (error) {
      console.error("[Scheduler] Error running OSINT scan:", error);
    } finally {
      releaseLock("osint_scan");
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
  
  private startRpoRtoChecks(): void {
    console.log(`[Scheduler] Starting RPO/RTO checks every ${this.config.rpoRtoCheckInterval}ms`);
    
    this.checkRpoRtoCompliance();
    
    this.rpoRtoIntervalId = setInterval(() => {
      this.checkRpoRtoCompliance();
    }, this.config.rpoRtoCheckInterval);
  }
  
  private async checkRpoRtoCompliance(): Promise<void> {
    try {
      const now = new Date();
      const maxRestoreTestAgeMs = parseInt(process.env.MAX_RESTORE_TEST_AGE_DAYS || "90") * 24 * 60 * 60 * 1000;
      
      const allDrPlans = await db.select().from(drPlans);
      
      if (allDrPlans.length === 0) {
        return;
      }
      
      console.log(`[Scheduler] Evaluating RPO/RTO compliance for ${allDrPlans.length} DR plans`);
      
      let rpoViolations = 0;
      let rtoViolations = 0;
      
      for (const plan of allDrPlans) {
        try {
          const [latestBackup] = await db
            .select()
            .from(backupSets)
            .where(and(
              eq(backupSets.drPlanId, plan.id),
              eq(backupSets.status, 'success')
            ))
            .orderBy(desc(backupSets.backupWindowEnd))
            .limit(1);
          
          const backupAgeMinutes = latestBackup && latestBackup.backupWindowEnd
            ? Math.floor((now.getTime() - latestBackup.backupWindowEnd.getTime()) / (1000 * 60))
            : null;
          
          const rpoCompliant = latestBackup && backupAgeMinutes !== null
            ? backupAgeMinutes <= plan.rpoMinutes
            : false;
          
          if (!rpoCompliant) {
            rpoViolations++;
          }
          
          const [latestPassingTest] = await db
            .select()
            .from(restoreTests)
            .where(and(
              eq(restoreTests.drPlanId, plan.id),
              eq(restoreTests.status, 'passed')
            ))
            .orderBy(desc(restoreTests.startedAt))
            .limit(1);
          
          const testAgeMs = latestPassingTest
            ? now.getTime() - latestPassingTest.startedAt.getTime()
            : null;
          
          const testTooOld = latestPassingTest && testAgeMs !== null && testAgeMs > maxRestoreTestAgeMs;
          
          const rtoCompliant = latestPassingTest && !testTooOld
            ? (latestPassingTest.restoreDurationMinutes !== null && 
               latestPassingTest.restoreDurationMinutes <= plan.rtoMinutes)
            : false;
          
          if (!rtoCompliant) {
            rtoViolations++;
          }
          
          await db
            .update(drPlans)
            .set({
              lastEvaluatedAt: now,
              lastRpoMinutesObserved: backupAgeMinutes,
              lastRtoMinutesObserved: latestPassingTest?.restoreDurationMinutes || null
            })
            .where(eq(drPlans.id, plan.id));
          
        } catch (error) {
          console.error(`[Scheduler] Error evaluating DR plan ${plan.id}:`, error);
        }
      }
      
      console.log(
        `[Scheduler] RPO/RTO evaluation complete: ${allDrPlans.length} plans checked, ` +
        `${rpoViolations} RPO violations, ${rtoViolations} RTO violations`
      );
      
    } catch (error) {
      console.error("[Scheduler] Error checking RPO/RTO compliance:", error);
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
  
  async checkRpoRtoNow(): Promise<{ totalPlans: number; rpoViolations: number; rtoViolations: number }> {
    console.log("[Scheduler] Manual RPO/RTO check triggered");
    await this.checkRpoRtoCompliance();
    
    const allPlans = await db.select().from(drPlans);
    
    const rpoViolations = allPlans.filter(p => 
      p.lastRpoMinutesObserved === null || p.lastRpoMinutesObserved > p.rpoMinutes
    ).length;
    
    const rtoViolations = allPlans.filter(p => 
      p.lastRtoMinutesObserved === null || p.lastRtoMinutesObserved > p.rtoMinutes
    ).length;
    
    return {
      totalPlans: allPlans.length,
      rpoViolations,
      rtoViolations
    };
  }
  
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    jobs: {
      osintScans: { enabled: boolean; intervalMs: number };
      slaMonitoring: { enabled: boolean; intervalMs: number };
      rpoRtoChecks: { enabled: boolean; intervalMs: number };
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
        rpoRtoChecks: {
          enabled: this.config.enableRpoRtoChecks || false,
          intervalMs: this.config.rpoRtoCheckInterval || 0,
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
  rpoRtoCheckInterval: parseInt(process.env.RPO_RTO_CHECK_INTERVAL || "86400000"),
  enableOsintScans: process.env.ENABLE_OSINT_SCANS !== "false",
  enableSlaMonitoring: process.env.ENABLE_SLA_MONITORING !== "false",
  enableRpoRtoChecks: process.env.ENABLE_RPO_RTO_CHECKS !== "false",
});

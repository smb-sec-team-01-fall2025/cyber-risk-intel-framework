import { db } from "./db";
import { 
  drPlans, backupSets, restoreTests, resilienceFindings, assets,
  insertResilienceFindingSchema,
  type DrPlan, type BackupSet, type RestoreTest
} from "@shared/schema";
import { eq, and, gte, desc, sql, count, avg } from "drizzle-orm";
import OpenAI from "openai";
import { nanoid } from "nanoid";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface ResilienceAnalysisResult {
  analyzed: number;
  findingsCreated: number;
  aiRunId: string;
}

interface RecoverySummary {
  totalDrPlans: number;
  rpoCompliancePercent: number;
  rtoCompliancePercent: number;
  openFindingsBySeverity: Record<number, number>;
  recentBackupsCount: number;
  recentRestoreTestsCount: number;
  averageResilienceScore: number;
}

export class ResilienceAgent {
  
  async runAnalysis(assetId?: string): Promise<ResilienceAnalysisResult> {
    const aiRunId = nanoid(12);
    let analyzed = 0;
    let findingsCreated = 0;

    // Get DR plans to analyze (either for specific asset or all)
    const plansQuery = assetId
      ? await db.query.drPlans.findMany({
          where: eq(drPlans.assetId, assetId),
          with: { asset: true }
        })
      : await db.query.drPlans.findMany({ with: { asset: true } });

    for (const plan of plansQuery) {
      try {
        const findings = await this.analyzeDrPlan(plan, aiRunId);
        findingsCreated += findings.length;
        analyzed++;
      } catch (error) {
        console.error(`Error analyzing DR plan ${plan.id}:`, error);
      }
    }

    return { analyzed, findingsCreated, aiRunId };
  }

  private async analyzeDrPlan(plan: DrPlan & { asset: any }, aiRunId: string): Promise<string[]> {
    const now = new Date();
    const findings: string[] = [];

    // 1. Check RPO compliance - verify recent backup exists
    const rpoWindowStart = new Date(now.getTime() - plan.rpoMinutes * 60 * 1000);
    const recentBackups = await db.query.backupSets.findMany({
      where: and(
        eq(backupSets.drPlanId, plan.id),
        gte(backupSets.backupWindowEnd, rpoWindowStart)
      ),
      orderBy: [desc(backupSets.backupWindowEnd)],
      limit: 5
    });

    const successfulBackup = recentBackups.find(b => b.status === "success");
    const rpoViolation = !successfulBackup;
    const rpoBreached = recentBackups.some(b => b.rpoBreached);

    // 2. Check RTO compliance - verify restore tests meet targets
    const recentRestoreTests = await db.query.restoreTests.findMany({
      where: eq(restoreTests.drPlanId, plan.id),
      orderBy: [desc(restoreTests.startedAt)],
      limit: 5
    });

    const passedRestoreTest = recentRestoreTests.find(t => t.status === "passed");
    // RTO violation if: (1) no passing restore test, OR (2) duration is null/undefined, OR (3) duration exceeds target
    const rtoViolation = !passedRestoreTest || 
      passedRestoreTest.restoreDurationMinutes === null ||
      passedRestoreTest.restoreDurationMinutes === undefined ||
      passedRestoreTest.restoreDurationMinutes > plan.rtoMinutes;

    // 3. Check backup failures
    const failedBackups = recentBackups.filter(b => b.status === "failed");

    // 4. Check restore failures
    const failedRestoreTests = recentRestoreTests.filter(t => t.status === "failed");

    // 5. Build context for AI analysis
    const context = {
      assetName: plan.asset.name,
      assetType: plan.asset.type,
      criticality: plan.asset.criticality,
      rpoTarget: plan.rpoMinutes,
      rtoTarget: plan.rtoMinutes,
      backupFrequency: plan.backupFrequency,
      retentionDays: plan.retentionDays,
      status: plan.status,
      recentBackupsCount: recentBackups.length,
      successfulBackupsCount: recentBackups.filter(b => b.status === "success").length,
      failedBackupsCount: failedBackups.length,
      rpoViolation,
      rpoBreached,
      recentRestoreTestsCount: recentRestoreTests.length,
      passedRestoreTestsCount: recentRestoreTests.filter(t => t.status === "passed").length,
      failedRestoreTestsCount: failedRestoreTests.length,
      rtoViolation,
      lastBackupDate: recentBackups[0]?.backupWindowEnd,
      lastRestoreTestDate: recentRestoreTests[0]?.startedAt,
    };

    // 6. Calculate initial resilience score (0-100)
    let resilienceScore = 100;
    if (rpoViolation) resilienceScore -= 30;
    if (rpoBreached) resilienceScore -= 20;
    if (rtoViolation) resilienceScore -= 20;
    if (failedBackups.length > 0) resilienceScore -= 10 * Math.min(failedBackups.length, 3);
    if (failedRestoreTests.length > 0) resilienceScore -= 10 * Math.min(failedRestoreTests.length, 2);
    if (recentRestoreTests.length === 0) resilienceScore -= 15;
    resilienceScore = Math.max(0, resilienceScore);

    // 7. Use AI to generate resilience findings
    const prompt = `You are a disaster recovery and business continuity expert analyzing the resilience posture of an asset.

Asset: ${context.assetName} (${context.assetType}, Criticality: ${context.criticality})
DR Plan: RPO ${context.rpoTarget} minutes, RTO ${context.rtoTarget} minutes, Backup Frequency: ${context.backupFrequency}

Current State:
- Recent backups (last ${plan.rpoMinutes}min): ${context.recentBackupsCount} total, ${context.successfulBackupsCount} successful, ${context.failedBackupsCount} failed
- RPO violation: ${rpoViolation ? "YES - no successful backup within RPO window" : "NO"}
- RPO breached in recent backups: ${rpoBreached ? "YES" : "NO"}
- Recent restore tests: ${context.recentRestoreTestsCount} total, ${context.passedRestoreTestsCount} passed, ${context.failedRestoreTestsCount} failed
- RTO violation: ${rtoViolation ? "YES - restore time exceeds RTO target" : "NO"}
- Last backup: ${context.lastBackupDate ? new Date(context.lastBackupDate).toISOString() : "NONE"}
- Last restore test: ${context.lastRestoreTestDate ? new Date(context.lastRestoreTestDate).toISOString() : "NONE"}

Analyze this data and identify 0-5 critical resilience findings. For each finding, provide:
1. Finding type: one of [coverage_gap, rpo_violation, rto_violation, backup_failure, restore_failure, plan_outdated, compliance_risk]
2. Severity: 1-5 (5=critical, 1=low)
3. Title: Brief 5-10 word description
4. Description: 2-3 sentence analysis of the issue
5. Recommendation: Specific actionable remediation steps

Respond in JSON format:
{
  "findings": [
    {
      "type": "coverage_gap",
      "severity": 4,
      "title": "...",
      "description": "...",
      "recommendation": "..."
    }
  ]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
      const aiFindings = aiResponse.findings || [];

      // 8. Create resilience findings in database
      for (const finding of aiFindings) {
        try {
          const validationResult = insertResilienceFindingSchema.safeParse({
            assetId: plan.assetId,
            drPlanId: plan.id,
            findingType: finding.type,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            recommendation: finding.recommendation,
            status: "open",
            aiRunId,
          });

          if (validationResult.success) {
            await db.insert(resilienceFindings).values(validationResult.data);
            findings.push(finding.title);
          }
        } catch (error) {
          console.error("Error creating resilience finding:", error);
        }
      }

      // 9. Update DR plan with resilience score and last evaluated timestamp
      await db.update(drPlans)
        .set({
          lastResilienceScore: resilienceScore,
          lastEvaluatedAt: now,
          updatedAt: now,
        })
        .where(eq(drPlans.id, plan.id));

    } catch (error) {
      console.error("Error in AI resilience analysis:", error);
    }

    return findings;
  }

  async getSummary(): Promise<RecoverySummary> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total DR plans
    const [totalResult] = await db.select({ count: count() })
      .from(drPlans);
    const totalDrPlans = totalResult?.count || 0;

    // RPO compliance: plans with successful backup within RPO window
    const allPlans = await db.query.drPlans.findMany();
    let rpoCompliantCount = 0;
    let rtoCompliantCount = 0;

    for (const plan of allPlans) {
      // Check RPO compliance
      const rpoWindowStart = new Date(now.getTime() - plan.rpoMinutes * 60 * 1000);
      const recentBackup = await db.query.backupSets.findFirst({
        where: and(
          eq(backupSets.drPlanId, plan.id),
          gte(backupSets.backupWindowEnd, rpoWindowStart),
          eq(backupSets.status, "success")
        )
      });
      if (recentBackup) rpoCompliantCount++;

      // Check RTO compliance (has passed restore test meeting RTO target)
      const passedRestore = await db.query.restoreTests.findFirst({
        where: and(
          eq(restoreTests.drPlanId, plan.id),
          eq(restoreTests.status, "passed")
        )
      });
      // Only compliant if: (1) has a passed restore test AND (2) duration meets target
      if (passedRestore && 
          passedRestore.restoreDurationMinutes !== null &&
          passedRestore.restoreDurationMinutes !== undefined &&
          passedRestore.restoreDurationMinutes <= plan.rtoMinutes) {
        rtoCompliantCount++;
      }
    }

    const rpoCompliancePercent = totalDrPlans > 0 
      ? Math.round((rpoCompliantCount / totalDrPlans) * 100) 
      : 0;
    const rtoCompliancePercent = totalDrPlans > 0 
      ? Math.round((rtoCompliantCount / totalDrPlans) * 100) 
      : 0;

    // Open findings by severity
    const openFindings = await db.query.resilienceFindings.findMany({
      where: eq(resilienceFindings.status, "open")
    });
    
    const openFindingsBySeverity: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    openFindings.forEach(f => {
      openFindingsBySeverity[f.severity] = (openFindingsBySeverity[f.severity] || 0) + 1;
    });

    // Recent activity counts
    const [recentBackupsResult] = await db.select({ count: count() })
      .from(backupSets)
      .where(gte(backupSets.createdAt, last24Hours));
    const recentBackupsCount = recentBackupsResult?.count || 0;

    const [recentRestoreTestsResult] = await db.select({ count: count() })
      .from(restoreTests)
      .where(gte(restoreTests.startedAt, last24Hours));
    const recentRestoreTestsCount = recentRestoreTestsResult?.count || 0;

    // Average resilience score
    const [avgScoreResult] = await db.select({ 
      avgScore: avg(drPlans.lastResilienceScore) 
    }).from(drPlans);
    const averageResilienceScore = Math.round(Number(avgScoreResult?.avgScore) || 0);

    return {
      totalDrPlans,
      rpoCompliancePercent,
      rtoCompliancePercent,
      openFindingsBySeverity,
      recentBackupsCount,
      recentRestoreTestsCount,
      averageResilienceScore,
    };
  }
}

export const resilienceAgent = new ResilienceAgent();

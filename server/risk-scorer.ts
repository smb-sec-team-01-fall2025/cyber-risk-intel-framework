import { db } from "./db";
import { assets, intelEvents, assetIntelLinks } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export interface AssetRiskScore {
  assetId: string;
  assetName: string;
  assetCriticality: number;
  maxIntelSeverity: number;
  riskScore: number; // criticality * maxIntelSeverity
  recentIntelCount: number;
}

export class RiskScorer {
  /**
   * Calculate risk score for all assets based on linked intel events from last 7 days
   * Risk Score = Asset Criticality × Maximum Intel Severity (last 7 days)
   * Optimized: Single SQL query with aggregation instead of N+1 queries
   */
  async calculateAllAssetRisks(): Promise<AssetRiskScore[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Single query with left join and aggregation
    const results = await db
      .select({
        assetId: assets.id,
        assetName: assets.name,
        assetCriticality: assets.criticality,
        maxIntelSeverity: sql<number>`COALESCE(MAX(CASE WHEN ${intelEvents.createdAt} >= ${sevenDaysAgo} THEN ${intelEvents.severity} ELSE NULL END), 0)`,
        recentIntelCount: sql<number>`COUNT(CASE WHEN ${intelEvents.createdAt} >= ${sevenDaysAgo} THEN 1 ELSE NULL END)`,
      })
      .from(assets)
      .leftJoin(assetIntelLinks, eq(assets.id, assetIntelLinks.assetId))
      .leftJoin(intelEvents, eq(assetIntelLinks.intelId, intelEvents.id))
      .groupBy(assets.id, assets.name, assets.criticality);
    
    // Calculate risk scores
    const riskScores = results.map(row => ({
      assetId: row.assetId,
      assetName: row.assetName,
      assetCriticality: row.assetCriticality,
      maxIntelSeverity: row.maxIntelSeverity,
      riskScore: row.assetCriticality * row.maxIntelSeverity,
      recentIntelCount: row.recentIntelCount,
    }));
    
    // Sort by risk score descending
    return riskScores.sort((a, b) => b.riskScore - a.riskScore);
  }
  
  /**
   * Calculate and persist risk scores to the database
   * Updates the risk_score column on each asset
   */
  async calculateAndPersistRiskScores(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Single query with left join and aggregation
    const results = await db
      .select({
        assetId: assets.id,
        assetCriticality: assets.criticality,
        maxIntelSeverity: sql<number>`COALESCE(MAX(CASE WHEN ${intelEvents.createdAt} >= ${sevenDaysAgo} THEN ${intelEvents.severity} ELSE NULL END), 0)`,
      })
      .from(assets)
      .leftJoin(assetIntelLinks, eq(assets.id, assetIntelLinks.assetId))
      .leftJoin(intelEvents, eq(assetIntelLinks.intelId, intelEvents.id))
      .groupBy(assets.id, assets.criticality);
    
    // Update each asset's risk score
    for (const row of results) {
      const riskScore = row.assetCriticality * row.maxIntelSeverity;
      await db
        .update(assets)
        .set({ riskScore })
        .where(eq(assets.id, row.assetId));
    }
    
    console.log(`[RiskScorer] Updated risk scores for ${results.length} assets`);
  }
  
  /**
   * Calculate risk score for a single asset
   */
  async calculateAssetRisk(assetId: string): Promise<AssetRiskScore | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const asset = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);
    
    if (!asset[0]) {
      return null;
    }
    
    // Get all intel events linked to this asset from last 7 days
    const linkedIntel = await db
      .select({
        severity: intelEvents.severity,
      })
      .from(assetIntelLinks)
      .innerJoin(intelEvents, eq(assetIntelLinks.intelId, intelEvents.id))
      .where(
        and(
          eq(assetIntelLinks.assetId, assetId),
          gte(intelEvents.createdAt, sevenDaysAgo)
        )
      );
    
    const maxSeverity = linkedIntel.length > 0
      ? Math.max(...linkedIntel.map(i => i.severity))
      : 0;
    
    const riskScore = asset[0].criticality * maxSeverity;
    
    return {
      assetId: asset[0].id,
      assetName: asset[0].name,
      assetCriticality: asset[0].criticality,
      maxIntelSeverity: maxSeverity,
      riskScore,
      recentIntelCount: linkedIntel.length,
    };
  }
}

export const riskScorer = new RiskScorer();

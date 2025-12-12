import { db } from "./db";
import { intelEvents, assets, assetIntelLinks } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { intelAnalyzer } from "./intel-analyzer";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

interface OsintResult {
  source: string;
  indicator: string;
  severity: number;
  raw: any;
}

// ============================================================================
// IP VALIDATION UTILITY
// ============================================================================

function isPublicIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  
  const [a, b, c, d] = parts;
  
  // Private IP ranges
  if (a === 10) return false; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 168) return false; // 192.168.0.0/16
  
  // Loopback
  if (a === 127) return false; // 127.0.0.0/8
  
  // Link-local
  if (a === 169 && b === 254) return false; // 169.254.0.0/16
  
  // Reserved/Special
  if (a === 0) return false; // 0.0.0.0/8
  if (a >= 224) return false; // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved)
  
  // Documentation/TEST-NET ranges (RFC 5737)
  if (a === 192 && b === 0 && c === 2) return false; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 198 && b === 51 && c === 100) return false; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return false; // 203.0.113.0/24 (TEST-NET-3)
  
  return true;
}

// ============================================================================
// RETRY UTILITY WITH EXPONENTIAL BACKOFF
// ============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        const backoffMs = Math.min(
          INITIAL_BACKOFF_MS * Math.pow(2, attempt),
          MAX_BACKOFF_MS
        );
        
        console.log(
          `[OSINT] Retry attempt ${attempt + 1}/${retries} after ${backoffMs}ms`
        );
        
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

// ============================================================================
// OTX (AlienVault Open Threat Exchange) ADAPTER
// ============================================================================

export class OtxAdapter {
  private apiKey: string;
  private baseUrl = "https://otx.alienvault.com/api/v1";
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OTX_API_KEY || "";
  }
  
  async queryIndicator(indicator: string): Promise<OsintResult | null> {
    if (!this.apiKey) {
      console.warn("[OTX] No API key configured");
      return null;
    }
    
    return withRetry(async () => {
      const response = await fetch(
        `${this.baseUrl}/indicators/IPv4/${indicator}/general`,
        {
          headers: {
            "X-OTX-API-KEY": this.apiKey,
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        throw new Error(`OTX API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const severity = data.pulse_info?.count > 10 ? 4 : data.pulse_info?.count > 0 ? 3 : 1;
      
      return {
        source: "otx",
        indicator,
        severity,
        raw: data,
      };
    });
  }
  
  async scanAssets(): Promise<OsintResult[]> {
    const allAssets = await db.select().from(assets).where(sql`${assets.ip} IS NOT NULL`);
    
    const results: OsintResult[] = [];
    let skippedPrivate = 0;
    
    for (const asset of allAssets) {
      if (!asset.ip) continue;
      
      // OTX only works with public IPs
      if (!isPublicIP(asset.ip)) {
        skippedPrivate++;
        continue;
      }
      
      try {
        const result = await this.queryIndicator(asset.ip);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`[OTX] Error scanning ${asset.ip}:`, error);
      }
    }
    
    if (skippedPrivate > 0) {
      console.log(`[OTX] Skipped ${skippedPrivate} private/reserved IPs (OTX only scans public IPs)`);
    }
    
    return results;
  }
}

// ============================================================================
// SHODAN ADAPTER
// ============================================================================

export class ShodanAdapter {
  private apiKey: string;
  private baseUrl = "https://api.shodan.io";
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SHODAN_API_KEY || "";
  }
  
  async queryHost(ip: string): Promise<OsintResult | null> {
    if (!this.apiKey) {
      console.warn("[Shodan] No API key configured");
      return null;
    }
    
    return withRetry(async () => {
      const response = await fetch(
        `${this.baseUrl}/shodan/host/${ip}?key=${this.apiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Shodan API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const hasVulns = data.vulns && Object.keys(data.vulns).length > 0;
      const openPorts = data.ports?.length || 0;
      const severity = hasVulns ? 5 : openPorts > 5 ? 3 : openPorts > 0 ? 2 : 1;
      
      return {
        source: "shodan",
        indicator: ip,
        severity,
        raw: data,
      };
    });
  }
  
  async scanAssets(): Promise<OsintResult[]> {
    const allAssets = await db.select().from(assets).where(sql`${assets.ip} IS NOT NULL`);
    
    const results: OsintResult[] = [];
    let skippedPrivate = 0;
    
    for (const asset of allAssets) {
      if (!asset.ip) continue;
      
      // Shodan only works with public IPs
      if (!isPublicIP(asset.ip)) {
        skippedPrivate++;
        continue;
      }
      
      try {
        const result = await this.queryHost(asset.ip);
        if (result) {
          results.push(result);
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Shodan] Error scanning ${asset.ip}:`, error);
      }
    }
    
    if (skippedPrivate > 0) {
      console.log(`[Shodan] Skipped ${skippedPrivate} private/reserved IPs (Shodan only scans public IPs)`);
    }
    
    return results;
  }
}

// ============================================================================
// ABUSEIPDB ADAPTER
// ============================================================================

export class AbuseIpDbAdapter {
  private apiKey: string;
  private baseUrl = "https://api.abuseipdb.com/api/v2";
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ABUSEIPDB_API_KEY || "";
  }
  
  async checkIp(ip: string): Promise<OsintResult | null> {
    if (!this.apiKey) {
      console.warn("[AbuseIPDB] No API key configured");
      return null;
    }
    
    return withRetry(async () => {
      const response = await fetch(
        `${this.baseUrl}/check?ipAddress=${ip}&maxAgeInDays=90`,
        {
          headers: {
            Key: this.apiKey,
            Accept: "application/json",
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        throw new Error(`AbuseIPDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const abuseScore = data.data?.abuseConfidenceScore || 0;
      const severity = abuseScore > 75 ? 5 : abuseScore > 50 ? 4 : abuseScore > 25 ? 3 : abuseScore > 0 ? 2 : 1;
      
      return {
        source: "abuseipdb",
        indicator: ip,
        severity,
        raw: data,
      };
    });
  }
  
  async scanAssets(): Promise<OsintResult[]> {
    const allAssets = await db.select().from(assets).where(sql`${assets.ip} IS NOT NULL`);
    
    const results: OsintResult[] = [];
    
    for (const asset of allAssets) {
      if (!asset.ip) continue;
      
      try {
        const result = await this.checkIp(asset.ip);
        if (result) {
          results.push(result);
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[AbuseIPDB] Error scanning ${asset.ip}:`, error);
      }
    }
    
    return results;
  }
}

// ============================================================================
// OSINT ORCHESTRATOR
// ============================================================================

export class OsintOrchestrator {
  private otx: OtxAdapter;
  private shodan: ShodanAdapter;
  private abuseIpDb: AbuseIpDbAdapter;
  
  constructor() {
    this.otx = new OtxAdapter();
    this.shodan = new ShodanAdapter();
    this.abuseIpDb = new AbuseIpDbAdapter();
  }
  
  async runFullScan(): Promise<{
    totalScanned: number;
    totalFindings: number;
    newIntelEvents: number;
    newLinks: number;
  }> {
    console.log("[OSINT] Starting full scan...");
    
    const allResults: OsintResult[] = [];
    
    try {
      const otxResults = await this.otx.scanAssets();
      allResults.push(...otxResults);
      console.log(`[OSINT] OTX scan complete: ${otxResults.length} results`);
    } catch (error) {
      console.error("[OSINT] OTX scan failed:", error);
    }
    
    try {
      const shodanResults = await this.shodan.scanAssets();
      allResults.push(...shodanResults);
      console.log(`[OSINT] Shodan scan complete: ${shodanResults.length} results`);
    } catch (error) {
      console.error("[OSINT] Shodan scan failed:", error);
    }
    
    try {
      const abuseIpDbResults = await this.abuseIpDb.scanAssets();
      allResults.push(...abuseIpDbResults);
      console.log(`[OSINT] AbuseIPDB scan complete: ${abuseIpDbResults.length} results`);
    } catch (error) {
      console.error("[OSINT] AbuseIPDB scan failed:", error);
    }
    
    let newIntelEvents = 0;
    let newLinks = 0;
    
    for (const result of allResults) {
      try {
        // Use AI to analyze raw intel data and generate severity + description
        const analysis = await intelAnalyzer.analyzeIntelEvent(
          result.source,
          result.indicator,
          result.raw
        );
        
        console.log(
          `[OSINT] AI Analysis for ${result.indicator}: Severity ${analysis.severity}/5 - ${analysis.description.slice(0, 60)}...`
        );
        
        const [intelEvent] = await db
          .insert(intelEvents)
          .values({
            source: result.source as any,
            indicator: result.indicator,
            severity: analysis.severity, // AI-generated severity
            description: analysis.description, // AI-generated description
            raw: result.raw,
          })
          .onConflictDoNothing()
          .returning();
        
        if (intelEvent) {
          newIntelEvents++;
          
          const matchingAssets = await db
            .select()
            .from(assets)
            .where(eq(assets.ip, result.indicator));
          
          for (const asset of matchingAssets) {
            await db
              .insert(assetIntelLinks)
              .values({
                assetId: asset.id,
                intelId: intelEvent.id,
                matchType: "ip",
              })
              .onConflictDoNothing();
            
            newLinks++;
          }
        }
      } catch (error) {
        console.error("[OSINT] Error persisting result:", error);
      }
    }
    
    console.log(`[OSINT] Scan complete. New intel events: ${newIntelEvents}, New links: ${newLinks}`);
    
    return {
      totalScanned: allResults.length,
      totalFindings: allResults.length,
      newIntelEvents,
      newLinks,
    };
  }
  
  async queryIndicator(
    indicator: string
  ): Promise<{ otx?: OsintResult; shodan?: OsintResult; abuseIpDb?: OsintResult }> {
    const results: any = {};
    
    try {
      results.otx = await this.otx.queryIndicator(indicator);
    } catch (error) {
      console.error("[OSINT] OTX query failed:", error);
    }
    
    try {
      results.shodan = await this.shodan.queryHost(indicator);
    } catch (error) {
      console.error("[OSINT] Shodan query failed:", error);
    }
    
    try {
      results.abuseIpDb = await this.abuseIpDb.checkIp(indicator);
    } catch (error) {
      console.error("[OSINT] AbuseIPDB query failed:", error);
    }
    
    return results;
  }
}

export const osintOrchestrator = new OsintOrchestrator();

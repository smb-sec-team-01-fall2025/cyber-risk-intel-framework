import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const APP_VERSION = "1.0.0-rc1";

const ALLOWED_ORIGINS = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : undefined,
  process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : undefined,
  "http://localhost:5000",
  "http://0.0.0.0:5000",
].filter(Boolean) as string[];

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "";
  const aiDomain = aiBaseUrl ? new URL(aiBaseUrl).origin : "";
  
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' wss: ws: ${aiDomain}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  
  res.setHeader("Content-Security-Policy", cspDirectives);
  
  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  if (origin && (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === "development")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
  res.setHeader("Access-Control-Max-Age", "86400");
  
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"] as string || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_ENTRIES = 10000;
  
  constructor(cleanupIntervalMs: number = 60000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }
  
  get(key: string): { count: number; resetTime: number } | undefined {
    return this.store.get(key);
  }
  
  set(key: string, value: { count: number; resetTime: number }): void {
    if (this.store.size >= this.MAX_ENTRIES) {
      this.evictOldest();
    }
    this.store.set(key, value);
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
  
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < oldestTime) {
        oldestTime = value.resetTime;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
  
  get size(): number {
    return this.store.size;
  }
  
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

const rateLimitStore = new RateLimitStore(60000);

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimiter(options: RateLimitOptions = {}) {
  const { 
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown"
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
    }
    
    entry.count++;
    
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());
    
    if (entry.count > maxRequests) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        type: "rate_limit_exceeded",
        ip: key,
        request_id: req.requestId,
        path: req.path
      }));
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    next();
  };
}

export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

export function healthEndpoints(app: any) {
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: APP_VERSION
    });
  });
  
  app.get("/version", (req: Request, res: Response) => {
    res.json({
      version: APP_VERSION,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      buildTime: process.env.BUILD_TIME || new Date().toISOString()
    });
  });
  
  app.get("/metrics", (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    res.json({
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      rateLimitEntries: rateLimitStore.size
    });
  });
}

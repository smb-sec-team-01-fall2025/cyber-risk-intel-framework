import type { Request, Response, NextFunction } from "express";

const SENSITIVE_KEYS = [
  "password", "token", "secret", "apikey", "api_key", "authorization",
  "credit_card", "ssn", "social_security", "private_key", "session",
  "cookie", "csrf", "jwt"
];

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /sk-[a-zA-Z0-9]{24,}/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
];

export function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 10) return "[MAX_DEPTH]";
  
  if (typeof obj === "string") {
    let result = obj;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, "[REDACTED]");
    }
    return result;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }
  
  if (obj && typeof obj === "object") {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return redacted;
  }
  
  return obj;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  request_id?: string;
  method?: string;
  path?: string;
  status?: number;
  latency_ms?: number;
  user_id?: string;
  ip?: string;
  user_agent?: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: any;
}

export function formatLogEntry(entry: Partial<LogEntry>): string {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: entry.level || "info",
    message: entry.message || "",
    ...entry
  };
  
  return JSON.stringify(redactSensitiveData(logEntry));
}

export function structuredLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.requestId || "unknown";
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (req.path.startsWith("/api") || req.path === "/health" || req.path === "/version") {
      const logEntry = formatLogEntry({
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        request_id: requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latency_ms: duration,
        ip: req.ip || req.socket.remoteAddress,
        user_agent: req.headers["user-agent"]?.substring(0, 100),
        message: `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      });
      
      console.log(logEntry);
    }
  });
  
  next();
}

export function logError(error: Error, context?: Record<string, any>) {
  const logEntry = formatLogEntry({
    level: "error",
    message: error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  });
  
  console.error(logEntry);
}

export function logInfo(message: string, context?: Record<string, any>) {
  console.log(formatLogEntry({ level: "info", message, ...context }));
}

export function logWarn(message: string, context?: Record<string, any>) {
  console.warn(formatLogEntry({ level: "warn", message, ...context }));
}

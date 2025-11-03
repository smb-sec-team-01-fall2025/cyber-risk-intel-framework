import { db } from './db';
import { incidents, detections, assets, riskItems } from '@shared/schema';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// ============================================================================
// ALERT TYPES & CONFIGURATION
// ============================================================================

export interface AlertConfig {
  email?: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    from?: string;
    to?: string[];
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    headers?: Record<string, string>;
  };
}

export interface AlertContext {
  type: 'incident' | 'detection' | 'risk' | 'sla_breach';
  severity: 'P1' | 'P2' | 'P3' | 'P4' | '1' | '2' | '3' | '4' | '5';
  title: string;
  description: string;
  affectedAssets?: string[];
  metadata?: any;
  timestamp: Date;
}

// ============================================================================
// EMAIL ALERT HANDLER
// ============================================================================

export class EmailAlertHandler {
  private config: AlertConfig['email'];
  private transporter: nodemailer.Transporter | null = null;
  private maxRetries = 3;
  private verified = false;

  constructor(config?: AlertConfig['email']) {
    this.config = config || {
      enabled: Boolean(process.env.SMTP_HOST),
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      from: process.env.ALERT_FROM_EMAIL || 'alerts@security.local',
      to: process.env.ALERT_TO_EMAILS?.split(',') || [],
    };

    if (this.config.enabled && this.config.smtpHost) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.config.smtpHost,
          port: this.config.smtpPort || 587,
          secure: (this.config.smtpPort || 587) === 465,
          auth:
            this.config.smtpUser && this.config.smtpPass
              ? {
                  user: this.config.smtpUser,
                  pass: this.config.smtpPass,
                }
              : undefined,
        });

        console.log('[Alert] SMTP transporter created successfully');

        this.transporter
          .verify()
          .then((success) => {
            if (success) {
              console.log('[Alert] SMTP connection verified successfully');
              this.verified = true;
            }
          })
          .catch((error) => {
            console.error('[Alert] SMTP verification failed:', error);
            console.warn(
              '[Alert] Email alerts may not work correctly - please check SMTP configuration'
            );
            this.verified = false;
          });
      } catch (error) {
        console.error('[Alert] Failed to create SMTP transporter:', error);
      }
    }
  }

  async sendAlert(alert: AlertContext): Promise<boolean> {
    if (!this.config?.enabled) {
      console.log('[Alert] Email alerts disabled');
      return false;
    }

    if (!this.config.to || this.config.to.length === 0) {
      console.warn('[Alert] No email recipients configured');
      return false;
    }

    if (!this.transporter) {
      console.warn(
        '[Alert] SMTP transporter not configured, cannot send email'
      );
      console.log(`[Alert] Would send email to ${this.config.to.join(', ')}`);
      return false;
    }

    const subject = this.generateSubject(alert);
    const body = this.generateEmailBody(alert);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: this.config.from,
          to: this.config.to.join(', '),
          subject,
          text: body,
        });

        console.log(`[Alert] Email sent successfully: ${info.messageId}`);
        console.log(`[Alert] Recipients: ${this.config.to.join(', ')}`);
        console.log(`[Alert] Subject: ${subject}`);

        return true;
      } catch (error) {
        console.error(
          `[Alert] Email send attempt ${attempt + 1}/${
            this.maxRetries
          } failed:`,
          error
        );

        if (attempt < this.maxRetries - 1) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`[Alert] Retrying email send in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    console.error('[Alert] Email send failed after all retries');
    return false;
  }

  private generateSubject(alert: AlertContext): string {
    const severityLabel = this.getSeverityLabel(alert.severity);
    return `[${severityLabel}] ${alert.type.toUpperCase()}: ${alert.title}`;
  }

  private generateEmailBody(alert: AlertContext): string {
    return `
Security Alert Notification
============================

Type: ${alert.type.toUpperCase()}
Severity: ${this.getSeverityLabel(alert.severity)}
Title: ${alert.title}
Timestamp: ${alert.timestamp.toISOString()}

Description:
${alert.description}

${
  alert.affectedAssets && alert.affectedAssets.length > 0
    ? `
Affected Assets:
${alert.affectedAssets.map((a) => `  - ${a}`).join('\n')}
`
    : ''
}

${
  alert.metadata
    ? `
Additional Details:
${JSON.stringify(alert.metadata, null, 2)}
`
    : ''
}

---
This is an automated alert from the SMB Security Platform.
`;
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      P1: 'CRITICAL',
      P2: 'HIGH',
      P3: 'MEDIUM',
      P4: 'LOW',
      '5': 'CRITICAL',
      '4': 'HIGH',
      '3': 'MEDIUM',
      '2': 'LOW',
      '1': 'INFO',
    };
    return labels[severity] || 'UNKNOWN';
  }
}

// ============================================================================
// WEBHOOK ALERT HANDLER
// ============================================================================

export class WebhookAlertHandler {
  private config: AlertConfig['webhook'];
  private maxRetries = 3;

  constructor(config?: AlertConfig['webhook']) {
    this.config = config || {
      enabled: Boolean(process.env.ALERT_WEBHOOK_URL),
      url: process.env.ALERT_WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Alert-Source': 'SMB-Security-Platform',
      },
    };
  }

  async sendAlert(alert: AlertContext): Promise<boolean> {
    if (!this.config?.enabled || !this.config.url) {
      console.log('[Alert] Webhook alerts disabled or not configured');
      return false;
    }

    const payload = this.buildPayload(alert);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: this.config.headers || {},
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(
            `[Alert] Webhook sent successfully to ${this.config.url}`
          );
          return true;
        }

        console.warn(
          `[Alert] Webhook failed with status ${response.status}, attempt ${
            attempt + 1
          }/${this.maxRetries}`
        );

        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      } catch (error) {
        console.error(
          `[Alert] Webhook error on attempt ${attempt + 1}:`,
          error
        );

        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    console.error('[Alert] Webhook failed after all retries');
    return false;
  }

  private buildPayload(alert: AlertContext): any {
    return {
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      affected_assets: alert.affectedAssets || [],
      metadata: alert.metadata || {},
      timestamp: alert.timestamp.toISOString(),
      source: 'smb-security-platform',
    };
  }
}

// ============================================================================
// ALERT MANAGER (ORCHESTRATES EMAIL + WEBHOOK)
// ============================================================================

export class AlertManager {
  private emailHandler: EmailAlertHandler;
  private webhookHandler: WebhookAlertHandler;

  constructor(config?: AlertConfig) {
    this.emailHandler = new EmailAlertHandler(config?.email);
    this.webhookHandler = new WebhookAlertHandler(config?.webhook);
  }

  async sendAlert(alert: AlertContext): Promise<void> {
    console.log(`[Alert] Sending ${alert.type} alert: ${alert.title}`);

    const results = await Promise.allSettled([
      this.emailHandler.sendAlert(alert),
      this.webhookHandler.sendAlert(alert),
    ]);

    const emailResult = results[0];
    const webhookResult = results[1];

    if (emailResult.status === 'fulfilled' && emailResult.value) {
      console.log('[Alert] Email sent successfully');
    }

    if (webhookResult.status === 'fulfilled' && webhookResult.value) {
      console.log('[Alert] Webhook sent successfully');
    }
  }

  async alertOnHighSeverityDetection(detectionId: string): Promise<void> {
    try {
      const [detection] = await db
        .select()
        .from(detections)
        .where(eq(detections.id, detectionId));

      if (!detection || detection.severity < 4) {
        return;
      }

      let assetName = 'Unknown';
      if (detection.assetId) {
        const [asset] = await db
          .select()
          .from(assets)
          .where(eq(assets.id, detection.assetId));

        if (asset) {
          assetName = asset.name;
        }
      }

      await this.sendAlert({
        type: 'detection',
        severity: detection.severity.toString() as any,
        title: `High-severity detection: ${detection.indicator}`,
        description: `Source: ${detection.source}, Confidence: ${detection.confidence}%`,
        affectedAssets: [assetName],
        metadata: {
          indicator: detection.indicator,
          ttp: detection.ttp,
          hitCount: detection.hitCount,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Alert] Error sending detection alert:', error);
    }
  }

  async alertOnIncidentCreated(incidentId: string): Promise<void> {
    try {
      const [incident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, incidentId));

      if (!incident) {
        return;
      }

      const affectedAssets: string[] = [];
      if (incident.primaryAssetId) {
        const [asset] = await db
          .select()
          .from(assets)
          .where(eq(assets.id, incident.primaryAssetId));

        if (asset) {
          affectedAssets.push(asset.name);
        }
      }

      await this.sendAlert({
        type: 'incident',
        severity: incident.severity,
        title: `${incident.incidentNumber}: ${incident.title}`,
        description: incident.summary || 'New incident opened',
        affectedAssets,
        metadata: {
          incidentNumber: incident.incidentNumber,
          status: incident.status,
          owner: incident.owner,
          slaDueAt: incident.slaDueAt,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Alert] Error sending incident alert:', error);
    }
  }

  async alertOnSlaBreached(incidentId: string): Promise<void> {
    try {
      const [incident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, incidentId));

      if (!incident) {
        return;
      }

      await this.sendAlert({
        type: 'sla_breach',
        severity: incident.severity,
        title: `SLA BREACH: ${incident.incidentNumber}`,
        description: `Incident "${incident.title}" has exceeded its SLA deadline`,
        metadata: {
          incidentNumber: incident.incidentNumber,
          slaDueAt: incident.slaDueAt,
          owner: incident.owner,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Alert] Error sending SLA breach alert:', error);
    }
  }

  async alertOnHighRisk(riskItemId: string): Promise<void> {
    try {
      const [risk] = await db
        .select()
        .from(riskItems)
        .where(eq(riskItems.id, riskItemId));

      if (!risk || risk.score < 15) {
        return;
      }

      let assetName = 'Unknown';
      if (risk.assetId) {
        const [asset] = await db
          .select()
          .from(assets)
          .where(eq(assets.id, risk.assetId));

        if (asset) {
          assetName = asset.name;
        }
      }

      await this.sendAlert({
        type: 'risk',
        severity: risk.score > 20 ? 'P1' : risk.score > 15 ? 'P2' : 'P3',
        title: `High-risk item identified: ${risk.title}`,
        description: `Risk Score: ${risk.score} (Likelihood: ${risk.likelihood}, Impact: ${risk.impact})`,
        affectedAssets: [assetName],
        metadata: {
          likelihood: risk.likelihood,
          impact: risk.impact,
          treatment: risk.treatment,
          owner: risk.owner,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Alert] Error sending risk alert:', error);
    }
  }
}

export const alertManager = new AlertManager();

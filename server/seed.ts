import { db } from "./db";
import { 
  assets, 
  intelEvents, 
  detections, 
  incidents, 
  controls, 
  riskItems,
  assetIntelLinks 
} from "@shared/schema";

async function seed() {
  console.log("[Seed] Starting database seeding...");

  try {
    // Sample Assets
    console.log("[Seed] Creating assets...");
    const assetRecords = await db.insert(assets).values([
      {
        name: "Production Web Server",
        type: "HW",
        ip: "203.0.113.10",
        hostname: "web-prod-01.company.com",
        owner: "IT Operations",
        dataSensitivity: "High",
        criticality: 5,
        businessUnit: "Engineering",
        description: "Primary production web server handling customer traffic",
      },
      {
        name: "Customer Database",
        type: "Data",
        ip: "203.0.113.25",
        hostname: "db-prod-01.company.com",
        owner: "Database Admin",
        dataSensitivity: "High",
        criticality: 5,
        businessUnit: "Engineering",
        description: "PostgreSQL database containing customer PII and payment data",
      },
      {
        name: "Internal File Server",
        type: "HW",
        ip: "10.0.5.100",
        hostname: "fileserver-01.internal",
        owner: "IT Operations",
        dataSensitivity: "Moderate",
        criticality: 3,
        businessUnit: "Operations",
        description: "Internal file sharing server for employees",
      },
      {
        name: "API Gateway",
        type: "Service",
        ip: "203.0.113.50",
        hostname: "api-gateway-01.company.com",
        owner: "DevOps Team",
        dataSensitivity: "High",
        criticality: 4,
        businessUnit: "Engineering",
        description: "Main API gateway handling all external API requests",
      },
      {
        name: "Development Workstation",
        type: "HW",
        ip: "10.0.10.55",
        hostname: "dev-ws-john.internal",
        owner: "John Doe",
        dataSensitivity: "Low",
        criticality: 2,
        businessUnit: "Engineering",
        description: "Developer workstation with access to source code repositories",
      },
    ]).returning();

    console.log(`[Seed] Created ${assetRecords.length} assets`);

    // Sample Intel Events
    console.log("[Seed] Creating intel events...");
    const intelRecords = await db.insert(intelEvents).values([
      {
        source: "otx",
        indicator: "203.0.113.10",
        indicatorType: "IPv4",
        severity: 4,
        raw: {
          pulseCount: 3,
          tags: ["malware", "botnet", "c2"],
          country: "CN",
          asn: "AS4134"
        },
      },
      {
        source: "shodan",
        indicator: "203.0.113.10",
        indicatorType: "IPv4",
        severity: 3,
        raw: {
          ports: [22, 80, 443, 3306],
          services: ["ssh", "http", "https", "mysql"],
          vulns: ["CVE-2023-12345"],
          os: "Ubuntu"
        },
      },
      {
        source: "abuseipdb",
        indicator: "198.51.100.45",
        indicatorType: "IPv4",
        severity: 5,
        raw: {
          abuseConfidence: 95,
          totalReports: 45,
          categories: ["port-scan", "brute-force"],
          country: "RU"
        },
      },
      {
        source: "otx",
        indicator: "malicious-domain.example",
        indicatorType: "domain",
        severity: 4,
        raw: {
          pulseCount: 12,
          tags: ["phishing", "credential-theft"],
          threatType: "malware"
        },
      },
    ]).returning();

    console.log(`[Seed] Created ${intelRecords.length} intel events`);

    // Link intel to assets
    console.log("[Seed] Linking intel to assets...");
    await db.insert(assetIntelLinks).values([
      {
        assetId: assetRecords[0].id,
        intelId: intelRecords[0].id,
        matchType: "ip",
      },
      {
        assetId: assetRecords[0].id,
        intelId: intelRecords[1].id,
        matchType: "ip",
      },
    ]);

    // Sample Detections
    console.log("[Seed] Creating detections...");
    const detectionRecords = await db.insert(detections).values([
      {
        source: "otx",
        indicator: "203.0.113.10",
        assetId: assetRecords[0].id,
        severity: 4,
        confidence: 85,
        ttp: ["T1071", "T1095"],
        rawRef: {
          correlation: "IP found in 3 threat intelligence feeds",
          evidence: ["OTX pulse match", "Shodan scan detection", "Known C2 behavior"]
        },
        hitCount: 3,
        firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
      },
      {
        source: "shodan",
        indicator: "Suspicious outbound connection",
        assetId: assetRecords[1].id,
        severity: 3,
        confidence: 70,
        ttp: ["T1041"],
        rawRef: {
          destination: "unknown-server.example",
          port: 4444,
          dataVolume: "15 MB"
        },
        hitCount: 1,
        firstSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        source: "abuseipdb",
        indicator: "CVE-2023-12345",
        assetId: assetRecords[2].id,
        severity: 5,
        confidence: 100,
        ttp: ["T1190"],
        rawRef: {
          cve: "CVE-2023-12345",
          cvss: 9.8,
          description: "Critical RCE vulnerability in file server software"
        },
        hitCount: 1,
        firstSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ]).returning();

    console.log(`[Seed] Created ${detectionRecords.length} detections`);

    // Sample Incidents
    console.log("[Seed] Creating incidents...");
    const incidentRecords = await db.insert(incidents).values([
      {
        incidentNumber: "INC-2025-001",
        title: "Potential C2 Communication Detected",
        summary: "Production web server communicating with known malicious IP addresses identified in threat intelligence feeds.",
        severity: "P2",
        status: "Containment",
        owner: "Security Operations",
        primaryAssetId: assetRecords[0].id,
        detectionRefs: [detectionRecords[0].id],
        openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        slaDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        slaBreached: false,
      },
      {
        incidentNumber: "INC-2025-002",
        title: "Critical Vulnerability Identified",
        summary: "CVE-2023-12345 critical RCE vulnerability found on internal file server during vulnerability assessment.",
        severity: "P1",
        status: "Open",
        owner: "Vulnerability Management",
        primaryAssetId: assetRecords[2].id,
        detectionRefs: [detectionRecords[2].id],
        openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        slaDueAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
        slaBreached: false,
      },
      {
        incidentNumber: "INC-2025-003",
        title: "Unusual Data Exfiltration Attempt",
        summary: "Database server initiated suspicious outbound connection to unknown external server.",
        severity: "P3",
        status: "Closed",
        owner: "Security Operations",
        primaryAssetId: assetRecords[1].id,
        detectionRefs: [detectionRecords[1].id],
        openedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        slaDueAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        slaBreached: false,
        rootCause: "False positive - legitimate database backup to offsite location",
      },
    ]).returning();

    console.log(`[Seed] Created ${incidentRecords.length} incidents`);

    // Sample Controls (NIST 800-53 r5)
    console.log("[Seed] Creating controls...");
    const controlRecords = await db.insert(controls).values([
      {
        controlId: "AC-1",
        family: "AC",
        title: "Policy and Procedures",
        description: "Develop, document, and disseminate access control policy and procedures.",
        csfFunction: "Govern",
        implementationStatus: "Implemented",
        priority: 5,
        sopId: "SOP-AC-001",
      },
      {
        controlId: "AC-2",
        family: "AC",
        title: "Account Management",
        description: "Manage system accounts including creation, enabling, modification, review, and removal.",
        csfFunction: "Protect",
        implementationStatus: "Implemented",
        priority: 5,
        sopId: "SOP-AC-002",
      },
      {
        controlId: "CM-7",
        family: "CM",
        title: "Least Functionality",
        description: "Configure systems to provide only essential capabilities.",
        csfFunction: "Protect",
        implementationStatus: "In-Progress",
        priority: 4,
      },
      {
        controlId: "SI-4",
        family: "SI",
        title: "System Monitoring",
        description: "Monitor the system to detect attacks, unauthorized connections, and suspicious activity.",
        csfFunction: "Detect",
        implementationStatus: "Implemented",
        priority: 5,
        sopId: "SOP-SI-004",
      },
      {
        controlId: "IR-4",
        family: "IR",
        title: "Incident Handling",
        description: "Implement incident handling capability for security incidents.",
        csfFunction: "Respond",
        implementationStatus: "Implemented",
        priority: 5,
        sopId: "SOP-IR-004",
      },
      {
        controlId: "CP-2",
        family: "CP",
        title: "Contingency Plan",
        description: "Develop and maintain a contingency plan for emergency response, backup operations, and recovery.",
        csfFunction: "Recover",
        implementationStatus: "In-Progress",
        priority: 4,
      },
      {
        controlId: "RA-3",
        family: "RA",
        title: "Risk Assessment",
        description: "Conduct risk assessments to identify threats, vulnerabilities, likelihood, and impact.",
        csfFunction: "Identify",
        implementationStatus: "Implemented",
        priority: 5,
        sopId: "SOP-RA-003",
      },
      {
        controlId: "CA-2",
        family: "CA",
        title: "Control Assessments",
        description: "Develop and implement a control assessment plan.",
        csfFunction: "Govern",
        implementationStatus: "Proposed",
        priority: 3,
      },
    ]).returning();

    console.log(`[Seed] Created ${controlRecords.length} controls`);

    // Sample Risk Items
    console.log("[Seed] Creating risk items...");
    const riskRecords = await db.insert(riskItems).values([
      {
        title: "Unpatched Critical Vulnerability on File Server",
        description: "CVE-2023-12345 RCE vulnerability discovered on internal file server poses significant risk of exploitation.",
        assetId: assetRecords[2].id,
        likelihood: 4,
        impact: 5,
        score: 20,
        status: "Open",
        owner: "IT Security",
        treatment: "Apply security patch within 72 hours, implement network segmentation to limit exposure. Patch management process initiated, scheduled maintenance window approved.",
        residualRisk: 5,
      },
      {
        title: "Production Server Communicating with Malicious IPs",
        description: "Web server found communicating with known C2 infrastructure, potential compromise.",
        assetId: assetRecords[0].id,
        likelihood: 4,
        impact: 4,
        score: 16,
        status: "In-Progress",
        owner: "Security Operations",
        treatment: "Isolate server, analyze traffic logs, scan for malware, rebuild if compromised. Incident response team engaged, forensic analysis in progress.",
        residualRisk: 8,
      },
      {
        title: "Lack of Encryption for Sensitive Data in Transit",
        description: "Internal communications between application and database not encrypted, exposing sensitive customer data.",
        assetId: assetRecords[1].id,
        likelihood: 3,
        impact: 4,
        score: 12,
        status: "Accepted",
        owner: "Database Admin",
        treatment: "Implement TLS encryption for all database connections. Scheduled for Q2 infrastructure upgrade project.",
        residualRisk: 3,
      },
      {
        title: "Insufficient Access Controls on Development Workstations",
        description: "Developer workstations have excessive privileges and access to production systems.",
        assetId: assetRecords[4].id,
        likelihood: 3,
        impact: 3,
        score: 9,
        status: "Open",
        owner: "IT Operations",
        treatment: "Implement least privilege access model, separate dev and prod environments. IAM policy review scheduled for next quarter.",
        residualRisk: null,
      },
    ]).returning();

    console.log(`[Seed] Created ${riskRecords.length} risk items`);

    console.log("[Seed] ✓ Database seeding completed successfully!");
    console.log(`[Seed] Summary: ${assetRecords.length} assets, ${intelRecords.length} intel events, ${detectionRecords.length} detections, ${incidentRecords.length} incidents, ${controlRecords.length} controls, ${riskRecords.length} risks`);

  } catch (error) {
    console.error("[Seed] Error during seeding:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log("[Seed] Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Seed] Failed:", error);
      process.exit(1);
    });
}

export { seed };

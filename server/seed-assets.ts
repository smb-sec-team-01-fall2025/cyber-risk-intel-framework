import { db } from "./db";
import { assets } from "../shared/schema";

async function seedAssets() {
  console.log("Seeding assets...");
  
  const assetData = [
    // Hardware Assets (HW)
    {
      name: "Primary Web Server",
      type: "HW" as const,
      criticality: 5,
      ip: "192.168.1.10",
      hostname: "web-prod-01.company.local",
      description: "Primary production web server hosting customer-facing applications",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    {
      name: "Database Server - Primary",
      type: "HW" as const,
      criticality: 5,
      ip: "192.168.1.20",
      hostname: "db-prod-01.company.local",
      description: "PostgreSQL production database server",
      businessUnit: "IT Operations",
      owner: "Database Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "File Server",
      type: "HW" as const,
      criticality: 4,
      ip: "192.168.1.30",
      hostname: "files-01.company.local",
      description: "Network attached storage for company documents and backups",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    {
      name: "Firewall - Edge",
      type: "HW" as const,
      criticality: 5,
      ip: "203.0.113.1",
      hostname: "fw-edge-01.company.local",
      description: "Perimeter firewall protecting external network boundary",
      businessUnit: "IT Security",
      owner: "Security Team",
    },
    {
      name: "Email Server",
      type: "HW" as const,
      criticality: 4,
      ip: "192.168.1.40",
      hostname: "mail-01.company.local",
      description: "Corporate email server (Exchange)",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    
    // Software Assets (SW)
    {
      name: "CRM Application",
      type: "SW" as const,
      criticality: 4,
      ip: null,
      hostname: "crm.company.com",
      description: "Salesforce CRM system for customer relationship management",
      businessUnit: "Sales",
      owner: "Sales Operations",
      dataSensitivity: "High" as const,
    },
    {
      name: "HR Management System",
      type: "SW" as const,
      criticality: 3,
      ip: null,
      hostname: "hr.company.com",
      description: "BambooHR for employee records and payroll",
      businessUnit: "Human Resources",
      owner: "HR Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Project Management Tool",
      type: "SW" as const,
      criticality: 3,
      ip: null,
      hostname: "jira.company.com",
      description: "Jira for project tracking and issue management",
      businessUnit: "Engineering",
      owner: "Engineering Team",
    },
    {
      name: "Accounting Software",
      type: "SW" as const,
      criticality: 5,
      ip: null,
      hostname: "quickbooks.company.local",
      description: "QuickBooks Enterprise for financial management",
      businessUnit: "Finance",
      owner: "Finance Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Backup Software",
      type: "SW" as const,
      criticality: 4,
      ip: "192.168.1.50",
      hostname: "backup-01.company.local",
      description: "Veeam Backup & Replication for data protection",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    
    // Data Assets
    {
      name: "Customer Database",
      type: "Data" as const,
      criticality: 5,
      ip: null,
      hostname: null,
      description: "Production customer data including PII, payment info, and transaction history",
      businessUnit: "Product",
      owner: "Data Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Employee Records",
      type: "Data" as const,
      criticality: 5,
      ip: null,
      hostname: null,
      description: "Personnel files, SSNs, salary information, performance reviews",
      businessUnit: "Human Resources",
      owner: "HR Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Financial Reports",
      type: "Data" as const,
      criticality: 4,
      ip: null,
      hostname: null,
      description: "Quarterly financials, tax documents, audit reports",
      businessUnit: "Finance",
      owner: "Finance Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Product Source Code",
      type: "Data" as const,
      criticality: 4,
      ip: null,
      hostname: null,
      description: "Proprietary application source code and intellectual property",
      businessUnit: "Engineering",
      owner: "Engineering Team",
      dataSensitivity: "High" as const,
    },
    {
      name: "Customer Support Tickets",
      type: "Data" as const,
      criticality: 3,
      ip: null,
      hostname: null,
      description: "Historical customer support interactions and resolutions",
      businessUnit: "Customer Support",
      owner: "Support Team",
      dataSensitivity: "Medium" as const,
    },
    
    // User Assets
    {
      name: "Domain Admin Account",
      type: "User" as const,
      criticality: 5,
      ip: null,
      hostname: null,
      description: "Active Directory domain administrator with full network privileges",
      businessUnit: "IT Operations",
      owner: "IT Admin",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "Database Admin Account",
      type: "User" as const,
      criticality: 5,
      ip: null,
      hostname: null,
      description: "PostgreSQL superuser account with full database access",
      businessUnit: "IT Operations",
      owner: "Database Team",
      dataSensitivity: "Critical" as const,
    },
    {
      name: "CEO Executive Account",
      type: "User" as const,
      criticality: 4,
      ip: null,
      hostname: null,
      description: "Executive email and system access for CEO",
      businessUnit: "Executive",
      owner: "IT Admin",
      dataSensitivity: "High" as const,
    },
    {
      name: "Finance Team Accounts",
      type: "User" as const,
      criticality: 4,
      ip: null,
      hostname: null,
      description: "Group of 5 finance department user accounts with access to financial systems",
      businessUnit: "Finance",
      owner: "Finance Manager",
      dataSensitivity: "High" as const,
    },
    {
      name: "Customer Service Accounts",
      type: "User" as const,
      criticality: 2,
      ip: null,
      hostname: null,
      description: "15 customer service representative accounts",
      businessUnit: "Customer Support",
      owner: "Support Manager",
      dataSensitivity: "Medium" as const,
    },
    
    // Service Assets
    {
      name: "VPN Service",
      type: "Service" as const,
      criticality: 4,
      ip: "203.0.113.5",
      hostname: "vpn.company.com",
      description: "Remote access VPN for employees working from home",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    {
      name: "DNS Service",
      type: "Service" as const,
      criticality: 5,
      ip: "192.168.1.53",
      hostname: "dns-01.company.local",
      description: "Internal DNS resolver for name resolution",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    {
      name: "Active Directory",
      type: "Service" as const,
      criticality: 5,
      ip: "192.168.1.60",
      hostname: "dc-01.company.local",
      description: "Primary domain controller for authentication and authorization",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
    {
      name: "API Gateway",
      type: "Service" as const,
      criticality: 4,
      ip: "203.0.113.10",
      hostname: "api.company.com",
      description: "RESTful API gateway for third-party integrations",
      businessUnit: "Engineering",
      owner: "Platform Team",
    },
    {
      name: "Monitoring Service",
      type: "Service" as const,
      criticality: 3,
      ip: "192.168.1.70",
      hostname: "monitor-01.company.local",
      description: "Nagios monitoring for infrastructure health checks",
      businessUnit: "IT Operations",
      owner: "Infrastructure Team",
    },
  ];
  
  let inserted = 0;
  for (const asset of assetData) {
    try {
      await db.insert(assets).values(asset);
      inserted++;
      console.log(`✓ Added: ${asset.name} (${asset.type})`);
    } catch (error) {
      console.error(`✗ Failed to add ${asset.name}:`, error);
    }
  }
  
  console.log(`\nSeeding complete! Added ${inserted}/${assetData.length} assets.`);
}

seedAssets()
  .then(() => {
    console.log("Asset seeding finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Asset seeding failed:", error);
    process.exit(1);
  });

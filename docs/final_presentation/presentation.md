# TEAM LEAD - Ben Blake

---

## Slide 1: Project Overview (Ben)

> "Good morning everyone. I'm Ben Blake, team lead for the project, and today we're presenting our AI-Augmented Cyber Risk and Threat Intelligence platform designed specifically for small and medium-sized businesses.
>
> Here's the problem we set out to solve: SMBs face the same sophisticated cyber threats as large enterprises, but they don't have the same resources. They can't afford dedicated security operations centers, expensive threat intelligence subscriptions, or teams of compliance specialists.
>
> Our solution is a comprehensive security platform that implements the NIST Cybersecurity Framework 2.0 - the industry standard for security program management. The framework defines six core functions: Identify your assets and risks, Protect them with controls, Detect threats when they occur, Respond to incidents effectively, Recover from disruptions, and Govern the entire program.
>
> What makes our platform different is the AI augmentation. We've built six specialized AI agents that automate tasks that would normally require expensive consultants or experienced analysts. The platform ingests open-source threat intelligence, correlates it with your assets, generates compliance documentation, and guides incident response - all automatically.
>
> Let me show you how this works in practice."

---

## Slide 2: Platform Architecture & Demo Introduction (Ben)

> "Before I show you the live demo, let me quickly walk through the architecture.
>
> On the frontend, we have a React application with Material Design principles - clean, professional, and intuitive for security analysts who need to make quick decisions.
>
> The backend runs on Express.js with six specialized AI agents - one for each CSF function. These agents use GPT-5 to analyze threats, generate documentation, and provide recommendations.
>
> We integrate with seven open-source intelligence feeds including Shodan for infrastructure scanning, AbuseIPDB for malicious IP reporting, VirusTotal for malware analysis, and more. All of this feeds into a PostgreSQL database that maintains a complete audit trail.
>
> Now let me show you the platform in action. I'll walk through three use cases: first, how we detect and respond to threats; second, how we implement security controls and track compliance; and third, how we manage governance.
>
> [BEGIN LIVE DEMO - 13 minutes using DEMO_SCRIPT.md]"

---

### Post-Demo Transition Script (30 seconds):

> "That concludes the live demonstration of our platform. You've seen how the system handles threat detection, incident response, compliance tracking, and governance reporting.
>
> Now I'd like to hand off to my team members who will dive deeper into the technical implementation of each component. First up is Tina, who led our Data and Detection capabilities."

---

# DATA/DETECTION - Tina

---

## Slide 3: OSINT Integration Architecture (Tina)

> "Hi everyone, I'm Tinana, and I was responsible for our data ingestion and detection capabilities.
>
> One of the core challenges in threat intelligence is that every data source has a different format, different rate limits, and different reliability characteristics. A malicious IP report from AbuseIPDB looks completely different from a Shodan scan result or a VirusTotal file analysis.
>
> We solved this with a unified adapter pattern. Each OSINT source has its own adapter that handles the specific API requirements, but they all output data in a consistent normalized format. This means our detection engine doesn't need to understand seven different data formats - it just works with one.
>
> Rate limiting was another challenge. These APIs have strict quotas, and exceeding them gets you blocked. We implemented per-source rate limiting with configurable request windows. If an API call fails, we use exponential backoff - waiting 1 second, then 2, then 4 - up to 3 retries before failing gracefully.
>
> The orchestrator class coordinates all of this. When we run an OSINT scan, it queries all enabled sources in parallel, handles failures gracefully so one broken source doesn't stop the whole scan, and deduplicates results so we don't create redundant alerts.
>
> All ingested data goes through our normalization layer, which converts severity scores to a consistent 1-5 scale and extracts relevant indicators like IPs, domains, and file hashes."

---

## Slide 4: Detection Engine & Asset Correlation (Tina)

> "Once we have threat intelligence ingested, the next challenge is making it actionable. Raw threat data is useless if you can't connect it to your actual systems.
>
> Our detection engine automatically correlates threat indicators with assets in your inventory. When we ingest an intel event with a malicious IP, we check if any of your assets have that IP address, or if it appears in your network logs. If there's a match, we create a link in our asset_intel_links table.
>
> This correlation enables our risk scoring model. The formula is straightforward but effective: Asset Risk equals Asset Criticality multiplied by Maximum Intel Severity over the past 7 days. A critical database server linked to a severity-5 threat gets a risk score of 25 - that's going to show up at the top of your dashboard.
>
> What's important is that these risk scores are automatically persisted. When an OSINT scan completes, we recalculate every asset's risk score and update the database. Analysts don't need to run reports or refresh dashboards - the data is always current.
>
> We also handle deduplication intelligently. If we see the same malicious IP reported multiple times within 24 hours, we don't create duplicate detections. Instead, we increment a hit count and update the timestamp. This prevents alert fatigue while still tracking persistent threats.
>
> The AI agent adds another layer by analyzing detection patterns and generating analyst notes explaining why a particular threat is concerning for your specific environment."

---

# BACKEND/AGENTS - Bhavani

---

## Slide 5: AI Agent Architecture (Bhavani)

> "Hello, I'm Bhavani, and I built the AI agent system that powers the platform's intelligence.
>
> We designed six specialized agents, one for each NIST CSF function. The Identify Agent handles asset discovery and classification. The Protect Agent generates security policies and implementation procedures. The Detect Agent correlates threats and performs pattern analysis. The Respond Agent creates incident playbooks. The Recover Agent evaluates disaster recovery readiness. And the Govern Agent calculates compliance metrics and generates gap analysis.
>
> All six agents share a common architecture but have specialized prompts and output schemas. We use GPT-5 through Replit's AI integrations, which handles API key management and provides a consistent interface.
>
> Each agent follows the same pattern: gather relevant context from the database, construct a specialized prompt with that context, call the LLM, parse the structured response, and persist results back to the database. This ensures consistency and makes the agents testable.
>
> For example, when the Protect Agent generates an SOP for a NIST control, it first retrieves the control definition and any linked assets. It then prompts GPT-5 with specific instructions to create step-by-step procedures. The response is parsed and stored as structured data, not just raw text, so the frontend can render it consistently.
>
> The agents run both on-demand and on schedules. The background scheduler triggers OSINT scans hourly, governance recalculation nightly, and SLA monitoring every 5 minutes."

---

## Slide 6: Backend API & Data Flow (Bhavani)

> "The backend is built on Express.js with TypeScript for type safety throughout the stack.
>
> Our API follows RESTful conventions with clear resource-based routes. Assets at /api/assets, incidents at /api/incidents, controls at /api/controls, and so on. Each route handler is intentionally thin - it validates input, calls the storage layer, and returns the response.
>
> Input validation uses Zod schemas that are shared between frontend and backend. When a client submits a new incident, the request body is validated against the insertIncidentSchema before any database operation. This catches malformed data at the API boundary rather than deep in the application.
>
> We use Drizzle ORM for database access. Drizzle provides type-safe queries that catch errors at compile time rather than runtime. If you try to select a column that doesn't exist, TypeScript will error before you even run the code.
>
> The storage layer abstracts database operations behind an interface. This made development easier because we could start with in-memory storage and switch to PostgreSQL without changing route handlers. It also makes unit testing straightforward.
>
> For security, we've implemented a comprehensive middleware stack. Helmet sets secure HTTP headers. Rate limiting prevents API abuse. Session management uses secure cookies with PostgreSQL-backed storage. We also have CORS configured for production deployment.
>
> All of this runs on a single Express server that also serves the Vite-built frontend, making deployment simple."

---

# RISK & COMPLIANCE - Geethika

---

## Slide 7: NIST 800-53 Control Implementation (Geethika)

> "Hi, I'm Geethika, and I focused on risk management and compliance features.
>
> NIST 800-53 Revision 5 is the comprehensive security control catalog used by federal agencies and increasingly adopted in the private sector. We've implemented the full catalog with 20 control families covering everything from Access Control to System Integrity.
>
> Each control in our system has a lifecycle status. When you first add a control, it's 'Proposed' - you've identified it as relevant but haven't started implementation. As work begins, it moves to 'In-Progress.' When implementation is complete and verified, it becomes 'Implemented.' If you determine a control isn't applicable, you can mark it 'Declined' with justification.
>
> The real value-add is our AI-generated SOPs. Security controls often read like legal documents - technically accurate but not actionable. Our Protect Agent takes each control and generates step-by-step implementation procedures written for practitioners.
>
> For example, AC-2 Account Management requires organizations to manage system accounts. Our generated SOP breaks this down: Step 1, define an account request form with required approvals. Step 2, implement automated provisioning workflow. Step 3, configure quarterly access reviews. Each step has specific actions, not vague requirements.
>
> We also map every control to NIST CSF categories and subcategories. This dual mapping means you can view your security program through either lens - the detailed 800-53 controls or the higher-level CSF functions. The Governance Dashboard uses this mapping to calculate coverage percentages."

---

## Slide 8: Risk Register & Compliance Tracking (Geethika)

> "Beyond controls, we needed formal risk management and gap tracking capabilities.
>
> The Risk Register is where identified security risks are formally documented and tracked. Each risk item captures the threat source, the vulnerable asset, likelihood, impact, and a calculated risk score. We use a standard 5x5 matrix: likelihood times impact gives you a score from 1 to 25.
>
> What's powerful is that risks can be generated automatically. When the Detection Agent identifies a high-severity threat linked to a critical asset, it can automatically create a risk item. This bridges the gap between tactical threat detection and strategic risk management.
>
> For compliance tracking, we implemented a full assertion-based model. Each CSF subcategory becomes a compliance assertion with a status: Implemented, Partially Implemented, Planned, Not Assessed, or Not Applicable. The Governance Agent calculates coverage by examining control implementation status and updating assertion status accordingly.
>
> Evidence freshness is another key metric. Auditors don't just want to know that you implemented a control - they want recent evidence. We track verification dates for each assertion and surface 'stale evidence' in the governance dashboard when attestations are more than 90 days old.
>
> Finally, the POA&M - Plan of Action and Milestones - tracks remediation work. Every gap identified by the Governance Agent becomes a POA&M item with an owner, due date, and status. This creates the accountability and audit trail that compliance programs require."

---

# DEVOPS - Mukunda

---

## Slide 9: Infrastructure & Database Architecture (Mukunda)

> "Hi everyone, I'm Mukunda, and I handled the DevOps and infrastructure side of the project.
>
> Our database runs on Neon PostgreSQL, which provides serverless Postgres with WebSocket support. This is important because traditional connection pooling doesn't work well in serverless environments. Neon's driver handles connection management automatically.
>
> We use Drizzle ORM for database access. The schema is defined in TypeScript, giving us type safety from the database layer all the way to the frontend. When we run migrations, Drizzle generates the SQL automatically based on schema changes.
>
> The database schema supports the full NIST CSF model. We have core tables for users, assets, intel events, detections, incidents, and controls. Linking tables handle many-to-many relationships like asset-to-intel-event mappings. The recover function has its own set of tables for DR plans, backup sets, restore tests, and resilience findings.
>
> Our background scheduler runs multiple automated jobs. OSINT ingestion runs hourly to keep threat intelligence current. SLA monitoring runs every 5 minutes to detect incidents approaching their deadlines. RPO/RTO compliance evaluation runs nightly to verify backup and recovery targets. Each job is independently configurable with its own interval and error handling.
>
> For alerting, we support email via Nodemailer and webhook integrations. When an incident breaches its SLA or a critical detection is created, the system can automatically notify the right people. We implemented retry logic with exponential backoff so transient email failures don't drop critical alerts."

---

## Slide 10: Security Hardening & Deployment (Mukunda)

> "Security hardening was critical because we're building a security platform - it needs to be secure itself.
>
> Our security middleware stack starts with Helmet.js, which sets secure HTTP headers. This includes Content-Security-Policy to prevent XSS attacks, X-Frame-Options to prevent clickjacking, and Strict-Transport-Security for HTTPS enforcement.
>
> Rate limiting protects the API from abuse. We've configured different limits for different endpoints - authentication endpoints have stricter limits to prevent brute force attacks, while read-only endpoints are more permissive. If a client exceeds the limit, they get a 429 response with a Retry-After header.
>
> Session management uses secure, HTTP-only cookies with PostgreSQL-backed storage. Sessions are invalidated server-side, so compromised session tokens can be immediately revoked. We also implemented CSRF protection for state-changing operations.
>
> For deployment configuration, we use environment variables for all sensitive values - database credentials, API keys, session secrets. Nothing sensitive is hardcoded. The Replit secrets management handles encryption at rest.
>
> The deployment target is a Replit environment with a public DNS subdomain. For production, we'd add a custom domain with TLS termination. The platform is designed to run on a single server for SMB deployments, keeping operational complexity low while still providing enterprise-grade security capabilities.
>
> Monitoring includes application logging with structured JSON output, making it easy to ingest into log aggregation systems for production troubleshooting."

---

# FRONTEND - Srujana

---

## Slide 11: UI/UX Design System (Srujana)

> "Hi, I'm Srujana, and I developed the frontend application.
>
> Our design system is based on Material Design principles, implemented using shadcn/ui components built on Radix UI primitives. This gave us accessible, well-tested components that we could customize to match our design requirements.
>
> The typography system uses the Roboto font family with a carefully defined scale. Headings range from 2.5rem for page titles down to 1rem for body text. This hierarchy helps users quickly scan pages and find relevant information.
>
> Colors are semantic throughout the application. Severity badges use a consistent scale: critical risks are red, high is orange, medium is yellow, and low is green. Status indicators follow the same pattern for incidents, controls, and compliance items. This consistency means users learn the visual language once and it applies everywhere.
>
> We implemented full light and dark mode support. The color palette is defined using CSS custom properties, and Tailwind's dark mode class toggles the entire theme. All components respect the current mode - you won't find jarring bright elements in dark mode or washed-out text in light mode.
>
> The design guidelines document captures all of these decisions, ensuring consistency as the platform grows. Any new components or pages follow the same patterns."

---

## Slide 12: Application Architecture & Data Flow (Srujana)

> "The frontend is built with React and TypeScript, using Vite for fast development builds and optimized production bundles.
>
> For server state management, we use TanStack Query, also known as React Query. This handles caching, background refetching, and optimistic updates. When an analyst creates a new incident, the UI updates immediately while the request is in flight, providing a snappy user experience. If the request fails, we roll back and show an error.
>
> Routing uses Wouter, a lightweight alternative to React Router. The navigation structure mirrors the NIST CSF framework - you'll see sidebar sections for Identify, Protect, Detect, Respond, Recover, and Govern. Each section expands to show relevant pages. This organization helps users understand where different capabilities live.
>
> The sidebar itself uses shadcn's sidebar components, which provide collapsible behavior, keyboard navigation, and proper accessibility attributes. On mobile viewports, the sidebar becomes a slide-out drawer.
>
> Data visualization uses Recharts for the dashboard charts and trends. The governance dashboard shows CSF function coverage as a horizontal bar chart, making it immediately obvious where coverage is strong and where gaps exist.
>
> Every interactive element has a data-testid attribute for automated testing. This enables the Playwright-based testing we use to verify features end-to-end.
>
> The result is a responsive, accessible application that security analysts can use effectively on any device."

# AI-Augmented Cyber Risk & Threat Intelligence Framework for SMBs

A web-based, agentic-AI platform for small- and medium-sized businesses (SMBs) to identify assets, ingest OSINT and logs, score and prioritize risk, and automate security workflows mapped to NIST CSF 2.0.

Live Demo: [https://youtu.be/notH5ACUzBI](https://youtu.be/notH5ACUzBI)

## Team Roster & Roles

- [@ben-blake](https://github.com/ben-blake) - Team Lead
- [@tinana2k](https://github.com/tinana2k) - Data/Detection
- [@bhavani-adula](https://github.com/Bhavani-Adula) - Backend/Agents
- [@geethspadamati](https://github.com/Geethspadamati) - Risk & Compliance
- [@mukunda5125](https://github.com/mukunda5125) - DevOps
- [@srujanareddykunta](https://github.com/srujanareddykunta-cell) - Frontend

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- An `.env` file created from `env/.env.sample` (see `env/README.md`)

### Running the Application (Docker)

1.  **Build and run all services:**

    ```bash
    docker compose -f deploy/docker/docker-compose.yml up --build
    ```

2.  **Access the application:**
    - Frontend UI: [http://localhost:5173](http://localhost:5173)
    - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Secret Management Policy

- **Production & Staging Secrets**: Managed securely in the production VM environment. Access is restricted.
- **Local Development Secrets**: Stored in `/env/.env`. This file **must not** be committed to Git. The `.gitignore` file is configured to prevent this.
- **No Secrets in Code**: Under no circumstances should secrets (API keys, passwords, private certificates) be hard-coded. Always use environment variables referenced from the configuration files.
- **Key Rotation**: API keys and other secrets should be rotated periodically and immediately if a leak is suspected.

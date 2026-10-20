# Milestone 1 — Research, System Architecture & Foundation Setup

> **Branch:** `mileston-1` · **Project:** Intelligent API Monitoring & Alert System
> **Status:** ✅ Completed · **Next:** [Milestone 2 → Backend pipeline](https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System/tree/mileston-2)

---

## 1. Goal of this milestone

Before writing feature code, understand the assignment properly, design the **whole-system architecture**, plan what gets built in which milestone, and set up the **foundation**: server, databases, message broker, authentication and Docker.

The assignment asks for a system that:

1. Monitors API responses (response time, HTTP status, returned data)
2. Detects anomalies (slow responses, failed requests, zero/missing records)
3. Generates **AI-powered, human-readable alerts** (LLM)
4. Stores anomalies in a database and exposes them via `GET /alerts`
5. Shows them in a clean frontend (optional: email reports)

This README documents the **architecture of the complete project** (so a reviewer can see the big picture from day one) and what was physically delivered in this milestone.

---

## 2. Project plan (roadmap)

| Milestone | Branch | Focus | Result |
|---|---|---|---|
| **1** | `mileston-1` | Research, architecture, planning, server + database + Docker setup, auth & client management | ✅ this branch |
| **2** | `mileston-2` | Full backend pipeline: ingestion → message queue → processor → metrics storage | [view](https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System/tree/mileston-2) |
| **3** | `mileston-3` | Anomaly detection, AI alert generation (LLM), alert storage, `/monitor` + `/alerts`, email, tests | [view](https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System/tree/mileston-3) |
| **4** | `mileston-4` | React dashboard, demo client app, full Docker stack, final polish | [view](https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System/tree/mileston-4) |
| **Final** | `main` | All milestones merged, final README | [view](https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System) |

---

## 3. System architecture (target design for the whole project)

### 3.1 High-level view

```mermaid
flowchart LR
    subgraph SRC["Where API data comes from"]
        J["Static JSON / curl / Postman<br/>POST /monitor"]
        APP["Client applications<br/>(monitoring middleware)"]
    end

    subgraph BE["Node.js + Express backend (modular services)"]
        MON["Monitor service<br/>validate + batch"]
        DET["Anomaly detector<br/>(pure rules)"]
        ALR["Alert service<br/>dedupe + store"]
        AI["AI alert generator<br/>(LLM + fallback)"]
        MAIL["Email notifier<br/>(optional)"]
        ING["Ingest service<br/>POST /api/hit"]
        AUTH["Auth + Client service<br/>JWT, roles, API keys"]
        ANA["Analytics service"]
    end

    subgraph MQ["Message broker"]
        Q["RabbitMQ queue api_hits<br/>+ dead-letter queue"]
    end

    PROC["Consumer / Processor<br/>(separate process)"]

    subgraph DB["Databases"]
        M[("MongoDB<br/>alerts, users, clients,<br/>api keys, raw hits")]
        P[("PostgreSQL<br/>hourly endpoint metrics")]
    end

    UI["React dashboard"]
    LLM["OpenAI API"]
    SMTP["SMTP server"]

    J --> MON --> DET --> ALR
    ALR --> AI --> LLM
    ALR --> M
    ALR --> MAIL --> SMTP
    APP --> ING --> Q --> PROC
    PROC --> M
    PROC --> P
    ANA --> P
    UI -->|"GET /alerts, analytics, auth"| BE
    AUTH --> M
```

### 3.2 Why two pipelines?

The assignment needs **alerts on API responses**. On top of that, the project also tracks **every real API hit** of onboarded client applications so the dashboard can show traffic, latency and error-rate charts.

| Pipeline | Purpose | Flow | Stored in |
|---|---|---|---|
| **A. Alert pipeline** (core task) | Detect problems and write human-readable alerts | `POST /monitor` → validate → detect → dedupe → AI message → save → (email) → `GET /alerts` | MongoDB `alerts` |
| **B. Hit-tracking pipeline** (scalability extra) | Collect traffic metrics from many client apps without slowing them down | `POST /api/hit` (API key) → RabbitMQ → consumer → raw + aggregated storage → analytics API | MongoDB `api_hits`, PostgreSQL `endpoint_metrics` |

### 3.3 Alert pipeline sequence

```mermaid
sequenceDiagram
    participant C as Client / JSON file
    participant M as POST /monitor
    participant D as Anomaly detector
    participant S as Alert service
    participant L as OpenAI (LLM)
    participant DB as MongoDB
    participant U as Dashboard (GET /alerts)

    C->>M: JSON array of API responses
    M->>M: validate each record
    M->>D: detect anomalies (rules)
    D-->>M: severity + anomaly types
    M->>S: raise alert
    S->>DB: same alert in last 10 min?
    alt duplicate
        S->>DB: occurrences + 1
    else new anomaly
        S->>L: generate readable alert
        L-->>S: message (or fallback template)
        S->>DB: save alert
    end
    U->>DB: GET /alerts (active)
```

### 3.4 Key architecture decisions

| Decision | Why |
|---|---|
| **Layered modules per feature** (`routes → controller → service → repository`) | Clean separation, easy testing, easy to extend with new services |
| **Dependency-injection containers** (`Dependencies/dependencies.js` in each service) | Every class receives its dependencies in the constructor → mockable in tests, no hidden globals |
| **Detection is separate from AI** | Rules decide *what* is an anomaly; the LLM only *describes* it. If the LLM is down, alerts still work (template fallback) |
| **MongoDB for alerts, users, raw hits** | Flexible documents, TTL indexes for automatic cleanup |
| **PostgreSQL for aggregated metrics** | Time-bucketed analytics queries (`GROUP BY`, averages) fit SQL well |
| **RabbitMQ for hit ingestion** | The API answers fast (`202 Accepted`), heavy writes happen asynchronously; retry + dead-letter queue protect data |
| **JWT in an httpOnly cookie** | Dashboard session cannot be read by JavaScript (XSS-safer) |
| **API keys per client** | Machines (client apps) authenticate with `x-api-key`; humans authenticate with login |
| **Docker Compose** | One command starts every dependency |
| **"Lite mode"** | If PostgreSQL/RabbitMQ are unavailable the server still starts and the alert API works with MongoDB alone (unless `REQUIRE_FULL_STACK=true`) |

---

## 4. What was built in Milestone 1

### 4.1 Server foundation

- Express app with `helmet`, `cors` (credentials enabled), `cookie-parser`, JSON/body parsing
- Request logging middleware and a **Winston** logger (console in dev, `logs/combined.log` and `logs/error.log` files)
- Central config module reading everything from environment variables (`src/shared/config/index.js`)
- `GET /health` and `GET /` info endpoints
- 404 handler, consistent response format (`ResponseFormatter`) and a custom `AppError`
- Graceful shutdown (closes HTTP server and DB/queue connections on `SIGINT`/`SIGTERM`)

### 4.2 Database & broker connections

| Component | File | Notes |
|---|---|---|
| MongoDB (Mongoose) | `src/shared/config/mongodb.js` | Connection management |
| PostgreSQL (`pg` pool) | `src/shared/config/postgres.js` | Pool + connection test |
| RabbitMQ (`amqplib`) | `src/shared/config/rabbitmq.js` | Declares durable queue `api_hits` with dead-letter queue `api_hits.dlq` |
| Postgres schema | `scripts/init-postgres.sql` | Table `endpoint_metrics`, indexes, `updated_at` trigger (auto-runs in Docker) |

### 4.3 Authentication & authorization

- Roles: `super_admin`, `client_admin`, `client_viewer`
- Endpoints (`/api/auth`):

| Method | Path | Access |
|---|---|---|
| POST | `/onboard-super-admin` | First-time setup only (works while no user exists) |
| POST | `/login` | Public — sets the `authToken` httpOnly cookie |
| GET | `/profile` | Logged-in |
| GET | `/logout` | Public |
| POST | `/register` | Super admin only |

- Passwords hashed with **bcrypt**; password policy enforced (min 8 chars, upper, lower, number, symbol, not a common password)
- Middlewares: `authenticate` (JWT), `authorize(roles)`, `validate(schema)`

### 4.4 Client & API-key management (`/api/admin/clients/...`)

- Onboard a client organisation, create client users, list clients (super admin sees all; client users see their own)
- Generate and list **API keys** (`apim_<40 hex chars>`) with permissions (e.g. `canIngest`) and optional expiry — used in Milestone 2 to authenticate hit ingestion

### 4.5 Data models (Mongoose)

`User`, `Client`, `ApiKey`, `ApiHit` (the `Alert` model arrives in Milestone 3).

### 4.6 Docker

`server/docker-compose.yml` (milestone 1 services): **PostgreSQL 15**, **MongoDB 6**, **RabbitMQ 3 (management UI)**, **pgAdmin 4** and the **API app** (`server/Dockerfile`).

---

## 5. Folder structure at this milestone

```text
server/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── scripts/
│   └── init-postgres.sql
└── src/
    ├── server.js                      # app bootstrap
    ├── services/
    │   ├── auth/        {routes, controller, service, repository, validation, Dependencies}
    │   └── client/      {routes, controller, services, repository, Dependencies}
    └── shared/
        ├── config/      {index, logger, mongodb, postgres, rabbitmq}
        ├── constants/   roles.js
        ├── middlewares/ {authenticate, authorize, validate, errorHandler, requestLogger}
        ├── models/      {User, Client, ApiKey, ApiHits}
        └── utils/       {AppError, SecurityUtils, responseFormatter}
```

---

## 6. How to run this milestone

**Requirements:** Node.js ≥ 18, Docker Desktop.

```bash
git clone https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System.git
cd Intelligent-API-Monitoring-Alert-System
git checkout mileston-1

cd server
npm install
```

Create `server/.env` (minimum for this milestone):

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/api_monitoring
MONGO_DB_NAME=api_monitoring
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=api_monitoring
PG_USER=postgres
PG_PASSWORD=latif
RABBITMQ_URL=amqp://api_user:secure_password@localhost:5672/api_monitoring
RABBITMQ_QUEUE=api_hits
JWT_SECRET=change-me-to-a-long-random-string
```

Start the infrastructure only, then the API:

```bash
docker compose up -d postgres mongo rabbitmq pgadmin
npm run dev
```

Verify:

```bash
curl http://localhost:5000/health
```

Create the first super admin (password must satisfy the policy):

```bash
curl -X POST http://localhost:5000/api/auth/onboard-super-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"Admin@12345"}'
```

| Tool | URL |
|---|---|
| API | http://localhost:5000 |
| RabbitMQ management | http://localhost:15672 (`api_user` / `secure_password`) |
| pgAdmin | http://localhost:8080 (`admin@example.com` / `admin`) |

---

## 7. Milestone 1 checklist

- [x] Assignment analysed, architecture designed, roadmap planned
- [x] Express server with logging, config, error format, graceful shutdown
- [x] MongoDB, PostgreSQL and RabbitMQ connections
- [x] PostgreSQL schema + Docker initialisation script
- [x] JWT authentication, role-based authorization, password policy
- [x] Client onboarding and API-key management
- [x] Docker Compose for all infrastructure services

---

## 8. Credits & learning resources

- Code-architecture tutorials by **[Channel Name](https://www.youtube.com/)** helped shape the layered structure used in this project.

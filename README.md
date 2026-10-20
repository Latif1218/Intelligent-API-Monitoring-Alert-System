# Intelligent API Monitoring & Alert System

## Quick Start — Run the whole project in 5 minutes

Copy-paste the commands in order. Everything (API, dashboard, databases, queue, consumer) starts with **one Docker command**.

**You need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running) and Git. Node.js is **not** required for this path.

---

## 1. Get the code

```bash
git clone https://github.com/Latif1218/Intelligent-API-Monitoring-Alert-System.git
cd Intelligent-API-Monitoring-Alert-System/server
```

## 2. Create the `.env` file (inside `server/`)

**Mac / Linux / Git Bash**

```bash
cat > .env <<'EOF'
PG_PASSWORD=latif
JWT_SECRET=change-me-to-a-long-random-string
OPENAI_API_KEY=
LLM_MODEL=gpt-4o-mini
ALERT_EMAIL_ENABLED=false
EOF
```

**Windows PowerShell**

```powershell
@"
PG_PASSWORD=latif
JWT_SECRET=change-me-to-a-long-random-string
OPENAI_API_KEY=
LLM_MODEL=gpt-4o-mini
ALERT_EMAIL_ENABLED=false
"@ | Set-Content -Encoding ascii .env
```

> - `OPENAI_API_KEY` is optional. Leave it empty and alerts are written from a built-in template; paste a key and they are written by the AI.
> - `PG_PASSWORD=latif` is required — it must match the database password in `docker-compose.yml`.
> - For email alerts set `ALERT_EMAIL_ENABLED=true` and add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ALERT_EMAIL_TO`.

## 3. Start everything

```bash
docker compose up --build -d
```

First run downloads images and builds (a few minutes). Check that all containers are up:

```bash
docker compose ps
curl http://localhost:5000/health
```

You should see `"status":"healthy"`.

## 4. Open the dashboard and create the admin

1. Open **http://localhost:5173**
2. Click **"First time here? Create the super admin account"**
3. Username `admin`, any email, password e.g. `Admin@12345`
   (needs upper-case + lower-case + number + symbol, min 8 chars)
4. Sign in.

## 5. Send test data (the assignment's example)

Create a file `sample.json` in the `server/` folder:

```json
[
  { "api_name": "PatientDataAPI", "response_time_ms": 1200, "status_code": 200, "records_returned": 50 },
  { "api_name": "AppointmentAPI", "response_time_ms": 5500, "status_code": 500, "records_returned": 0 }
]
```

Send it (works in Git Bash, Mac, Linux and Windows PowerShell — on Windows use `curl.exe`):

```bash
curl -X POST http://localhost:5000/monitor -H "Content-Type: application/json" -d @sample.json
```

Read the alerts:

```bash
curl http://localhost:5000/alerts
```

Or just open the dashboard → **Alerts** → card **"Test the monitor"** → **Run monitor**.

**Expected:** `PatientDataAPI` is healthy; `AppointmentAPI` becomes a **critical** alert, e.g.
*"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."*
Send the same file again → the alert is de-duplicated (`occurrences` goes up instead of a new alert).

## 6. See where things live

| What | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:5000 |
| Alerts (JSON) | http://localhost:5000/alerts |
| RabbitMQ UI | http://localhost:15672 — `api_user` / `secure_password` |
| MongoDB UI (alerts are in `api_monitoring` → `alerts`) | http://localhost:8081 |
| PostgreSQL UI | http://localhost:8080 — `admin@example.com` / `admin` |

Live logs:

```bash
docker compose logs -f api-app consumer
```

## 7. (Optional) Real traffic from the demo app

1. Dashboard → **Clients** → create a client → open it → **create an API key** → copy the `apim_...` key.
2. In a new terminal (needs Node.js 18+):

```bash
cd ../demo
npm install
```

Create `demo/.env`:

```env
PORT=3002
SERVICE_NAME=blog-api
MONITORING_API_KEY=apim_paste_your_key_here
MONITORING_ENDPOINT=http://localhost:5000/api/hit
MONITORING_ENABLED=true
```

```bash
npm start
curl http://localhost:3002/api/posts
```

Open the dashboard **Overview** to see hits, latency and error rate.

## 8. Stop / reset

```bash
docker compose down        # stop (data is kept)
docker compose down -v     # stop and delete ALL data (fresh start)
```

---

## Without Docker for the app (developer mode)

Only MongoDB is required for the alert system (PostgreSQL and RabbitMQ are optional).

```bash
cd server
docker compose up -d mongo postgres rabbitmq     # databases only
npm install
npm run dev                                       # API  → http://localhost:5000
npm run processor                                 # (new terminal, optional) queue consumer

cd ../dashboard
npm install
npm run dev                                       # Dashboard → http://localhost:5173
```

Use this `server/.env` for local mode:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/api_monitoring
PG_HOST=localhost
PG_PASSWORD=latif
RABBITMQ_URL=amqp://api_user:secure_password@localhost:5672/api_monitoring
JWT_SECRET=change-me-to-a-long-random-string
OPENAI_API_KEY=
```

Run the tests: `cd server && npm test`

---

## If something fails

| Problem | Fix |
|---|---|
| Consumer container cannot log in to PostgreSQL | Create `server/.env` with `PG_PASSWORD=latif` (must match the database password in `docker-compose.yml`) |
| First super admin creation fails with a password message | Use a stronger password, e.g. `Admin@12345` (upper + lower + number + symbol, not a common password) |
| Alerts show `fallback` instead of AI text | `OPENAI_API_KEY` missing, quota exhausted or request timed out — the system intentionally falls back to a template; check `server/logs/combined.log` |
| Log says "running in lite mode" | PostgreSQL or RabbitMQ not reachable — alerts still work; start them for traffic analytics |
| `401` on `POST /monitor` | `MONITOR_API_KEY` is set — add header `x-monitor-key` or call it from the logged-in dashboard |
| Dashboard cannot reach the API in dev | Make sure the API runs on port 5000 (Vite proxies `/api` to it) |
| `npm run send:sample` fails | Pass a file: `npm run send:sample -- sample.json` (a JSON array in the `/monitor` format) |

---

## 16. Submission checklist

| Deliverable | Where |
|---|---|
| Source code | This repository (all milestone branches merged into `main`) |
| README with setup & run instructions | This file (+ one README per milestone branch) |
| Video explanation (5–10 min: architecture, workflow, key decisions) | Shared via Drive link in the submission e-mail |
| AI prompts document (`AI_Prompts.docx`) | Shared via Drive link in the submission e-mail |

**Suggested video outline:** (1) the problem and assignment, (2) architecture diagram, (3) live demo: send the sample JSON → anomaly detected → AI alert → dashboard → email, (4) code walkthrough of `anomalyDetector`, `aiAlertGenerator`, `alertService`, (5) scalability decisions (queue, retries, DLQ, de-dup), (6) tests and what you would improve next.

---

## 17. Credits & license

- Architecture and clean-code learning resources: **[Code Architecture](https://www.youtube.com/@CodeArchitectureWithRahul)** (YouTube).
- Runtime AI: OpenAI API for alert text generation.
- License: [MIT](LICENSE) © 2026 Mds Abdul Latif

# CodeSight Backend — Complete Code Explanation

This document explains every single file in the backend, what it does, why it exists,
how they all connect, and how the full request flow works from GitHub → your database.

---

## Table of Contents

1. [Big Picture Architecture](#1-big-picture-architecture)
2. [Redis — What It Is, Why We Need It, How to Set It Up](#2-redis)
3. [uv — Package Manager Setup](#3-uv-setup)
4. [File-by-File Explanation](#4-file-by-file-explanation)
   - [pyproject.toml](#pyprojecttoml)
   - [app/config.py](#appconfigpy)
   - [app/database.py](#appdatabasepy)
   - [app/celery_app.py](#appcelery_apppy)
   - [app/main.py](#appmainpy)
   - [app/models/](#appmodels)
   - [app/schemas/](#appschemas)
   - [app/utils/](#apputils)
   - [app/services/](#appservices)
   - [app/tasks/review_task.py](#apptasksreview_taskpy)
   - [app/api/](#appapi)
5. [Complete Request Flow (End-to-End)](#5-complete-request-flow)
6. [Environment Variables Reference](#6-environment-variables-reference)

---

## 1. Big Picture Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                   │
│                                                                     │
│   GitHub ──POST webhook──► Next.js /api/webhooks/github             │
│                                  │                                  │
│                                  │ forwards to                      │
│                                  ▼                                  │
│              ┌─────────────────────────────────────┐               │
│              │   FastAPI Backend (port 8000)        │               │
│              │                                     │               │
│              │  POST /api/webhooks/github           │               │
│              │   1. Verify HMAC signature           │               │
│              │   2. Parse PR event                  │               │
│              │   3. Save PR + Review to DB          │               │
│              │   4. Push task ID → Redis queue      │               │
│              └─────────────┬───────────────────────┘               │
│                            │ enqueues task                          │
│                            ▼                                        │
│              ┌─────────────────────────┐                           │
│              │   Redis (port 6379)     │                           │
│              │   - Task queue          │                           │
│              │   - Task results store  │                           │
│              └────────────┬────────────┘                           │
│                           │ picks up task                           │
│                           ▼                                         │
│              ┌─────────────────────────────────────┐               │
│              │   Celery Worker (separate process)   │               │
│              │                                     │               │
│              │  trigger_review(review_id)           │               │
│              │   → LangGraph pipeline (Phase 4)    │               │
│              │   → Azure OpenAI GPT-4o             │               │
│              │   → Posts review to GitHub PR       │               │
│              │   → Saves results to DB             │               │
│              └─────────────────────────────────────┘               │
│                                                                     │
│              Both FastAPI and Celery worker read/write:             │
│              ┌──────────────────────────────┐                      │
│              │  Neon PostgreSQL (shared DB) │                      │
│              │  - repository table          │                      │
│              │  - pull_request table        │                      │
│              │  - review table              │                      │
│              │  - account table (tokens)    │                      │
│              └──────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Three separate processes run simultaneously:**
| Process | Command | Role |
|---------|---------|------|
| FastAPI server | `uv run uvicorn app.main:app` | Receives webhooks, serves API |
| Celery worker | `uv run celery -A app.celery_app worker` | Runs AI review jobs |
| Redis | `redis-server` | Message queue between the two |

---

## 2. Redis

### What is Redis?

Redis is an **in-memory key-value store** — think of it like a super-fast shared notepad
that multiple processes can read and write. It doesn't persist to disk by default (though
it can), making it extremely fast.

### Why Do We Need Redis?

The problem: A PR review takes 30–60 seconds (multiple GPT-4o API calls). If FastAPI
handled it directly, the webhook request would hang for a minute, GitHub would time out
and retry, and you'd get duplicate reviews.

**The solution: Celery + Redis as a task queue.**

```
FastAPI (webhook arrives)
   │
   │  "Hey Redis, please put this task on the queue:
   │   run trigger_review('review_abc123')"
   │
   └──► Redis queue  ◄── Celery worker polls this constantly
              │
              │  "I see a task! Let me grab it..."
              │
              └──► Celery worker runs trigger_review('review_abc123')
                        (takes 30-60s, FastAPI doesn't care)
```

**Redis serves two roles for Celery:**
1. **Broker** — The task queue. FastAPI pushes tasks here, Celery picks them up.
2. **Backend** — The result store. Celery saves task results here so you can check status.

Both are configured with the same `REDIS_URL` in our setup.

### How to Install Redis

**Option A — Windows (using WSL, recommended):**
```bash
# Inside WSL terminal:
sudo apt update
sudo apt install redis-server

# Start Redis:
sudo service redis-server start

# Test it works:
redis-cli ping
# Should print: PONG

# Auto-start on WSL login (optional):
sudo systemctl enable redis-server
```

**Option B — Windows (using Memurai, a Redis-compatible Windows port):**
1. Download from https://www.memurai.com/get-memurai
2. Install and run — it starts as a Windows service automatically
3. Test: open Command Prompt and run `memurai-cli ping`

**Option C — Windows (using Docker, easiest):**
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
# Runs Redis in a container, accessible at localhost:6379
```

**Option D — macOS:**
```bash
brew install redis
brew services start redis
redis-cli ping  # Should print: PONG
```

### Verify Redis Is Running

```bash
redis-cli ping        # Should print: PONG
redis-cli info server # Shows server info including version
```

### Redis in Our Code

| Where | What it does |
|-------|-------------|
| `app/config.py` | `REDIS_URL` setting (default: `redis://localhost:6379/0`) |
| `app/celery_app.py` | Celery uses Redis as broker AND result backend |
| `app/tasks/review_task.py` | Tasks are dispatched via `.delay()`, they land in Redis |

The `/0` at the end of `redis://localhost:6379/0` means "use database 0" — Redis has 16
databases (0–15) by default. We always use 0.

---

## 3. uv Setup

`uv` is a modern Python package manager (written in Rust) that replaces pip + virtualenv.
It's dramatically faster and handles virtual environments automatically.

### Install uv

```bash
# Windows (PowerShell):
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### First-Time Setup (run from backend/ directory)

```bash
cd backend

# Creates .venv/ and installs all dependencies from pyproject.toml:
uv sync

# Install with dev tools (pytest, ruff) too:
uv sync --dev
```

That's it. `uv sync` reads `pyproject.toml`, creates `.venv/`, and installs everything.

### Daily Commands

```bash
# Run the FastAPI server:
uv run uvicorn app.main:app --reload --port 8000

# Run the Celery worker (in a separate terminal):
uv run celery -A app.celery_app worker --loglevel=info

# Add a new package:
uv add httpx

# Add a dev-only package:
uv add --dev black

# Run tests:
uv run pytest

# Run linter:
uv run ruff check .
```

**Why `uv run` instead of activating the venv?**
`uv run` automatically uses the `.venv` without you needing to activate it. Cleaner.

---

## 4. File-by-File Explanation

### `pyproject.toml`

**What it is:** The Python project manifest — replaces `setup.py`, `requirements.txt`,
and `setup.cfg` all in one file. This is the modern standard (PEP 517/518).

**Key sections:**
```toml
[project]
# Project metadata + ALL runtime dependencies
# When you run `uv sync`, uv reads this and installs these packages

[build-system]
# Tells uv/pip HOW to build/install this project as a package
# hatchling is the build backend (modern alternative to setuptools)

[tool.hatch.build.targets.wheel]
packages = ["app"]
# Tells hatchling: the actual Python package is in the `app/` folder

[tool.uv]
dev-dependencies = [...]
# Dev-only packages, installed with `uv sync --dev`
# Not included in production installs

[tool.ruff]
# Code style/linting config for ruff (fast Python linter)

[tool.pytest.ini_options]
asyncio_mode = "auto"
# Tells pytest to automatically handle async test functions
# Critical because all our DB operations are async
```

---

### `app/config.py`

**What it is:** Central configuration — reads environment variables and makes them
available as a typed Python object throughout the entire app.

**How it works:**
```python
from app.config import settings

print(settings.DATABASE_URL)   # "postgresql://..."
print(settings.REDIS_URL)      # "redis://localhost:6379/0"
```

**Under the hood:** Uses `pydantic-settings`. When you import `settings`, it:
1. Reads `.env` file (from `../` relative to `backend/`, i.e., the project root)
2. Overrides with actual environment variables if set
3. Validates types — if `DATABASE_URL` is missing, it raises an error immediately at startup

**Why this approach:** Instead of `os.getenv("DATABASE_URL")` scattered everywhere,
you import `settings` once and get type-safe, validated config. If a required variable
is missing, the app crashes on startup with a clear error — not silently at runtime.

---

### `app/database.py`

**What it is:** The database connection layer. Creates the SQLAlchemy async engine and
the session factory.

**Key concepts:**

```
SQLAlchemy async engine
    │
    │  manages connection pool (5-10 connections open simultaneously)
    │
    ▼
async_session (session factory)
    │
    │  when called, creates one session (one unit of work)
    │
    ▼
Session = one conversation with the database
    - Run queries
    - Commit (save) or Rollback (undo)
    - Close when done
```

**The URL transformation:**
```python
# Neon gives you: postgresql://user:pass@host/db
# asyncpg needs:  postgresql+asyncpg://user:pass@host/db
# The code does this conversion automatically
```

**`get_db()` — the FastAPI dependency:**
```python
async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session       # FastAPI uses the session here
            await session.commit()  # auto-commit if no error
        except Exception:
            await session.rollback()  # auto-rollback on error
            raise
```

Any API route that needs the DB adds `db: AsyncSession = Depends(get_db)` to its
signature. FastAPI automatically creates a session, passes it in, and commits/closes
it when the route finishes. You never manually open/close sessions in routes.

---

### `app/celery_app.py`

**What it is:** Creates the Celery instance — the task queue management system.

**What Celery is:**
Celery is a Python library for running jobs asynchronously in a separate worker process.
Think of it like a job scheduler: you say "run this function later", and a background
worker picks it up and runs it independently.

```python
celery_app = Celery(
    "codesight",
    broker=settings.REDIS_URL,   # "Send tasks HERE"
    backend=settings.REDIS_URL,  # "Save results HERE"
)
```

**Key config:**
```python
task_serializer = "json"     # Tasks are stored as JSON in Redis (readable/debuggable)
result_expires = 3600        # Task results deleted from Redis after 1 hour
worker_concurrency = 4       # Worker runs 4 tasks simultaneously
task_acks_late = True        # Only mark task as done AFTER it completes (safer)
task_reject_on_worker_lost = True  # If worker crashes, put task back in queue
```

**`autodiscover_tasks(["app.tasks"])`:** Celery scans the `app/tasks/` folder and
automatically registers any function decorated with `@celery_app.task`.

---

### `app/main.py`

**What it is:** The FastAPI application entrypoint — where everything gets wired together.

**Structure:**
```python
app = FastAPI(lifespan=lifespan)  # The app itself

# 1. Startup/shutdown lifecycle handler
@asynccontextmanager
async def lifespan(app):
    # STARTUP: test DB connection, log config
    yield
    # SHUTDOWN: close DB connection pool

# 2. CORS middleware
# Allows the Next.js frontend (localhost:3000) to call backend APIs from the browser
app.add_middleware(CORSMiddleware, allow_origins=[settings.FRONTEND_URL], ...)

# 3. Mount all routes
app.include_router(api_router)  # /health, /api/webhooks/github, /api/reviews/...
```

**CORS explained:** When your browser (running the Next.js app at localhost:3000) tries
to fetch `http://localhost:8000/api/reviews/...`, the browser blocks it by default
(cross-origin security). The CORS middleware tells the browser "it's okay, localhost:3000
is allowed to call this API."

**The lifespan handler runs once:**
- At startup: verifies DB is reachable (`SELECT 1`), logs configuration
- At shutdown: properly closes all DB connections in the pool

---

### `app/models/`

**What they are:** SQLAlchemy ORM models — Python classes that map to database tables.
Each class = one table. Each attribute = one column.

**Why they exist even though Prisma already manages the schema:**
The Next.js frontend uses Prisma (TypeScript ORM) to talk to the database.
The Python backend uses SQLAlchemy (Python ORM) to talk to the **same** database.
They're two different code representations of the same tables.

**Important rule: The Python backend NEVER runs migrations.** Prisma owns migrations.
The SQLAlchemy models just describe the tables that already exist.

---

#### `app/models/base.py`

```python
class Base(DeclarativeBase):
    pass
```

The parent class all models inherit from. SQLAlchemy uses this to track all models
and generate SQL. Every model does `class SomeModel(Base)`.

---

#### `app/models/user.py`

Maps to the `user` table (created by Prisma/better-auth).

**Used by:** `token_service.py` (joins User → Account to find GitHub tokens).

**Backend only reads this table** — it never creates or updates users.
Users are created by better-auth when they log in with GitHub OAuth.

---

#### `app/models/account.py`

Maps to the `account` table. This is where better-auth stores OAuth tokens.

**Most important column:** `accessToken` — the GitHub OAuth token we need to:
- Call GitHub API to fetch PR diffs
- Post the AI review back to the PR

**Critical query flow:**
```
We have a repository_id
    → look up Repository.userId
    → look up Account where userId matches AND providerId = "github"
    → get Account.accessToken
    → use that token to call GitHub API
```

---

#### `app/models/repository.py`

Maps to the `repository` table. A repo is connected when the user clicks "Connect" in
the dashboard (which calls `createWebhook()` in the frontend).

**Key columns:**
- `githubId` — GitHub's own ID for the repo (BigInt). Used to match incoming webhook payloads.
- `userId` — which user connected this repo (for looking up their GitHub token).

---

#### `app/models/pull_request.py`

Maps to the `pull_request` table.

**Created when:** A `pull_request` webhook event with action `opened`/`synchronize`/`reopened`
arrives and the repo is connected.

**Key columns:**
- `githubId` — GitHub's PR ID (unique). Used to detect if we already have this PR.
- `headSha` — The commit SHA at the tip of the PR branch. Used to fetch the exact diff.
- `repositoryId` — FK to Repository.

**`PullRequestState` enum:** `OPEN`, `CLOSED`, `MERGED` — matches Prisma's enum exactly.

---

#### `app/models/review.py`

Maps to the `review` table. One Review = one AI code review run for one PR.

**Lifecycle of a Review record:**
```
Created with status="pending"
    │
    ▼  Celery picks up the task
status="in_progress"
    │
    ├── success ──► status="completed", summary filled, body filled
    │
    └── failure ──► status="failed"

    Special case: new push while reviewing ──► status="skipped"
```

**Key columns:**
- `githubprId` — GitHub's PR ID (re-stored here for quick lookups)
- `status` — The `ReviewStatus` enum (pending/in_progress/completed/failed/skipped)
- `summary` — Short summary (filled after AI runs)
- `body` — Full markdown review body (filled after AI runs)

---

### `app/schemas/`

**What they are:** Pydantic models for request/response data validation. Different from
SQLAlchemy models — schemas are for HTTP I/O, models are for database I/O.

---

#### `app/schemas/webhook.py`

Pydantic models that represent the JSON GitHub sends us in webhook payloads.

```python
class PullRequestEvent(BaseModel):
    action: str           # "opened", "synchronize", "reopened", "closed"
    number: int           # PR number (e.g., 42)
    pull_request: WebhookPullRequest
    repository: WebhookRepository
    sender: dict
```

**Why use Pydantic here?** When we do `PullRequestEvent(**payload)`, Pydantic validates
that all required fields exist and have the right types. If GitHub sends unexpected data,
we catch it early with a clear error instead of a cryptic `KeyError` deep in the code.

---

#### `app/schemas/review.py`

Response schemas for the `/api/reviews/` endpoints.

```python
class ReviewStatusResponse(BaseModel):
    id: str
    status: str           # "pending", "in_progress", "completed", etc.
    summary: str | None   # null until AI completes
    createdAt: datetime

    class Config:
        from_attributes = True  # Allows creating from SQLAlchemy model directly
```

The `from_attributes = True` config lets you do:
```python
review_orm = await db.get(Review, review_id)  # SQLAlchemy model
response = ReviewStatusResponse.model_validate(review_orm)  # converts to schema
```

---

### `app/utils/`

Standalone helper functions with no external dependencies (other than stdlib).

---

#### `app/utils/webhook_verify.py`

Verifies that a webhook payload actually came from GitHub and wasn't forged.

**How HMAC-SHA256 works:**
```
GitHub knows secret = "mysecret"
You know    secret = "mysecret"

GitHub computes: sha256("mysecret" + request_body) = "abc123..."
GitHub sends header: x-hub-signature-256: sha256=abc123...

Your server computes: sha256("mysecret" + request_body) = "abc123..."
If they match → request is genuine
If they don't → someone forged the request → reject with 401
```

**`hmac.compare_digest()`** — Uses constant-time comparison to prevent timing attacks.
Regular string `==` can leak information about where strings differ (timing side channel).

---

#### `app/utils/id_gen.py`

Generates CUID-like IDs for new database records.

Prisma uses `@default(cuid())` for primary keys — IDs that look like `c1a2b3c4d5e6...`.
Since the Python backend also needs to create records (PullRequest, Review), it needs to
generate compatible IDs. This utility creates IDs in the same format.

```python
def generate_cuid() -> str:
    timestamp = hex(int(time.time() * 1000))[2:]  # milliseconds as hex
    random_part = secrets.token_hex(8)             # 16 random hex chars
    return f"c{timestamp}{random_part}"            # starts with "c", like Prisma
```

---

### `app/services/`

Business logic layer — functions that combine DB queries and external API calls.

---

#### `app/services/token_service.py`

Single function: `get_github_token_for_repo(db, repository_id) -> str | None`

**What it does:**
```sql
SELECT account."accessToken"
FROM account
JOIN repository ON repository."userId" = account."userId"
WHERE repository.id = :repository_id
  AND account."providerId" = 'github'
  AND account."accessToken" IS NOT NULL
```

Returns the GitHub OAuth token that the user authenticated with. This token is used
by the Celery worker when it needs to:
1. Fetch the PR diff from GitHub API
2. Post the AI review back to the PR

**Why a separate service?** This query will be needed in multiple places (Celery task,
potentially retry logic, etc.). Extracting it avoids duplication.

---

### `app/tasks/review_task.py`

**What it is:** The Celery task that runs the AI review pipeline.

**Current state:** This is a stub — it logs and returns but doesn't do the actual AI
work yet. Phase 4 will fill in the LangGraph pipeline here.

```python
@celery_app.task(bind=True, name="app.tasks.trigger_review", max_retries=3)
def trigger_review(self, review_id: str) -> dict:
    # Phase 4 will implement:
    # 1. Load Review from DB → set status IN_PROGRESS
    # 2. Load PullRequest, Repository
    # 3. Get GitHub token via token_service
    # 4. Build ReviewState
    # 5. Run LangGraph graph (9 AI nodes)
    # 6. Save results to DB → set COMPLETED
    # 7. Handle failures → set FAILED, save error message
```

**`bind=True`** — Gives the task access to `self`, which lets you call `self.retry()`
for automatic retry with backoff on failures.

**`max_retries=3`** — If the task throws an exception, Celery retries it up to 3 times
before marking it as permanently failed.

**How a task is dispatched:**
```python
trigger_review.delay(review.id)
# .delay() is shorthand for .apply_async()
# Serializes arguments to JSON, pushes to Redis queue
# Returns immediately — the actual work happens in the worker
```

---

### `app/api/`

The HTTP API layer — FastAPI route handlers.

---

#### `app/api/health.py`

```python
@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "codesight-backend"}
```

Simple endpoint. Used to:
- Verify the backend is running: `curl http://localhost:8000/health`
- Docker health checks (Docker can poll this to know if the container is alive)
- Uptime monitoring tools

---

#### `app/api/webhooks.py`

The most important file in the backend. Handles all incoming GitHub webhook events.

**Flow when a PR is opened:**
```
POST /api/webhooks/github arrives
    │
    ├─ 1. Read raw body bytes (needed for HMAC verification)
    ├─ 2. Get x-github-event header ("pull_request")
    ├─ 3. Get x-hub-signature-256 header
    │
    ├─ 4. Verify HMAC signature
    │      If invalid → return 401
    │
    ├─ 5. Parse payload as JSON
    │
    ├─ 6. Route by event type:
    │      "ping"         → return {"message": "pong"}
    │      "pull_request" → _handle_pull_request_event()
    │      "push"         → return ignored (future: RAG re-indexing)
    │      other          → return ignored
    │
    └─ _handle_pull_request_event():
           │
           ├─ Check action: only process opened/synchronize/reopened
           │
           ├─ Look up Repository by github repo ID
           │      Not found → return ignored (repo not connected)
           │
           ├─ Upsert PullRequest record
           │      If exists → update title/headSha/state
           │      If new    → create record with generate_cuid()
           │
           ├─ Create Review record (status=PENDING)
           │
           ├─ trigger_review.delay(review.id)  ← enqueue to Redis/Celery
           │
           └─ Return 200 { processed: true, review_id: "...", status: "pending" }
```

**"synchronize" action** means a new commit was pushed to the PR branch.
This re-triggers the review so the latest code is always reviewed.

---

#### `app/api/reviews.py`

Two endpoints for the frontend to check review status:

**`GET /api/reviews/{review_id}`**
- Frontend polls this to show review status in the dashboard
- Returns: `{ id, status, summary, createdAt }`

**`POST /api/reviews/{review_id}/retry`**
- User clicks "Retry" in the dashboard for a failed review
- Resets status to `pending`, re-dispatches the Celery task
- Returns: `{ id, status: "pending", message: "Review has been re-queued..." }`

---

#### `app/api/router.py`

Aggregates all route modules into one router that `main.py` imports:

```python
api_router.include_router(health_router)    # /health
api_router.include_router(webhooks_router)  # /api/webhooks/github
api_router.include_router(reviews_router)   # /api/reviews/{id}
```

This keeps `main.py` clean — it only needs to know about `api_router`, not
individual route files.

---

## 5. Complete Request Flow (End-to-End)

Here's the full journey from a developer opening a PR to a review appearing on GitHub:

```
[Developer]
    │
    │  opens PR on GitHub
    ▼
[GitHub]
    │
    │  POST https://yoursite.com/api/webhooks/github
    │  Headers: x-github-event: pull_request
    │           x-hub-signature-256: sha256=<hmac>
    │  Body: { action: "opened", number: 5, pull_request: {...}, ... }
    ▼
[Next.js frontend route.ts]
    │
    │  Forwards exact headers + body to:
    │  POST http://localhost:8000/api/webhooks/github
    ▼
[FastAPI app/api/webhooks.py]
    │
    ├─ verify_webhook_signature(body, signature, secret) → True
    ├─ parse PullRequestEvent from payload
    ├─ SELECT repository WHERE githubId = payload.repository.id  → found
    ├─ INSERT INTO pull_request (id, githubId, title, ...)
    ├─ INSERT INTO review (id, status='pending', pullRequestId=...)
    ├─ trigger_review.delay(review.id)  ← task pushed to Redis
    │
    │  Returns 200 immediately
    ▼
[Redis queue]
    │
    │  { "task": "trigger_review", "args": ["review_c1a2b3..."] }
    ▼
[Celery worker process (separate terminal)]
    │
    │  (Phase 4 - not implemented yet, but here's what will happen)
    │
    ├─ Load Review from DB, set status="in_progress"
    ├─ Load PullRequest, Repository
    ├─ get_github_token_for_repo(db, repo.id) → "gho_xxxxx"
    │
    ├─ [LangGraph Pipeline starts]
    │     diff_fetcher     → GET github.com/repos/owner/repo/pulls/5/files
    │     diff_parser      → parse unified diff into FileChange objects
    │     file_filter      → skip *.lock, dist/, files >1000 lines
    │     file_reviewer    → GPT-4o reviews each file (parallel)
    │     security_scanner → GPT-4o checks for vulns, secrets leaks
    │     complexity_scorer → score overall PR risk (LOW/MEDIUM/HIGH/CRITICAL)
    │     summary_generator → generate PR summary + walkthrough table
    │     comment_formatter → convert to GitHub review comment format
    │     github_poster    → POST github.com/repos/owner/repo/pulls/5/reviews
    │
    ├─ GitHub PR now shows the AI review with inline comments
    ├─ UPDATE review SET status='completed', summary=..., body=...
    │
    ▼
[Done — Developer sees AI review on their PR]
```

---

## 6. Environment Variables Reference

Create a `.env` file in the project root (not inside `backend/`):

```env
# ── Database ─────────────────────────────────────────────────────────
# Your Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# ── Redis ─────────────────────────────────────────────────────────────
# Local Redis (default if not set)
REDIS_URL=redis://localhost:6379/0

# ── Azure OpenAI ──────────────────────────────────────────────────────
# Required for the AI review pipeline (Phase 4)
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# ── GitHub ────────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
# Must match the secret in your GitHub webhook settings
GITHUB_WEBHOOK_SECRET=your_random_secret_here

# ── App ───────────────────────────────────────────────────────────────
CODESIGHT_BOT_NAME=CodeSight
MAX_DIFF_SIZE=50000
MAX_FILES_PER_REVIEW=50

# ── CORS ──────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### How to generate `GITHUB_WEBHOOK_SECRET`:
```bash
# Option 1 - openssl (Linux/Mac/WSL):
openssl rand -hex 32

# Option 2 - Python:
python -c "import secrets; print(secrets.token_hex(32))"

# Option 3 - Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running Everything Locally

**Terminal 1 — FastAPI server:**
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Celery worker:**
```bash
cd backend
uv run celery -A app.celery_app worker --loglevel=info
```

**Terminal 3 — Redis (if not running as a service):**
```bash
redis-server
# OR if using WSL:
sudo service redis-server start
```

**Terminal 4 — Next.js frontend:**
```bash
cd frontend
npm run dev
```

**Verify backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"codesight-backend"}
```

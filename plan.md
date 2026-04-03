## Plan: CodeSight AI Code Review Agent Backend

**TL;DR** — Build a production-grade AI code review pipeline as a **Python FastAPI microservice** (using LangGraph for agent orchestration, Azure OpenAI GPT-4o for LLM, Celery + Redis for async job processing) alongside the existing Next.js frontend. Restructure into a monorepo with `/frontend` and `/backend` folders, orchestrated via Docker Compose. The webhook handler in Next.js will forward PR events to the Python backend, which runs a multi-agent LangGraph graph to analyze diffs, generate summaries, inline comments, security findings, and complexity scores — then posts everything back to GitHub as a proper Pull Request Review via Octokit REST API. New Prisma/SQLAlchemy models track PRs, reviews, and comments in the shared Neon Postgres DB.

---

### **Progress Summary**

#### ✅ COMPLETED (Backend Core)
- **Phase 0**: Monorepo structure created (`/frontend`, `/backend`)
- **Phase 2**: Backend service skeleton (FastAPI app, config, database, celery, all routes)
- **Phase 3**: Complete backend file structure implemented
- **Phase 4**: Full LangGraph agent pipeline with all 9 nodes
- **Phase 5**: Webhook handler (`webhooks.py`) fully implemented
- **Phase 6**: GitHub service (`github_service.py`) with `fetch_pr_files`, `fetch_pr_details`, `post_review`, `post_comment`
- **Celery task**: `review_task.py` orchestrates the full pipeline
- **SQLAlchemy models**: User, Account, Repository, PullRequest, Review (matching Prisma schema)
- **Backend `.env` file**: Created with database URL and placeholder config

#### ⚠️ REQUIRES CONFIGURATION (Before Backend Can Run)
1. **Azure OpenAI credentials** — Add to `backend/.env`:
   ```
   AZURE_OPENAI_API_KEY=<your-key>
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
   AZURE_OPENAI_API_VERSION=2024-10-21
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   ```

2. **Redis** — Either:
   - Run locally: `docker run -d -p 6379:6379 redis:7-alpine`
   - Or update `REDIS_URL` in `backend/.env`

3. **GitHub Webhook Secret** — Generate and add to `backend/.env`:
   ```
   GITHUB_WEBHOOK_SECRET=<random-32-char-secret>
   ```

#### 🔄 REMAINING (From Plan)

---

### **Steps**

#### Phase 0: Monorepo Restructure ✅ DONE

1. **Create root monorepo layout** — Move all existing files (except root config like `.gitignore`, `docker-compose.yml`) into a `/frontend` folder. Create `/backend` folder for the Python service.

   New structure:
   ```
   /
   ├── docker-compose.yml
   ├── .env                          # shared env vars
   ├── .gitignore
   ├── README.md
   ├── frontend/                     # existing Next.js app (everything currently at root)
   │   ├── package.json
   │   ├── next.config.ts
   │   ├── prisma/
   │   ├── src/
   │   ├── Dockerfile
   │   └── ...
   └── backend/                      # new Python FastAPI service
       ├── pyproject.toml
       ├── Dockerfile
       ├── alembic/                  # DB migrations (mirrors Prisma schema)
       ├── app/
       │   ├── main.py               # FastAPI entrypoint
       │   ├── config.py             # Settings (pydantic-settings)
       │   ├── celery_app.py         # Celery instance
       │   ├── api/                  # API routes
       │   ├── agents/               # LangGraph agents
       │   ├── models/               # SQLAlchemy models
       │   ├── schemas/              # Pydantic schemas
       │   ├── services/             # Business logic
       │   └── utils/                # Helpers
       └── tests/
   ```

2. **Update `tsconfig.json` paths** — Fix `@/` alias to resolve from `frontend/src/` after the move.

3. **Update `prisma.config.ts`** and any `package.json` scripts to reference correct relative paths from `/frontend`.

---

#### Phase 1: Database Schema Extension ⏳ PARTIAL

4. **Add new Prisma models** in `frontend/prisma/schema.prisma` — These track the review pipeline state:

   - **`PullRequest`** — ✅ Added
   - **`Review`** — ✅ Added (basic fields)
   - **`ReviewComment`** — ❌ NOT YET ADDED (stores inline comments in DB)
   - **`ReviewSetting`** — ❌ NOT YET ADDED (per-repo review configuration)

   Also add relation fields on `Repository`: `pullRequests PullRequest[]`, `reviewSetting ReviewSetting?`

5. **Run `prisma migrate`** — ⏳ May need additional migrations for ReviewComment and ReviewSetting

6. **Mirror models in SQLAlchemy** — ✅ Done for PullRequest, Review. ❌ Missing ReviewComment, ReviewSetting

---

#### Phase 2: Backend Service Skeleton ✅ DONE

7. **Initialize Python project** — `backend/pyproject.toml` with dependencies:
   - `fastapi[standard]` — Web framework
   - `uvicorn[standard]` — ASGI server
   - `celery[redis]` — Task queue
   - `redis` — Redis client
   - `sqlalchemy[asyncio]` — Async ORM
   - `asyncpg` — PostgreSQL async driver
   - `langgraph` — Agent orchestration
   - `langchain-openai` — Azure OpenAI integration
   - `langchain-core` — Base LangChain types
   - `pydantic-settings` — Config management
   - `httpx` — Async HTTP client (for GitHub API)
   - `pygithub` or `githubkit` — GitHub REST API wrapper
   - `unidiff` — Unified diff parser
   - `tiktoken` — Token counting for GPT models
   - `structlog` — Structured logging
   - `pydantic` v2 — Request/response schemas

8. **Create `backend/app/config.py`** — Pydantic `Settings` class reading from env:
   - `DATABASE_URL` — Neon Postgres
   - `REDIS_URL` — Redis connection
   - `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT` (gpt-4o)
   - `GITHUB_WEBHOOK_SECRET` — For HMAC verification
   - `CODESIGHT_BOT_NAME` — Display name (default: "CodeSight")
   - `MAX_DIFF_SIZE` — Max diff size to process (default: 50000 lines)
   - `MAX_FILES_PER_REVIEW` — Max files to review (default: 50)

9. **Create `backend/app/main.py`** — FastAPI app with:
   - Health check endpoint (`GET /health`)
   - Webhook receiver endpoint (`POST /api/webhooks/github`)
   - Review status endpoint (`GET /api/reviews/{review_id}`)
   - Review retry endpoint (`POST /api/reviews/{review_id}/retry`)
   - CORS middleware (allow requests from frontend)
   - Lifespan handler to initialize DB pool and validate config on startup

10. **Create `backend/app/celery_app.py`** — Celery instance with Redis broker and backend. Configure task serialization (JSON), result expiry, concurrency limits.

---

#### Phase 3: Backend File Structure ✅ DONE

All core files implemented:
```
backend/app/
├── main.py               ✅
├── config.py             ✅
├── celery_app.py         ✅
├── database.py           ✅
├── api/                  ✅ (health, webhooks, reviews, router)
├── models/               ✅ (User, Account, Repository, PullRequest, Review)
├── schemas/              ✅ (webhook, review)
├── services/             ✅ (github_service, token_service, diff_service)
├── agents/               ✅ (graph.py, state.py, all nodes, all prompts)
├── tasks/                ✅ (review_task.py)
└── utils/                ✅ (id_gen, webhook_verify)
```

---

#### Phase 4: LangGraph Agent Pipeline (Core) ✅ DONE

All 9 nodes implemented:
- `diff_fetcher` ✅ — Fetches PR files and metadata from GitHub API
- `diff_parser` ✅ — Parses GitHub file objects into FileChange dataclasses  
- `file_filter` ✅ — Filters binary, generated, oversized files
- `file_reviewer` ✅ — Per-file AI analysis using Azure OpenAI (parallelized with Send())
- `security_scanner` ✅ — Cross-file security vulnerability detection
- `complexity_scorer` ✅ — Heuristic + AI risk scoring (LOW/MEDIUM/HIGH/CRITICAL)
- `summary_generator` ✅ — PR summary + walkthrough table generation
- `comment_formatter` ✅ — Formats all findings into GitHub-compatible markdown
- `github_poster` ✅ — Posts review + inline comments to GitHub PR Review API

State machine and graph compilation in `graph.py` with conditional fan-out for parallel file reviews.

---

#### Phase 5: Webhook Flow Integration ✅ MOSTLY DONE

15. **Webhook routing** — ⏳ Need to configure:
    - Either update `frontend/src/modules/github/lib/github.ts` to point webhooks to backend
    - Or configure webhook URL in GitHub to `{BACKEND_URL}/api/webhooks/github`

16. **Backend webhook receiver** — ✅ DONE (`backend/app/api/webhooks.py`)
    - HMAC-SHA256 signature verification ✅
    - PR event handling (opened/synchronize/reopened) ✅
    - Repository lookup and PR upsert ✅
    - Review record creation ✅
    - Celery task dispatch ✅

17. **Celery review task** — ✅ DONE (`backend/app/tasks/review_task.py`)
    - Full pipeline execution with LangGraph ✅
    - Status tracking (IN_PROGRESS → COMPLETED/FAILED) ✅
    - Retry logic with exponential backoff ✅

---

#### Phase 6: GitHub Service (Posting Reviews) ✅ DONE

18. **`backend/app/services/github_service.py`** — ✅ Implemented:
    - `fetch_pr_files()` ✅
    - `fetch_pr_details()` ✅
    - `post_review()` ✅
    - `post_comment()` ✅

---

#### Phase 7: Docker Compose Setup ❌ NOT STARTED

19. **Create `docker-compose.yml`** — ❌ TODO
20. **Create `frontend/Dockerfile`** — ❌ TODO
21. **Create `backend/Dockerfile`** — ❌ TODO

---

#### Phase 8: Frontend Integration ❌ NOT STARTED

22. **Environment variables** — ⏳ Partial (backend has its own .env)
23. **Update webhook creation with secret** — ❌ TODO
24. **Add `/dashboard/reviews` page** — ❌ TODO
25. **Add `/dashboard/repository/[id]/reviews` page** — ❌ TODO
26. **Update dashboard stats with real data** — ❌ TODO  
27. **Add review settings UI** — ❌ TODO

---

#### Phase 9: Advanced Features ❌ NOT STARTED

28. **Webhook secret verification** — ✅ Done in backend
29. **Rate limiting** — ❌ TODO
30. **Token budget management** — ❌ TODO (tiktoken installed but not used)
31. **Retry logic** — ✅ Done in Celery task
32. **Review deduplication** — ❌ TODO
33. **Incremental reviews** — ❌ TODO

---

### **Verification** ❌ NOT STARTED

1. **Unit tests** — ❌ TODO
2. **Integration test** — ❌ TODO  
3. **Docker verification** — ❌ TODO (requires Docker setup)
4. **Dashboard verification** — ❌ TODO (requires frontend integration)

---

### **Decisions**

- **Webhook routing: Backend receives webhooks directly** — Cleaner than forwarding from Next.js. Update `createWebhook()` to point to `{BACKEND_URL}/api/webhooks/github`. Alternative (if BACKEND_URL is not publicly accessible): keep Next.js webhook route and have it forward to backend internally via Docker network.
- **Prisma owns DB schema** — SQLAlchemy models in Python are read/write but Prisma runs migrations. No Alembic. This avoids migration conflicts.
- **LangGraph over plain LangChain** — LangGraph's StateGraph gives explicit control over the review pipeline stages, error routing, and parallelized file review (via `Send()`). Much better than a simple chain for this multi-step workflow.
- **`COMMENT` review event, not `APPROVE`/`REQUEST_CHANGES`** — The bot should never block merges. It provides information only. Users can configure strictness later.
- **Per-file parallelism via `Send()`** — Files are reviewed concurrently rather than sequentially, reducing total review time from O(n × latency) to O(latency) for n files.
- **Celery over FastAPI BackgroundTasks** — Reviews can take 30-60s and include multiple LLM calls. Celery provides: retries, task tracking, concurrency control, dead letter handling, and the ability to scale workers independently.
  
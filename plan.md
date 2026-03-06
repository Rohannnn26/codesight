## Plan: CodeSight AI Code Review Agent Backend

**TL;DR** — Build a production-grade AI code review pipeline as a **Python FastAPI microservice** (using LangGraph for agent orchestration, Azure OpenAI GPT-4o for LLM, Celery + Redis for async job processing) alongside the existing Next.js frontend. Restructure into a monorepo with `/frontend` and `/backend` folders, orchestrated via Docker Compose. The webhook handler in Next.js will forward PR events to the Python backend, which runs a multi-agent LangGraph graph to analyze diffs, generate summaries, inline comments, security findings, and complexity scores — then posts everything back to GitHub as a proper Pull Request Review via Octokit REST API. New Prisma/SQLAlchemy models track PRs, reviews, and comments in the shared Neon Postgres DB.

---

### **Steps**

#### Phase 0: Monorepo Restructure

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

#### Phase 1: Database Schema Extension

4. **Add new Prisma models** in `frontend/prisma/schema.prisma` — These track the review pipeline state:

   - **`PullRequest`** — `id`, `githubPrId` (Int, unique per repo), `number` (Int), `title`, `body`, `state` (enum: OPEN/CLOSED/MERGED), `authorLogin`, `baseBranch`, `headBranch`, `headSha`, `repositoryId` (FK → Repository), `createdAt`, `updatedAt`. Relations: `repository`, `reviews`.
   - **`Review`** — `id`, `pullRequestId` (FK → PullRequest), `status` (enum: PENDING/IN_PROGRESS/COMPLETED/FAILED/SKIPPED), `summary` (Text, nullable), `walkthrough` (Text, nullable), `overallRisk` (enum: LOW/MEDIUM/HIGH/CRITICAL, nullable), `securityFindings` (JSON, nullable), `githubReviewId` (BigInt, nullable — the ID returned after posting to GitHub), `modelUsed` (String), `tokenUsage` (JSON, nullable), `durationMs` (Int, nullable), `errorMessage` (Text, nullable), `createdAt`, `updatedAt`. Relations: `pullRequest`, `comments`.
   - **`ReviewComment`** — `id`, `reviewId` (FK → Review), `filePath` (String), `startLine` (Int, nullable), `endLine` (Int), `body` (Text), `severity` (enum: INFO/WARNING/ERROR/CRITICAL), `category` (enum: BUG/SECURITY/PERFORMANCE/STYLE/LOGIC/SUGGESTION), `suggestion` (Text, nullable — code fix suggestion), `githubCommentId` (BigInt, nullable), `createdAt`. Relations: `review`.
   - **`ReviewSetting`** — `id`, `repositoryId` (FK → Repository, unique), `enabled` (Boolean, default true), `autoReview` (Boolean, default true), `reviewLanguage` (String, default "en"), `ignorePaths` (String[], e.g. `["*.lock", "dist/**"]`), `customInstructions` (Text, nullable), `createdAt`, `updatedAt`. Relations: `repository`.

   Also add relation fields on `Repository`: `pullRequests PullRequest[]`, `reviewSetting ReviewSetting?`

5. **Run `prisma migrate`** to generate the migration.

6. **Mirror models in SQLAlchemy** in `backend/app/models/` — Use `asyncpg` + SQLAlchemy async ORM pointing to the same Neon Postgres. Models must match the Prisma schema exactly (same table names, column names, types). Do NOT run Alembic migrations — Prisma owns the schema.

---

#### Phase 2: Backend Service Skeleton

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

#### Phase 3: Backend File Structure (Complete)

```
backend/app/
├── main.py                          # FastAPI app, routes mount
├── config.py                        # Pydantic Settings
├── celery_app.py                    # Celery instance
├── database.py                      # SQLAlchemy async engine + session factory
│
├── api/
│   ├── __init__.py
│   ├── router.py                    # Aggregates all routers
│   ├── webhooks.py                  # POST /api/webhooks/github
│   ├── reviews.py                   # GET/POST review status & retry
│   └── health.py                    # GET /health
│
├── models/
│   ├── __init__.py
│   ├── base.py                      # SQLAlchemy declarative base
│   ├── repository.py                # Repository model (read-only mirror)
│   ├── pull_request.py              # PullRequest model
│   ├── review.py                    # Review model
│   ├── review_comment.py            # ReviewComment model
│   ├── review_setting.py            # ReviewSetting model
│   └── account.py                   # Account model (read-only, for token retrieval)
│
├── schemas/
│   ├── __init__.py
│   ├── webhook.py                   # GitHub webhook payload schemas
│   ├── review.py                    # Review request/response schemas
│   └── github.py                    # GitHub API response schemas
│
├── services/
│   ├── __init__.py
│   ├── github_service.py            # GitHub API operations (fetch diff, post review, post comments)
│   ├── diff_service.py              # Parse unified diffs, chunk files, filter by settings
│   ├── review_service.py            # Orchestrates the full review pipeline
│   └── token_service.py             # Retrieve GitHub token for a repository's owner
│
├── agents/
│   ├── __init__.py
│   ├── graph.py                     # Main LangGraph StateGraph definition
│   ├── state.py                     # TypedDict state schema for the graph
│   ├── nodes/
│   │   ├── __init__.py
│   │   ├── diff_fetcher.py          # Node: Fetch PR diff from GitHub
│   │   ├── diff_parser.py           # Node: Parse diff into structured file changes
│   │   ├── file_filter.py           # Node: Apply ignore patterns, size limits
│   │   ├── file_reviewer.py         # Node: Per-file AI analysis (parallelized)
│   │   ├── security_scanner.py      # Node: Security-focused analysis
│   │   ├── complexity_scorer.py     # Node: Risk/complexity scoring
│   │   ├── summary_generator.py     # Node: PR summary + walkthrough
│   │   ├── comment_formatter.py     # Node: Format AI output into GitHub review comments
│   │   └── github_poster.py         # Node: Post review + comments to GitHub
│   └── prompts/
│       ├── __init__.py
│       ├── file_review.py           # Prompt template for per-file review
│       ├── security_scan.py         # Prompt template for security analysis
│       ├── summary.py               # Prompt template for PR summary
│       ├── walkthrough.py           # Prompt template for file walkthrough
│       └── system.py                # Shared system prompt (role, guidelines)
│
├── tasks/
│   ├── __init__.py
│   └── review_task.py               # Celery task: trigger_review(pr_id)
│
└── utils/
    ├── __init__.py
    ├── webhook_verify.py            # HMAC-SHA256 webhook signature verification
    ├── token_counter.py             # tiktoken-based token counting
    ├── diff_chunker.py              # Split large diffs into LLM-friendly chunks
    └── markdown.py                  # Markdown formatting helpers for review output
```

---

#### Phase 4: LangGraph Agent Pipeline (Core)

This is the heart of the system — a LangGraph `StateGraph` that processes a PR through multiple AI analysis stages.

11. **Define graph state** in `backend/app/agents/state.py`:
    ```
    ReviewState (TypedDict):
      - pull_request_id: str
      - repository_full_name: str
      - pr_number: int
      - github_token: str
      - base_sha: str
      - head_sha: str
      - raw_diff: str
      - parsed_files: list[FileChange]        # after parsing
      - filtered_files: list[FileChange]       # after filtering
      - file_reviews: list[FileReviewResult]   # per-file AI analysis
      - security_findings: list[SecurityFinding]
      - complexity_scores: dict[str, RiskScore]
      - summary: str
      - walkthrough: str
      - formatted_comments: list[ReviewComment]
      - overall_risk: str                      # LOW/MEDIUM/HIGH/CRITICAL
      - github_review_id: int | None
      - error: str | None
      - review_settings: ReviewSettings
    ```

12. **Build the LangGraph graph** in `backend/app/agents/graph.py`:

    ```
    START
      │
      ▼
    [diff_fetcher]          ─── Fetch PR diff via GitHub API (GET /repos/{owner}/{repo}/pulls/{pr}/files)
      │
      ▼
    [diff_parser]           ─── Parse unified diff into FileChange objects (path, hunks, additions, deletions)
      │
      ▼
    [file_filter]           ─── Apply ignore patterns from ReviewSetting, skip binary files, enforce size limits
      │
      ▼
    [file_reviewer]         ─── FOR EACH file (parallelized via Send()): call Azure OpenAI GPT-4o
      │                         to review code changes, find bugs, style issues, suggestions
      ▼
    [security_scanner]      ─── Aggregate all file changes, run security-focused prompt looking for:
      │                         secrets, SQL injection, XSS, auth bypasses, dependency vulns, etc.
      ▼
    [complexity_scorer]     ─── Score each file's risk (based on change size, criticality, test coverage hints)
      │
      ▼
    [summary_generator]     ─── Generate PR-level summary + file walkthrough table (like CodeRabbit's)
      │
      ▼
    [comment_formatter]     ─── Convert all AI outputs into GitHub-compatible review comment format
      │                         (file path, line numbers, body with markdown)
      ▼
    [github_poster]         ─── Post to GitHub using Pull Request Review API:
      │                         1. Create review with summary as body
      │                         2. Attach inline comments on specific lines
      │                         3. Set review action (COMMENT, not APPROVE/REQUEST_CHANGES)
      ▼
    END
    ```

    Key design decisions:
    - `file_reviewer` uses LangGraph's **`Send()`** API for fan-out parallelism — each file is reviewed concurrently by separate LLM calls
    - All nodes use the **same `ReviewState`** TypedDict, adding their results to it as they complete
    - Error handling: each node catches exceptions and sets `state["error"]` — a conditional edge after each node checks for errors and routes to a `handle_error` node that saves failure status to DB

13. **Implement each agent node** — Each node is a function that takes `ReviewState` and returns a partial state update:

    - **`diff_fetcher`** — Uses `httpx` to call `GET /repos/{owner}/{repo}/pulls/{number}/files` with accept header `application/vnd.github.v3.diff`. Also fetches PR metadata (title, body, labels). Stores raw diff and file list in state.

    - **`diff_parser`** — Uses `unidiff` library to parse the unified diff into structured `FileChange` objects containing: `filename`, `old_path`, `new_path`, `is_new`, `is_deleted`, `is_renamed`, `hunks[]` (each with `old_start`, `new_start`, `changes[]`), `patch` (raw patch text), `additions`, `deletions`.

    - **`file_filter`** — Reads `ReviewSetting.ignorePaths` from state, applies glob matching. Also filters: files > 1000 lines changed, binary files, generated files (lock files, `*.min.js`, `dist/`), vendor directories. Adds a `skipped_files` list with skip reasons.

    - **`file_reviewer`** — The core AI analysis node. For each file, constructs a prompt with: system instructions (role as expert code reviewer), the file's patch/diff, the PR context (title, description), and language-specific guidance. Calls Azure OpenAI GPT-4o. Extracts structured output (JSON mode) with: `issues[]` (each having `line`, `severity`, `category`, `message`, `suggestion`), `praise[]` (good patterns noticed), `file_summary`.

    - **`security_scanner`** — Takes all file changes, constructs a security-focused prompt checking for: hardcoded secrets, injection vulnerabilities, authentication bypasses, insecure crypto, SSRF, path traversal, unsafe deserialization, missing input validation. Returns `SecurityFinding[]` with `severity`, `file`, `line`, `description`, `cwe_id`.

    - **`complexity_scorer`** — Heuristic + AI hybrid scoring. Heuristic factors: lines changed, number of files, change to critical paths (auth, payments, config). AI factor: asks GPT-4o to rate change complexity 1-10 with reasoning. Maps to LOW/MEDIUM/HIGH/CRITICAL.

    - **`summary_generator`** — Generates two outputs:
      1. **PR Summary** — A concise 2-5 sentence description of what the PR does, changes overview, and potential impact.
      2. **Walkthrough table** — Like CodeRabbit's: `| File | Change Summary |` table listing every changed file with a one-line description.

    - **`comment_formatter`** — Converts all `FileReviewResult.issues[]` and `SecurityFinding[]` into GitHub-compatible inline comment objects with: `path`, `line` (or `start_line` + `line` for multi-line), `body` (markdown-formatted with severity emoji, category badge, message, and optional code suggestion in ` ```suggestion` blocks).

    - **`github_poster`** — Uses GitHub REST API `POST /repos/{owner}/{repo}/pulls/{number}/reviews` with:
      - `body` = The full review summary (summary + walkthrough + stats)
      - `event` = `"COMMENT"`
      - `comments[]` = array of inline comment objects
      - Saves the returned `review_id` to DB

14. **Design the review comment format** (posted to GitHub) — Matching CodeRabbit's style:

    **Review body (main comment):**
    ```markdown
    ## 🔍 CodeSight Review

    ### Summary
    {AI-generated summary of the PR}

    ### Walkthrough
    | File | Changes |
    |------|---------|
    | `src/auth.ts` | Added rate limiting to login endpoint |
    | `src/db.ts` | Refactored connection pooling |

    ### Risk Assessment
    **Overall Risk: 🟡 Medium**
    - Security: 1 finding (medium)
    - Complexity: 6/10
    - Files changed: 8

    ---
    <details><summary>📊 Stats</summary>

    - Files reviewed: 8/10
    - Comments: 5 (2 warnings, 3 suggestions)
    - Model: GPT-4o | Tokens: 12,450
    - Duration: 34s
    </details>
    ```

    **Inline comments:**
    ```markdown
    ⚠️ **Warning** | `bug`

    This null check doesn't cover the case where `user.email` is an empty string.

    ```suggestion
    if (!user?.email?.trim()) {
    ```
    ```

---

#### Phase 5: Webhook Flow Integration

15. **Update the Next.js webhook handler** at `frontend/src/app/api/webhooks/github/route.ts` — Instead of processing events itself, it should:
    1. Verify webhook signature using `GITHUB_WEBHOOK_SECRET` (HMAC-SHA256 of raw body vs `x-hub-signature-256` header)
    2. For `pull_request` events with action `opened`, `synchronize`, or `reopened`: forward the payload to the Python backend via HTTP POST to `{BACKEND_URL}/api/webhooks/github`
    3. For `push` events: forward similarly (for future RAG re-indexing)
    4. Return `200` immediately after forwarding

    Alternatively (recommended): **Have the webhook point directly to the Python backend**. Update `createWebhook()` in `frontend/src/modules/github/lib/github.ts` to set the webhook URL to `{BACKEND_URL}/api/webhooks/github` instead of the Next.js route. This is cleaner — the backend handles webhooks end-to-end.

16. **Implement `backend/app/api/webhooks.py`** — The Python webhook receiver:
    1. Verify HMAC-SHA256 signature
    2. Parse `x-github-event` header
    3. For `pull_request` events (`opened`/`synchronize`/`reopened`):
       - Look up the `Repository` in DB by `payload.repository.id` (matching `githubId`)
       - Check if `ReviewSetting.enabled` is true (default: yes if no setting exists)
       - Upsert a `PullRequest` record
       - Create a `Review` record with status `PENDING`
       - Dispatch Celery task `trigger_review.delay(review_id)`
       - Return `202 Accepted`
    4. For `pull_request` events (`closed`): Update PR state in DB
    5. For other events: Return `200` with `{"ignored": true}`

17. **Implement `backend/app/tasks/review_task.py`** — Celery task:
    1. Load `Review` from DB, set status to `IN_PROGRESS`
    2. Load associated `PullRequest`, `Repository`, `ReviewSetting`
    3. Retrieve GitHub token from `Account` table (query by `Repository.userId`)
    4. Build `ReviewState` initial state
    5. Invoke the LangGraph graph: `graph.invoke(initial_state)`
    6. On success: save results (summary, comments, scores) to DB, set status `COMPLETED`
    7. On failure: save error message to DB, set status `FAILED`

---

#### Phase 6: GitHub Service (Posting Reviews)

18. **Implement `backend/app/services/github_service.py`** — Wraps all GitHub API calls:
    - `fetch_pr_diff(token, owner, repo, pr_number)` → raw diff string
    - `fetch_pr_files(token, owner, repo, pr_number)` → list of changed files with patches
    - `fetch_pr_details(token, owner, repo, pr_number)` → PR metadata
    - `post_review(token, owner, repo, pr_number, body, comments, event="COMMENT")` → Creates a pull request review using `POST /repos/{owner}/{repo}/pulls/{number}/reviews`
    - `post_comment(token, owner, repo, pr_number, body)` → Posts a standalone PR comment (for errors/status)
    - `update_review_comment(token, owner, repo, comment_id, body)` → Edits an existing comment

    All calls use `httpx.AsyncClient` with proper headers (`Authorization: Bearer {token}`, `Accept: application/vnd.github.v3+json`).

---

#### Phase 7: Docker Compose Setup

19. **Create `docker-compose.yml`** at project root:
    - **`frontend`** service — Builds from `frontend/Dockerfile`, exposes port 3000, depends on `backend`
    - **`backend`** service — Builds from `backend/Dockerfile`, exposes port 8000, depends on `redis`, environment variables for DB, Redis, Azure OpenAI
    - **`celery-worker`** service — Same image as backend, runs `celery -A app.celery_app worker --loglevel=info --concurrency=4`
    - **`redis`** service — `redis:7-alpine` image, port 6379
    - Shared network for inter-service communication
    - Environment variables loaded from root `.env`

20. **Create `frontend/Dockerfile`** — Multi-stage Node.js build (node:20-alpine → build → runner with `next start`).

21. **Create `backend/Dockerfile`** — Python 3.12-slim, install deps from `pyproject.toml`, run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

---

#### Phase 8: Frontend Integration

22. **Add new env vars** to root `.env`:
    - `GITHUB_WEBHOOK_SECRET` — Generate a strong random secret, configure in webhook creation
    - `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT=gpt-4o`
    - `REDIS_URL=redis://redis:6379/0`
    - `BACKEND_URL=http://backend:8000` (internal Docker network)
    - `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` (for frontend client-side calls)

23. **Update webhook creation** in `frontend/src/modules/github/lib/github.ts` — Add `secret` to webhook config:
    ```
    config: {
      url: webhookUrl,
      content_type: "json",
      secret: process.env.GITHUB_WEBHOOK_SECRET
    }
    ```

24. **Add `/dashboard/reviews` page** — New page that lists all reviews for the user's connected repos. Server action queries `Review` + `PullRequest` + `Repository` joined data. Shows: PR title, repo name, review status, risk level, comment count, timestamp.

25. **Add `/dashboard/repository/[id]/reviews` page** — Per-repo review history with detailed view of each review (summary, comments, scores).

26. **Update dashboard stats** in `frontend/src/modules/dashboard/actions/index.ts` — Replace `totalReviews = 0` placeholder with actual `prisma.review.count({ where: { pullRequest: { repository: { userId } }, status: "COMPLETED" }})`. Replace sample review data in `getMonthlyActivity()` with real `Review` records.

27. **Add review settings UI** under `/dashboard/repository/[id]/settings` — Toggle auto-review, set ignore patterns, add custom review instructions. Uses `ReviewSetting` model.

---

#### Phase 9: Advanced Features

28. **Webhook secret verification** — Both Next.js (if forwarding) and Python backend verify `x-hub-signature-256` header using HMAC-SHA256. Reject requests with invalid signatures with `401`.

29. **Rate limiting** — Add rate limiting on the backend webhook endpoint (e.g., max 10 reviews/minute per repo) to prevent abuse and control Azure OpenAI costs.

30. **Token budget management** — In the `file_reviewer` node, use `tiktoken` to count tokens before sending to GPT-4o. If a file diff exceeds the context window, chunk it using `diff_chunker.py` and process chunks sequentially with context carry-over.

31. **Retry logic** — Celery task retries with exponential backoff on transient failures (GitHub API rate limits, Azure OpenAI 429s). Max 3 retries.

32. **Review deduplication** — If a `synchronize` event arrives (new push to PR branch) while a review is `IN_PROGRESS`, cancel the current review (set status `SKIPPED`) and start a new one for the latest commit.

33. **Incremental reviews** — On `synchronize` events, fetch only the new commits' diff (compare `before` and `after` SHAs) instead of re-reviewing the entire PR. Reference the previous review in the new summary.

---

### **Verification**

1. **Unit tests** — `backend/tests/` with pytest + pytest-asyncio:
   - Test each LangGraph node in isolation with mocked LLM responses
   - Test diff parser with real unified diff samples
   - Test webhook signature verification
   - Test comment formatting output

2. **Integration test** — Create a test PR on a connected repo:
   - Push a branch with intentional bugs (null pointer, SQL injection, missing error handling)
   - Open a PR → verify webhook triggers → verify review appears on the PR within 60s
   - Check review has: summary, walkthrough table, inline comments with correct line numbers, severity badges

3. **Docker verification** — `docker compose up --build` from root, verify:
   - Frontend accessible at `localhost:3000`
   - Backend health check at `localhost:8000/health`
   - Redis connected (Celery logs show "ready")
   - Webhook delivery shows in GitHub → backend logs processing

4. **Dashboard verification** — Login → check `/dashboard` shows real review counts, `/dashboard/reviews` lists completed reviews

---

### **Decisions**

- **Webhook routing: Backend receives webhooks directly** — Cleaner than forwarding from Next.js. Update `createWebhook()` to point to `{BACKEND_URL}/api/webhooks/github`. Alternative (if BACKEND_URL is not publicly accessible): keep Next.js webhook route and have it forward to backend internally via Docker network.
- **Prisma owns DB schema** — SQLAlchemy models in Python are read/write but Prisma runs migrations. No Alembic. This avoids migration conflicts.
- **LangGraph over plain LangChain** — LangGraph's StateGraph gives explicit control over the review pipeline stages, error routing, and parallelized file review (via `Send()`). Much better than a simple chain for this multi-step workflow.
- **`COMMENT` review event, not `APPROVE`/`REQUEST_CHANGES`** — The bot should never block merges. It provides information only. Users can configure strictness later.
- **Per-file parallelism via `Send()`** — Files are reviewed concurrently rather than sequentially, reducing total review time from O(n × latency) to O(latency) for n files.
- **Celery over FastAPI BackgroundTasks** — Reviews can take 30-60s and include multiple LLM calls. Celery provides: retries, task tracking, concurrency control, dead letter handling, and the ability to scale workers independently.
  
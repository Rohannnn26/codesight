<div align="center">

# CodeSight

### AI-Powered Pull Request Reviews for GitHub

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-AI%20Pipeline-orange)](https://langchain-ai.github.io/langgraph/)
[![Azure OpenAI](https://img.shields.io/badge/Azure%20OpenAI-GPT--4o-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

<p align="center">
  <strong>Automate code reviews with AI. Get instant, actionable feedback on every pull request.</strong>
</p>

[Features](#-features) • [How It Works](#-how-it-works) • [Installation](#-installation) • [Configuration](#-configuration) • [Architecture](#-architecture) • [API Reference](#-api-reference)

</div>

---

## Overview

CodeSight is an intelligent code review platform that automatically analyzes your GitHub pull requests using AI. When you open a PR, CodeSight:

- Fetches the diff and analyzes each file in parallel
- Identifies bugs, security issues, and code quality concerns
- Posts detailed inline comments and a comprehensive review summary
- Assigns a risk score to help prioritize reviews

No more waiting for reviewers. Get instant, consistent feedback on every change.

---

## Features

### Automated PR Reviews
- **Instant Analysis** — Reviews triggered automatically on PR open/update
- **Inline Comments** — Precise feedback on specific lines of code
- **Risk Assessment** — LOW/MEDIUM/HIGH/CRITICAL risk scoring
- **Parallel Processing** — Multiple files analyzed simultaneously

### Intelligent Analysis
- **Bug Detection** — Logic errors, null checks, edge cases
- **Security Scanning** — Secrets, injection vulnerabilities, auth issues
- **Performance Issues** — N+1 queries, memory leaks, inefficient patterns
- **Code Style** — Consistency, readability, best practices

### Developer Experience
- **Dashboard** — Track reviews, repos, and trends
- **GitHub Integration** — Native PR comments and review status
- **Real-time Updates** — Watch analysis progress live
- **Customizable** — Ignore paths, custom instructions per repo

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CodeSight Workflow                                │
└─────────────────────────────────────────────────────────────────────────────┘

  GitHub                    CodeSight                         AI Pipeline
    │                          │                                   │
    │  1. PR Opened            │                                   │
    │ ─────────────────────────>                                   │
    │    (webhook)             │                                   │
    │                          │                                   │
    │                          │  2. Queue Review Task             │
    │                          │ ──────────────────────────────────>
    │                          │       (Celery + Redis)            │
    │                          │                                   │
    │                          │                    ┌──────────────┴──────────────┐
    │                          │                    │   LangGraph Pipeline        │
    │                          │                    │                             │
    │                          │                    │  ┌─────────────────────┐    │
    │                          │                    │  │ 1. Fetch Diff       │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 2. Parse Files      │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 3. Filter Files     │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 4. Review Files     │◄───┼─── Parallel
    │                          │                    │  │    (GPT-4o)         │    │    Fan-Out
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 5. Security Scan    │◄───┼─── Fan-In
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 6. Score Complexity │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 7. Generate Summary │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 8. Format Comments  │    │
    │                          │                    │  └──────────┬──────────┘    │
    │                          │                    │             │               │
    │                          │                    │  ┌──────────▼──────────┐    │
    │                          │                    │  │ 9. Post to GitHub   │    │
    │                          │                    │  └─────────────────────┘    │
    │                          │                    │                             │
    │                          │                    └─────────────────────────────┘
    │                          │                                   │
    │  3. Review Posted        │                                   │
    │ <─────────────────────────────────────────────────────────────
    │    (inline comments +    │
    │     review summary)      │
    │                          │
```

### Pipeline Stages

| Stage | Description |
|-------|-------------|
| **1. Diff Fetcher** | Retrieves PR files and metadata from GitHub API |
| **2. Diff Parser** | Converts raw GitHub data into structured file objects |
| **3. File Filter** | Removes binaries, generated files, and oversized diffs |
| **4. File Reviewer** | AI analyzes each file in parallel using GPT-4o |
| **5. Security Scanner** | Cross-file security analysis for vulnerabilities |
| **6. Complexity Scorer** | Calculates overall PR risk score (1-10) |
| **7. Summary Generator** | Creates human-readable review summary |
| **8. Comment Formatter** | Formats findings as GitHub-compatible comments |
| **9. GitHub Poster** | Posts review with inline comments to the PR |

---

## Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ and [uv](https://github.com/astral-sh/uv) package manager
- **PostgreSQL** 14+
- **Redis** 7+
- **Azure OpenAI** API access (GPT-4o deployment)
- **GitHub OAuth App** credentials

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/codesight.git
cd codesight

# Set up the backend
cd backend
uv sync                           # Install Python dependencies
cp .env.example .env              # Copy environment template
# Edit .env with your credentials

# Set up the frontend
cd ../frontend
npm install                       # Install Node dependencies
cp .env.example .env              # Copy environment template
# Edit .env with your credentials

# Initialize the database
npx prisma db push                # Create tables
npx prisma generate               # Generate Prisma client

# Start all services (3 terminals)

# Terminal 1: Backend API
cd backend
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Celery Worker
cd backend
uv run celery -A app.celery_app worker --loglevel=info --pool=solo

# Terminal 3: Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Docker Compose (Alternative)

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    depends_on:
      - redis

  celery:
    build: ./backend
    command: celery -A app.celery_app worker --loglevel=info
    env_file: ./backend/.env
    depends_on:
      - redis
      - backend

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: ./frontend/.env
    depends_on:
      - backend
```

---

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/codesight

# Redis (Celery broker)
REDIS_URL=redis://localhost:6379/0

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Application
CODESIGHT_BOT_NAME=CodeSight
MAX_DIFF_SIZE=50000
MAX_FILES_PER_REVIEW=50
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
# Database (same PostgreSQL instance)
DATABASE_URL=postgresql://user:password@localhost:5432/codesight

# Better Auth
BETTER_AUTH_SECRET=your_random_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GITHUB_REPO_ACCESS=private  # 'public' or 'private'

# Backend URL
BACKEND_URL=http://localhost:8000

# Public URL (for webhooks)
NEXT_PUBLIC_BASE_URL=https://your-public-domain.com
```

### GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App:
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to your `.env`

### GitHub Webhook Setup

After connecting a repository in the dashboard:

1. The webhook is automatically created pointing to your backend
2. Ensure your backend is publicly accessible (use ngrok for local dev)
3. Events: `pull_request` (opened, synchronize, reopened, closed)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CodeSight Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│     GitHub       │────▶│    Frontend      │────▶│    Backend       │
│                  │     │   (Next.js)      │     │   (FastAPI)      │
│   - OAuth        │     │                  │     │                  │
│   - Webhooks     │     │   - Dashboard    │     │   - Webhooks     │
│   - API          │     │   - Auth         │     │   - AI Pipeline  │
│                  │     │   - UI           │     │   - API          │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │                        │                        │
         │                        ▼                        ▼
         │               ┌──────────────────┐     ┌──────────────────┐
         │               │                  │     │                  │
         │               │   PostgreSQL     │◀────│     Redis        │
         │               │                  │     │                  │
         │               │   - Users        │     │   - Task Queue   │
         │               │   - Repos        │     │   - Caching      │
         │               │   - PRs          │     │                  │
         │               │   - Reviews      │     │                  │
         │               └──────────────────┘     └────────┬─────────┘
         │                                                 │
         │                                                 ▼
         │                                        ┌──────────────────┐
         │                                        │                  │
         └───────────────────────────────────────▶│  Celery Worker   │
                      Posts Reviews               │                  │
                                                  │  - LangGraph     │
                                                  │  - GPT-4o        │
                                                  │                  │
                                                  └──────────────────┘
```

### Tech Stack

<table>
<tr>
<td valign="top" width="50%">

#### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI components |
| Better Auth | Authentication |
| Prisma | ORM |
| React Query | Data fetching |
| Recharts | Visualizations |

</td>
<td valign="top" width="50%">

#### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | API framework |
| LangGraph | AI pipeline orchestration |
| Azure OpenAI | LLM (GPT-4o) |
| Celery | Task queue |
| Redis | Message broker |
| SQLAlchemy | Async ORM |
| Pydantic | Validation |
| StructLog | Logging |

</td>
</tr>
</table>

### Database Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Repository │       │ PullRequest │       │   Review    │
├─────────────┤       ├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │──┐    │ id          │──┐    │ id          │──┐    │ id          │
│ name        │  │    │ githubId    │  │    │ githubId    │  │    │ githubprId  │
│ email       │  │    │ name        │  │    │ number      │  │    │ status      │
│ image       │  │    │ owner       │  │    │ state       │  │    │ summary     │
│ createdAt   │  │    │ fullName    │  │    │ title       │  │    │ state       │
│ updatedAt   │  │    │ url         │  │    │ body        │  │    │ body        │
└─────────────┘  │    │ userId ─────┼──┘    │ author      │  │    │ pullRequestId
                 │    │ createdAt   │       │ baseBranch  │  │    │ createdAt   │
   ┌─────────────┤    │ updatedAt   │       │ headBranch  │  │    │ updatedAt   │
   │             │    └─────────────┘       │ headSha     │  │    └─────────────┘
   │             │           │              │ url         │  │           │
   │             │           │              │ repositoryId┼──┘           │
   ▼             │           │              │ createdAt   │              │
┌─────────────┐  │           │              │ updatedAt   │              │
│   Account   │  │           └──────────────┼─────────────┼──────────────┘
├─────────────┤  │                          └─────────────┘
│ id          │  │
│ providerId  │  │              Status Flow
│ accountId   │  │    ┌─────────────────────────────────────┐
│ accessToken │  │    │                                     │
│ userId ─────┼──┘    │  pending ──▶ in_progress ──▶ completed
│ createdAt   │       │                    │                │
│ updatedAt   │       │                    ▼                │
└─────────────┘       │                 failed              │
                      │                    │                │
                      │                    ▼                │
                      │                 skipped             │
                      └─────────────────────────────────────┘
```

---

## Project Structure

```
codesight/
├── backend/                      # Python FastAPI backend
│   ├── app/
│   │   ├── agents/              # LangGraph AI pipeline
│   │   │   ├── nodes/           # Pipeline stages (9 nodes)
│   │   │   │   ├── diff_fetcher.py
│   │   │   │   ├── diff_parser.py
│   │   │   │   ├── file_filter.py
│   │   │   │   ├── file_reviewer.py
│   │   │   │   ├── security_scanner.py
│   │   │   │   ├── complexity_scorer.py
│   │   │   │   ├── summary_generator.py
│   │   │   │   ├── comment_formatter.py
│   │   │   │   └── github_poster.py
│   │   │   ├── prompts/         # AI prompt templates
│   │   │   ├── graph.py         # StateGraph definition
│   │   │   └── state.py         # State TypedDict
│   │   ├── api/                 # FastAPI routes
│   │   │   ├── webhooks.py      # GitHub webhook handler
│   │   │   ├── reviews.py       # Review endpoints
│   │   │   └── health.py        # Health check
│   │   ├── models/              # SQLAlchemy models
│   │   ├── services/            # Business logic
│   │   │   ├── github_service.py
│   │   │   ├── token_service.py
│   │   │   └── diff_service.py
│   │   ├── tasks/               # Celery tasks
│   │   │   └── review_task.py   # Main review orchestrator
│   │   ├── config.py            # Settings (Pydantic)
│   │   ├── database.py          # Async SQLAlchemy setup
│   │   ├── celery_app.py        # Celery configuration
│   │   └── main.py              # FastAPI app
│   ├── tests/                   # Backend tests
│   ├── pyproject.toml           # Python dependencies (uv)
│   └── .env                     # Environment variables
│
├── frontend/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── (auth)/          # Auth routes (login, etc.)
│   │   │   ├── dashboard/       # Dashboard pages
│   │   │   │   ├── page.tsx           # Main dashboard
│   │   │   │   ├── repository/        # Repo management
│   │   │   │   ├── reviews/           # Review history
│   │   │   │   ├── settings/          # User settings
│   │   │   │   └── subscription/      # Plans
│   │   │   ├── api/             # API routes
│   │   │   │   └── webhooks/    # Webhook proxy
│   │   │   └── layout.tsx       # Root layout
│   │   ├── components/          # Shared components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   └── app-sidebar.tsx
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/            # Authentication
│   │   │   ├── github/          # GitHub integration
│   │   │   ├── dashboard/       # Dashboard logic
│   │   │   ├── repository/      # Repository module
│   │   │   └── landing/         # Landing page
│   │   └── lib/                 # Core utilities
│   │       ├── auth.ts          # Better Auth config
│   │       ├── db.ts            # Prisma client
│   │       └── utils.ts         # Helpers
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # DB migrations
│   ├── package.json             # Node dependencies
│   └── .env                     # Environment variables
│
├── docs/                         # Documentation
└── README.md                     # This file
```

---

## API Reference

### Webhook Endpoint

```http
POST /api/webhooks/github
```

Receives GitHub webhook events for PR activity.

**Headers:**
- `X-GitHub-Event`: Event type (`pull_request`, `push`, `ping`)
- `X-Hub-Signature-256`: HMAC signature for verification

**Supported Events:**
- `pull_request.opened` — Triggers new review
- `pull_request.synchronize` — Triggers re-review
- `pull_request.reopened` — Triggers re-review
- `pull_request.closed` — Updates PR state

### Health Check

```http
GET /health
```

Returns service health status.

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

## Development

### Running Tests

```bash
# Backend tests
cd backend
uv run pytest --cov=app

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Backend (Ruff)
cd backend
uv run ruff check .
uv run ruff format .

# Frontend (ESLint)
cd frontend
npm run lint
```

### Database Migrations

```bash
# Create migration
cd frontend
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

---

## Roadmap

- [x] Automated PR review pipeline
- [x] GitHub OAuth integration
- [x] Dashboard with review history
- [x] Risk scoring and security scanning
- [ ] Custom review rules per repository
- [ ] Slack/Teams notifications
- [ ] Multi-language support
- [ ] Self-hosted enterprise mode
- [ ] Release quality gates
- [ ] Repository health scorecards

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with AI for developers who value quality code.**

[Report Bug](https://github.com/yourusername/codesight/issues) • [Request Feature](https://github.com/yourusername/codesight/issues)

</div>

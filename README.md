# CodeSight

CodeSight is an AI-powered pull request review platform built for GitHub repositories. It helps teams automate review workflows, surface risky changes quickly, and ship safer code with less manual overhead.

## Core Capabilities

- Automated PR review workflows
- GitHub authentication and repository access
- Dashboard experience for review/navigation workflows
- GitHub GraphQL integration (contributions and repository-linked data)
- Extensible AI orchestration layer (currently Inngest-based)

## Tech Stack

### App & Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Radix primitives (`radix-ui`)
- Lucide icons
- `next-themes`

### Backend & Data

- Better Auth (GitHub OAuth)
- Prisma ORM
- PostgreSQL
- `@prisma/adapter-pg` + `pg`

### Integrations & Tooling

- GitHub API (via `octokit`)
- React Query (`@tanstack/react-query`)
- Zod
- ESLint

### AI Orchestration

- Current direction: Inngest-driven AI workflows
- Planned evolution: LangChain / LangGraph for deeper orchestration control

## Project Structure

```text
src/
	app/                    # Next.js app routes and layouts
	components/             # Shared UI and layout components
	generated/prisma/       # Generated Prisma client output
	lib/                    # Core auth/db/shared utilities
	modules/
		auth/                 # Auth-specific components, utils, actions
		github/               # GitHub API integration logic
prisma/
	schema.prisma           # Database schema
	migrations/             # Prisma migrations
```

## Environment Variables

Create a `.env` file in the project root with values like:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB"

# Better Auth / App URL
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# GitHub OAuth App
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Optional: control GitHub scopes for repo access (public/private)
GITHUB_REPO_ACCESS="public"

# Optional: app-level GitHub token for service-side operations
GITHUB_TOKEN=""
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Push Prisma schema to your database:

```bash
npx prisma db push
```

3. Start development server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run start` — start built app
- `npm run lint` — run linting

## Current Architecture Notes

- Auth uses Better Auth with Prisma adapter and GitHub as social provider.
- User GitHub access tokens are retrieved from the linked auth account record.
- GitHub data fetching is implemented with Octokit (REST/GraphQL capable).
- UI uses a graphite-styled dashboard + sidebar system with shadcn primitives.

## Roadmap

- Full automated PR review pipeline with AI-generated summaries and inline comments
- Stronger review context (diff-aware code reasoning, file-level risk scoring)
- LangChain/LangGraph migration for agentic and multi-step review control
- Potential migration from direct GitHub API usage to GitHub MCP-based workflows

## Additional Future Features (Beyond PR Reviews)

- Release quality gates (block deploys on unresolved high-risk findings)
- Repository health scorecards (maintainability, test quality, security posture)
- Engineering analytics (review latency, churn hotspots, ownership trends)
- Team policy engine (convention checks, compliance checks, mandatory reviewers)
- Incident learning loop (auto-suggest preventive checks from past incidents)
- AI-assisted test generation and regression test recommendations
- Secret/security drift detection with historical trend reporting
- Multi-repo portfolio dashboard for org-wide visibility
- Slack/Teams notifications and approval workflows
- Self-hosted enterprise mode with audit logs and RBAC

## License

Add your preferred license here (MIT, Apache-2.0, or proprietary).

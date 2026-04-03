"use server"

import { unstable_cache } from "next/cache"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Octokit } from "octokit"
import prisma from "@/lib/db"
import { fetchUserContributions, getGitHubToken } from "@/modules/github/lib/github"

// ── Cached GitHub API calls ────────────────────────────────────────────────
// These are expensive (100-400ms each). unstable_cache stores the result
// on the Next.js server for `revalidate` seconds, so page refreshes and
// re-mounts within the window skip the GitHub API entirely.
//
// NOTE: auth session checks are OUTSIDE the cache because they use headers().
// We pass userId + token as arguments — unstable_cache auto-includes them
// in the cache key, so each user gets their own isolated cache entry.

const _cachedGitHubStats = unstable_cache(
    async (token: string, username: string) => {
        const octokit = new Octokit({ auth: token })
        const [calendar, prsResult] = await Promise.all([
            fetchUserContributions(token, username),
            octokit.rest.search.issuesAndPullRequests({
                q: `is:pr author:${username}`,
                per_page: 1,
            }),
        ])
        return {
            totalCommits: calendar?.totalContributions ?? 0,
            totalPRs: prsResult.data.total_count,
        }
    },
    ["github-stats"],
    { revalidate: 60 * 15 } // 15 minutes
)

const _cachedContributions = unstable_cache(
    async (token: string, username: string) => {
        const calendar = await fetchUserContributions(token, username)
        if (!calendar) return null
        const contributions = calendar.weeks.flatMap((week: any) =>
            week.contributionDays.map((day: any) => ({
                date: day.date,
                count: day.contributionCount,
                level: Math.min(4, Math.floor(day.contributionCount / 3)),
            }))
        )
        return { contributions, totalContributions: calendar.totalContributions }
    },
    ["github-contributions"],
    { revalidate: 60 * 60 * 4 } // 4 hours — contribution graph is daily data
)

const _cachedMonthlyCommitsAndPRs = unstable_cache(
    async (token: string, username: string) => {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const octokit = new Octokit({ auth: token })
        const [calendar, prsResult] = await Promise.all([
            fetchUserContributions(token, username),
            octokit.rest.search.issuesAndPullRequests({
                q: `author:${username} type:pr created:>${sixMonthsAgo.toISOString().split("T")[0]}`,
                per_page: 100,
            }),
        ])

        return {
            calendarWeeks: calendar?.weeks ?? [],
            prItems: prsResult.data.items,
        }
    },
    ["github-monthly"],
    { revalidate: 60 * 60 } // 1 hour
)

// ── Helper: get authenticated GitHub username ──────────────────────────────
// Called outside the cache because it uses the token directly.
// Cached separately to avoid calling it in every action independently.
const _cachedGetUsername = unstable_cache(
    async (token: string) => {
        const octokit = new Octokit({ auth: token })
        const { data: user } = await octokit.rest.users.getAuthenticated()
        return {
            username: user.login,
            totalRepos: user.public_repos + (user.total_private_repos ?? 0),
        }
    },
    ["github-user"],
    { revalidate: 60 * 60 * 6 } // 6 hours — username/repo count rarely changes
)

// ── Server Actions ─────────────────────────────────────────────────────────

export async function getContributionStats() {
    try {
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session?.user) throw new Error("Unauthorized")

        const token = await getGitHubToken()
        const { username } = await _cachedGetUsername(token)

        return await _cachedContributions(token, username)
    } catch (error) {
        console.error("Error fetching contribution stats:", error)
        return null
    }
}

export async function getDashboardStats() {
    try {
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session?.user) throw new Error("Not authenticated")

        // Fetch all stats from DB in parallel (CodeSight-focused metrics)
        const [connectedRepos, totalReviews, completedReviews, pendingReviews, failedReviews] = await Promise.all([
            prisma.repository.count({
                where: { userId: session.user.id },
            }),
            prisma.review.count({
                where: {
                    pullRequest: { repository: { userId: session.user.id } },
                },
            }),
            prisma.review.count({
                where: {
                    status: "completed",
                    pullRequest: { repository: { userId: session.user.id } },
                },
            }),
            prisma.review.count({
                where: {
                    status: { in: ["pending", "in_progress"] },
                    pullRequest: { repository: { userId: session.user.id } },
                },
            }),
            prisma.review.count({
                where: {
                    status: "failed",
                    pullRequest: { repository: { userId: session.user.id } },
                },
            }),
        ])

        // Calculate success rate
        const successRate = totalReviews > 0
            ? Math.round((completedReviews / totalReviews) * 100)
            : 0

        // Issues found is a placeholder for now (future: aggregate from review data)
        const issuesFound = 0

        return {
            connectedRepos,
            totalReviews,
            completedReviews,
            pendingReviews,
            failedReviews,
            issuesFound,
            successRate
        }
    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        return {
            connectedRepos: 0,
            totalReviews: 0,
            completedReviews: 0,
            pendingReviews: 0,
            failedReviews: 0,
            issuesFound: 0,
            successRate: 0
        }
    }
}

export async function getMonthlyActivity() {
    try {
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session?.user) throw new Error("Unauthorized")

        const token = await getGitHubToken()
        const { username } = await _cachedGetUsername(token)

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        // Run GitHub API (cached) + DB query in parallel
        const [{ calendarWeeks, prItems }, dbReviews] = await Promise.all([
            _cachedMonthlyCommitsAndPRs(token, username),
            // Real review data from DB
            prisma.review.findMany({
                where: {
                    status: "completed",
                    createdAt: { gte: sixMonthsAgo },
                    pullRequest: { repository: { userId: session.user.id } },
                },
                select: { createdAt: true },
            }),
        ])

        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        const monthlyData: { [key: string]: { commits: number; prs: number; reviews: number } } = {}

        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            monthlyData[monthNames[date.getMonth()]] = { commits: 0, prs: 0, reviews: 0 }
        }

        calendarWeeks.forEach((week: any) => {
            week.contributionDays.forEach((day: any) => {
                const key = monthNames[new Date(day.date).getMonth()]
                if (monthlyData[key]) monthlyData[key].commits += day.contributionCount
            })
        })

        prItems.forEach((pr: any) => {
            const key = monthNames[new Date(pr.created_at).getMonth()]
            if (monthlyData[key]) monthlyData[key].prs += 1
        })

        dbReviews.forEach((review) => {
            const key = monthNames[review.createdAt.getMonth()]
            if (monthlyData[key]) monthlyData[key].reviews += 1
        })

        return Object.keys(monthlyData).map((name) => ({ name, ...monthlyData[name] }))
    } catch (error) {
        console.error("Error fetching monthly activity:", error)
        return []
    }
}

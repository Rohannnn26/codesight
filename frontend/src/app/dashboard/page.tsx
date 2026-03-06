"use client"

import React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  GitCommit,
  GitPullRequest,
  MessageSquare,
  GitBranch,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import {
  getDashboardStats,
  getMonthlyActivity,
} from "@/modules/dashboard/actions"
import ContributionGraph from "@/modules/dashboard/components/contribution-graph"

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

const statCardClass =
  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 cursor-default"

const MainPage = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => await getDashboardStats(),
    refetchOnWindowFocus: false,
  })

  const { data: monthlyActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["monthly-activity"],
    queryFn: async () => await getMonthlyActivity(),
    refetchOnWindowFocus: false,
  })

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your coding activity and AI reviews
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card className={statCardClass}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalRepos || 0}</div>
                <p className="text-xs text-muted-foreground">Connected repositories</p>
              </CardContent>
            </Card>

            <Card className={statCardClass}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Commits</CardTitle>
                <GitCommit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats?.totalCommits || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In the last year</p>
              </CardContent>
            </Card>

            <Card className={statCardClass}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pull Requests</CardTitle>
                <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalPRs || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card className={statCardClass}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Reviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalReviews || 0}</div>
                <p className="text-xs text-muted-foreground">Generated reviews</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Contribution Activity — above monthly chart */}
      <Card className="transition-all hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both delay-100">
        <CardHeader>
          <CardTitle>Contribution Activity</CardTitle>
          <CardDescription>
            Visualizing your coding frequency over the last year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContributionGraph />
        </CardContent>
      </Card>

      {/* Monthly Activity */}
      <Card className="transition-all hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both delay-150">
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
          <CardDescription>
            Commits, PRs, and reviews over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {isLoadingActivity ? (
              <div className="flex h-full flex-col gap-3 pt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-end gap-3">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton
                      className="rounded-sm"
                      style={{ height: `${30 + Math.sin(i) * 20 + i * 10}px`, width: "100%" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="commits" fill="var(--color-chart-1)" name="Commits" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prs" fill="var(--color-chart-2)" name="PRs" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reviews" fill="var(--color-chart-3)" name="Reviews" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MainPage

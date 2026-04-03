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
  FolderGit2,
  Bot,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import {
  getDashboardStats,
  getMonthlyActivity,
} from "@/modules/dashboard/actions"
import ContributionGraph from "@/modules/dashboard/components/contribution-graph"

function StatCardSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-24 mt-3" />
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
  context: string
  contextColor?: string
  delay: number
}

function StatCard({ icon, iconBg, label, value, context, contextColor = "text-muted-foreground", delay }: StatCardProps) {
  return (
    <Card
      className="bg-gradient-to-br from-card to-muted/20 border border-border/50 rounded-xl shadow-sm
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20
                 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
        <p className={`text-xs mt-3 ${contextColor}`}>
          {context}
        </p>
      </CardContent>
    </Card>
  )
}

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
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your connected repositories and AI reviews
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={<FolderGit2 className="h-5 w-5 text-violet-500" />}
              iconBg="bg-violet-500/10"
              label="Connected Repos"
              value={stats?.connectedRepos || 0}
              context="Repositories with active webhooks"
              delay={0}
            />
            <StatCard
              icon={<Bot className="h-5 w-5 text-emerald-500" />}
              iconBg="bg-emerald-500/10"
              label="AI Reviews"
              value={stats?.completedReviews || 0}
              context={`${stats?.pendingReviews || 0} pending, ${stats?.failedReviews || 0} failed`}
              contextColor={stats?.pendingReviews ? "text-amber-500" : "text-muted-foreground"}
              delay={75}
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5 text-orange-500" />}
              iconBg="bg-orange-500/10"
              label="Issues Found"
              value={stats?.issuesFound || 0}
              context="Detected across all reviews"
              delay={150}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />}
              iconBg="bg-blue-500/10"
              label="Success Rate"
              value={`${stats?.successRate || 0}%`}
              context={`${stats?.completedReviews || 0} of ${stats?.totalReviews || 0} completed`}
              delay={225}
            />
          </>
        )}
      </div>

      {/* Contribution Activity */}
      <Card
        className="border border-border/50 rounded-xl shadow-sm transition-all duration-200 hover:border-primary/20
                   animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <CardHeader>
          <CardTitle>Contribution Activity</CardTitle>
          <CardDescription>
            Your coding frequency over the last year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContributionGraph />
        </CardContent>
      </Card>

      {/* Monthly Activity */}
      <Card
        className="border border-border/50 rounded-xl shadow-sm transition-all duration-200 hover:border-primary/20
                   animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
          <CardDescription>
            Commits, PRs, and AI reviews over the last 6 months
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

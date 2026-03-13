import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitPullRequest, ShieldCheck, Clock, CheckCircle2, XCircle, SkipForward } from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    completed:   { label: "Completed",   variant: "default",     icon: <CheckCircle2 className="w-3 h-3" /> },
    in_progress: { label: "In Progress", variant: "secondary",   icon: <Clock className="w-3 h-3 animate-spin" /> },
    pending:     { label: "Pending",     variant: "outline",     icon: <Clock className="w-3 h-3" /> },
    failed:      { label: "Failed",      variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
    skipped:     { label: "Skipped",     variant: "outline",     icon: <SkipForward className="w-3 h-3" /> },
}

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
    LOW:      { label: "Low Risk",      color: "text-green-500" },
    MEDIUM:   { label: "Medium Risk",   color: "text-yellow-500" },
    HIGH:     { label: "High Risk",     color: "text-orange-500" },
    CRITICAL: { label: "Critical Risk", color: "text-red-500" },
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ReviewsPage() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) redirect("/login")

    const reviews = await prisma.review.findMany({
        where: {
            pullRequest: {
                repository: { userId: session.user.id },
            },
        },
        include: {
            pullRequest: {
                include: {
                    repository: {
                        select: { fullName: true, url: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    })

    const totalCompleted = reviews.filter((r) => r.status === "completed").length
    const totalFailed    = reviews.filter((r) => r.status === "failed").length
    const totalPending   = reviews.filter((r) => r.status === "pending" || r.status === "in_progress").length

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">AI Reviews</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Automated code reviews for your connected repositories
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-2xl font-bold">{totalCompleted}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-2xl font-bold">{totalPending}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">In Progress</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-2xl font-bold">{totalFailed}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Failed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Reviews list */}
            {reviews.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg">No reviews yet</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            Connect a repository and open a pull request to trigger your first AI review.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {reviews.map((review) => {
                        const pr = review.pullRequest
                        const repo = pr.repository
                        const statusCfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.pending
                        const riskCfg = review.state ? RISK_CONFIG[review.state] : null

                        return (
                            <Card key={review.id} className="hover:bg-muted/30 transition-colors">
                                <CardContent className="flex items-start justify-between gap-4 pt-4 pb-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <GitPullRequest className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                        <div className="min-w-0">
                                            {/* PR title */}
                                            <a
                                                href={pr.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-sm hover:underline truncate block"
                                            >
                                                {pr.title}
                                            </a>
                                            {/* Repo + PR number */}
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                <a
                                                    href={repo.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {repo.fullName}
                                                </a>
                                                {" "}#{pr.number}
                                            </p>
                                            {/* Summary */}
                                            {review.summary && (
                                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                                    {review.summary}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right side: status + risk + time */}
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <Badge variant={statusCfg.variant} className="flex items-center gap-1 text-xs">
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </Badge>
                                        {riskCfg && review.status === "completed" && (
                                            <span className={`text-xs font-medium ${riskCfg.color}`}>
                                                {riskCfg.label}
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {timeAgo(review.createdAt)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    GitPullRequest,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    SkipForward,
    Shield,
    AlertTriangle,
    AlertCircle,
    Skull,
    Loader2,
} from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ReactNode
    borderColor: string
    bgColor: string
}> = {
    completed: {
        label: "Completed",
        variant: "default",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        borderColor: "border-l-emerald-500",
        bgColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    in_progress: {
        label: "Analyzing",
        variant: "secondary",
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        borderColor: "border-l-blue-500",
        bgColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    pending: {
        label: "Pending",
        variant: "outline",
        icon: <Clock className="w-3.5 h-3.5" />,
        borderColor: "border-l-amber-500",
        bgColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    failed: {
        label: "Failed",
        variant: "destructive",
        icon: <XCircle className="w-3.5 h-3.5" />,
        borderColor: "border-l-red-500",
        bgColor: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    skipped: {
        label: "Skipped",
        variant: "outline",
        icon: <SkipForward className="w-3.5 h-3.5" />,
        borderColor: "border-l-gray-400",
        bgColor: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    },
}

const RISK_CONFIG: Record<string, {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
}> = {
    LOW: {
        label: "Low Risk",
        icon: <Shield className="w-3.5 h-3.5" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
    },
    MEDIUM: {
        label: "Medium Risk",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-500/10",
    },
    HIGH: {
        label: "High Risk",
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10",
    },
    CRITICAL: {
        label: "Critical",
        icon: <Skull className="w-3.5 h-3.5" />,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
    },
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
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
    const totalFailed = reviews.filter((r) => r.status === "failed").length
    const totalPending = reviews.filter((r) => r.status === "pending" || r.status === "in_progress").length

    return (
        <div className="flex flex-col gap-8 p-8">
            {/* Header */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h1 className="text-3xl font-bold tracking-tight">AI Reviews</h1>
                <p className="text-muted-foreground mt-1">
                    Automated code reviews for your connected repositories
                </p>
            </div>

            {/* Summary stats bar */}
            <div
                className="flex flex-wrap items-center gap-6 p-5 bg-card border border-border/50 rounded-xl shadow-sm
                           animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: "50ms", animationFillMode: "both" }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold">{totalCompleted}</span>
                        <span className="text-sm text-muted-foreground ml-2">Completed</span>
                    </div>
                </div>
                <div className="w-px h-8 bg-border hidden sm:block" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold">{totalPending}</span>
                        <span className="text-sm text-muted-foreground ml-2">In Progress</span>
                    </div>
                </div>
                <div className="w-px h-8 bg-border hidden sm:block" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold">{totalFailed}</span>
                        <span className="text-sm text-muted-foreground ml-2">Failed</span>
                    </div>
                </div>
            </div>

            {/* Reviews list */}
            {reviews.length === 0 ? (
                <Card
                    className="border border-border/50 rounded-xl shadow-sm
                               animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: "100ms", animationFillMode: "both" }}
                >
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                            <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-xl">No reviews yet</h3>
                        <p className="text-muted-foreground mt-2 max-w-md">
                            Connect a repository and open a pull request to trigger your first AI-powered code review.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col gap-4">
                    {reviews.map((review, index) => {
                        const pr = review.pullRequest
                        const repo = pr.repository
                        const statusCfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.pending
                        const riskCfg = review.state ? RISK_CONFIG[review.state] : null

                        return (
                            <Card
                                key={review.id}
                                className={`border border-border/50 rounded-xl shadow-sm border-l-4 ${statusCfg.borderColor}
                                           transition-all duration-200 hover:bg-muted/30 hover:border-primary/20 hover:-translate-y-0.5
                                           animate-in fade-in slide-in-from-bottom-4 duration-500`}
                                style={{ animationDelay: `${100 + index * 50}ms`, animationFillMode: "both" }}
                            >
                                <CardContent className="p-5">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                                                <GitPullRequest className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <a
                                                    href={pr.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-base hover:text-primary hover:underline transition-colors line-clamp-1"
                                                >
                                                    {pr.title}
                                                </a>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    <a
                                                        href={repo.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        {repo.fullName}
                                                    </a>
                                                    {" "}#{pr.number} • {timeAgo(review.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <Badge
                                            variant="outline"
                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium shrink-0 ${statusCfg.bgColor}`}
                                        >
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </Badge>
                                    </div>

                                    {/* Summary preview (for completed reviews) */}
                                    {review.status === "completed" && review.summary && (
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 pl-11">
                                            {review.summary}
                                        </p>
                                    )}

                                    {/* Progress bar (for in_progress reviews) */}
                                    {review.status === "in_progress" && (
                                        <div className="pl-11 mb-4">
                                            <div className="flex gap-1">
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 flex-1 rounded-full ${
                                                            i < 2 ? "bg-blue-500" : "bg-muted"
                                                        }`}
                                                        style={{
                                                            animation: i < 2 ? "pulse 1.5s ease-in-out infinite" : "none",
                                                            animationDelay: `${i * 200}ms`,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Analyzing files...
                                            </p>
                                        </div>
                                    )}

                                    {/* Footer row (for completed reviews) */}
                                    {review.status === "completed" && (
                                        <div className="flex items-center gap-4 pl-11 text-xs">
                                            {riskCfg && (
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${riskCfg.bgColor} ${riskCfg.color}`}>
                                                    {riskCfg.icon}
                                                    {riskCfg.label}
                                                </span>
                                            )}
                                            {/* Placeholder for future features */}
                                            {/* <span className="text-muted-foreground flex items-center gap-1">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                3 Comments
                                            </span>
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Zap className="w-3.5 h-3.5" />
                                                12s analysis
                                            </span> */}
                                        </div>
                                    )}

                                    {/* Error message (for failed reviews) */}
                                    {review.status === "failed" && review.body && (
                                        <p className="text-sm text-red-500 dark:text-red-400 pl-11 line-clamp-2">
                                            {review.body.replace("Review failed: ", "")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

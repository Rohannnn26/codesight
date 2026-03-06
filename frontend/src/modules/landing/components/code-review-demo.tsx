"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

interface Review {
  afterLine: number;
  severity: "critical" | "warning" | "suggestion";
  label: string;
  text: string;
}

const reviews: Review[] = [
  {
    afterLine: 2,
    severity: "critical",
    label: "Critical",
    text: "SQL Injection — user input is directly interpolated into the query. Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [userId])",
  },
  {
    afterLine: 7,
    severity: "warning",
    label: "Warning",
    text: "Unsafe type — parameter 'data' uses 'any'. Define a typed interface: { name: string; email: string; role: string }",
  },
  {
    afterLine: 8,
    severity: "suggestion",
    label: "Suggestion",
    text: "Missing validation — validate required fields and sanitize inputs before database insertion.",
  },
];

const severityConfig = {
  critical: {
    border: "border-l-red-500/70",
    bg: "bg-red-500/[0.06]",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  warning: {
    border: "border-l-amber-500/70",
    bg: "bg-amber-500/[0.06]",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  suggestion: {
    border: "border-l-blue-500/70",
    bg: "bg-blue-500/[0.06]",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
};

const lineHighlights: Record<number, string> = {
  2: "bg-red-500/[0.06]",
  7: "bg-amber-500/[0.06]",
  8: "bg-blue-500/[0.06]",
};

export default function CodeReviewDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-50px" });
  const [visibleReviews, setVisibleReviews] = useState<Set<number>>(new Set());
  const [charCounts, setCharCounts] = useState<number[]>([0, 0, 0]);
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set());
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete">("idle");
  const [cycleKey, setCycleKey] = useState(0);

  const resetState = useCallback(() => {
    setVisibleReviews(new Set());
    setCharCounts([0, 0, 0]);
    setHighlightedLines(new Set());
    setAnalysisStatus("idle");
  }, []);

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const typeText = async (index: number, text: string) => {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setCharCounts((prev) => {
          const next = [...prev];
          next[index] = i;
          return next;
        });
        await delay(18);
      }
    };

    const run = async () => {
      resetState();
      await delay(600);
      if (cancelled) return;
      setAnalysisStatus("analyzing");
      await delay(800);
      if (cancelled) return;

      // Review 0
      setHighlightedLines((prev) => new Set([...prev, reviews[0].afterLine]));
      await delay(250);
      setVisibleReviews((prev) => new Set([...prev, 0]));
      await delay(200);
      await typeText(0, reviews[0].text);
      await delay(500);
      if (cancelled) return;

      // Review 1
      setHighlightedLines((prev) => new Set([...prev, reviews[1].afterLine]));
      await delay(250);
      setVisibleReviews((prev) => new Set([...prev, 1]));
      await delay(200);
      await typeText(1, reviews[1].text);
      await delay(500);
      if (cancelled) return;

      // Review 2
      setHighlightedLines((prev) => new Set([...prev, reviews[2].afterLine]));
      await delay(250);
      setVisibleReviews((prev) => new Set([...prev, 2]));
      await delay(200);
      await typeText(2, reviews[2].text);
      await delay(300);

      if (!cancelled) {
        setAnalysisStatus("complete");
        await delay(3000);
        if (!cancelled) setCycleKey((k) => k + 1);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isInView, cycleKey, resetState]);

  const renderCodeLine = (num: number, content: React.ReactNode) => {
    const highlight = highlightedLines.has(num) ? lineHighlights[num] || "" : "";
    return (
      <div
        key={`line-${num}`}
        className={`flex items-start px-4 transition-colors duration-500 ${highlight}`}
      >
        <span className="text-zinc-600 select-none w-7 text-right mr-5 shrink-0 text-xs leading-7">
          {num}
        </span>
        <code className="text-[13px] leading-7 whitespace-pre">{content}</code>
      </div>
    );
  };

  const renderReview = (index: number) => {
    if (!visibleReviews.has(index)) return null;
    const review = reviews[index];
    const config = severityConfig[review.severity];
    const typed = review.text.slice(0, charCounts[index]);
    const isTyping = charCounts[index] < review.text.length;

    return (
      <motion.div
        key={`review-${index}-${cycleKey}`}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] }}
        className="overflow-hidden"
      >
        <div
          className={`mx-4 my-1 rounded-lg border-l-2 ${config.border} ${config.bg} px-4 py-2.5`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${config.text}`}
            >
              {review.label}
            </span>
            <span className="text-[11px] text-zinc-600">— CodeSight AI</span>
          </div>
          <p className="text-[13px] text-zinc-300 leading-relaxed">
            {typed}
            {isTyping && (
              <span className="inline-block w-0.5 h-3.5 bg-zinc-400 animate-pulse ml-px align-middle" />
            )}
          </p>
        </div>
      </motion.div>
    );
  };

  const lines: { num: number; content: React.ReactNode; reviewAfter?: number }[] = [
    {
      num: 1,
      content: (
        <>
          <span className="text-purple-400">{"export async function "}</span>
          <span className="text-amber-300">{"getUser"}</span>
          <span className="text-zinc-400">{"("}</span>
          <span className="text-orange-300">{"userId"}</span>
          <span className="text-zinc-400">{": "}</span>
          <span className="text-cyan-400">{"string"}</span>
          <span className="text-zinc-400">{") {"}</span>
        </>
      ),
    },
    {
      num: 2,
      content: (
        <>
          <span className="text-purple-400">{"  const "}</span>
          <span className="text-zinc-200">{"query"}</span>
          <span className="text-zinc-400">{" = "}</span>
          <span className="text-green-400">{"`"}</span>
          <span className="text-green-400">{"SELECT * FROM users WHERE id = "}</span>
          <span className="text-zinc-400">{"${"}</span>
          <span className="text-orange-300">{"userId"}</span>
          <span className="text-zinc-400">{"}"}</span>
          <span className="text-green-400">{"`"}</span>
          <span className="text-zinc-400">{";"}</span>
        </>
      ),
      reviewAfter: 0,
    },
    {
      num: 3,
      content: (
        <>
          <span className="text-purple-400">{"  const "}</span>
          <span className="text-zinc-200">{"result"}</span>
          <span className="text-zinc-400">{" = "}</span>
          <span className="text-purple-400">{"await "}</span>
          <span className="text-zinc-200">{"db"}</span>
          <span className="text-zinc-400">{"."}</span>
          <span className="text-amber-300">{"query"}</span>
          <span className="text-zinc-400">{"("}</span>
          <span className="text-zinc-200">{"query"}</span>
          <span className="text-zinc-400">{");"}</span>
        </>
      ),
    },
    {
      num: 4,
      content: (
        <>
          <span className="text-purple-400">{"  return "}</span>
          <span className="text-zinc-200">{"result"}</span>
          <span className="text-zinc-400">{"."}</span>
          <span className="text-zinc-200">{"rows"}</span>
          <span className="text-zinc-400">{"["}</span>
          <span className="text-orange-300">{"0"}</span>
          <span className="text-zinc-400">{"]"}</span>
          <span className="text-zinc-400">{" ?? "}</span>
          <span className="text-purple-400">{"null"}</span>
          <span className="text-zinc-400">{";"}</span>
        </>
      ),
    },
    {
      num: 5,
      content: <span className="text-zinc-400">{"}"}</span>,
    },
    {
      num: 6,
      content: <span>{" "}</span>,
    },
    {
      num: 7,
      content: (
        <>
          <span className="text-purple-400">{"export async function "}</span>
          <span className="text-amber-300">{"createUser"}</span>
          <span className="text-zinc-400">{"("}</span>
          <span className="text-orange-300">{"data"}</span>
          <span className="text-zinc-400">{": "}</span>
          <span className="text-red-400">{"any"}</span>
          <span className="text-zinc-400">{") {"}</span>
        </>
      ),
      reviewAfter: 1,
    },
    {
      num: 8,
      content: (
        <>
          <span className="text-purple-400">{"  const "}</span>
          <span className="text-zinc-200">{"user"}</span>
          <span className="text-zinc-400">{" = "}</span>
          <span className="text-purple-400">{"await "}</span>
          <span className="text-zinc-200">{"db"}</span>
          <span className="text-zinc-400">{"."}</span>
          <span className="text-amber-300">{"insert"}</span>
          <span className="text-zinc-400">{"("}</span>
          <span className="text-green-400">{'"users"'}</span>
          <span className="text-zinc-400">{", "}</span>
          <span className="text-zinc-200">{"data"}</span>
          <span className="text-zinc-400">{");"}</span>
        </>
      ),
      reviewAfter: 2,
    },
    {
      num: 9,
      content: (
        <>
          <span className="text-purple-400">{"  return "}</span>
          <span className="text-zinc-200">{"user"}</span>
          <span className="text-zinc-400">{";"}</span>
        </>
      ),
    },
    {
      num: 10,
      content: <span className="text-zinc-400">{"}"}</span>,
    },
  ];

  return (
    <div ref={ref} className="w-full">
      <div className="bg-zinc-950/80 rounded-xl border border-zinc-800/60 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {/* Window chrome + file tab */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
              <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
              <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-md">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-blue-400"
              >
                <path d="M3 3l18 9-18 9V3z" fill="currentColor" opacity="0.6" />
              </svg>
              <span className="text-xs text-zinc-400 font-mono">
                api/users.ts
              </span>
            </div>
          </div>

          {/* Analysis status indicator */}
          <div className="h-5">
            <AnimatePresence mode="wait">
              {analysisStatus === "analyzing" && (
                <motion.div
                  key={`analyzing-${cycleKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-zinc-400"
                >
                  <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                  <span className="text-xs">Analyzing...</span>
                </motion.div>
              )}
              {analysisStatus === "complete" && (
                <motion.div
                  key={`complete-${cycleKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-zinc-400"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500/80" />
                  <span className="text-xs">3 issues found</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Code content */}
        <div className="py-2 font-mono overflow-x-auto">
          {lines.map((line) => (
            <Fragment key={line.num}>
              {renderCodeLine(line.num, line.content)}
              {line.reviewAfter !== undefined && renderReview(line.reviewAfter)}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

"""LangGraph StateGraph for the CodeSight AI review pipeline.

Pipeline:
    START
      │
      ▼
    diff_fetcher      ── Fetch PR files + metadata from GitHub API
      │
      ▼
    diff_parser       ── Parse raw GitHub file objects → FileChange dataclasses
      │
      ▼
    file_filter       ── Skip binary, generated, too-large files
      │
      ├─ (no files) ──► security_scanner
      │
      └─ (N files) ──► file_reviewer × N  (parallel via Send())
                            │
                            ▼  (all N complete, fan-in)
                        security_scanner  ── Cross-file security scan
                            │
                            ▼
                        complexity_scorer ── Score overall PR risk
                            │
                            ▼
                        summary_generator ── AI PR summary + walkthrough
                            │
                            ▼
                        comment_formatter ── Build inline comments + review body
                            │
                            ▼
                        github_poster     ── POST review to GitHub
                            │
                            ▼
                           END
"""

from langgraph.constants import Send
from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    comment_formatter,
    complexity_scorer,
    diff_fetcher,
    diff_parser,
    file_filter,
    file_reviewer,
    github_poster,
    security_scanner,
    summary_generator,
)
from app.agents.state import ReviewSettings, ReviewState


# ── Routing function for the parallel file-review fan-out ──────────────────


def _route_after_filter(state: ReviewState):
    """After file_filter, fan out to review each file in parallel via Send().

    Each Send() creates an independent invocation of file_reviewer with the
    specific file + PR context it needs. Results accumulate back into
    ReviewState.file_reviews via the Annotated[list, operator.add] reducer.

    If no reviewable files remain (all skipped), jump straight to
    security_scanner so the pipeline still produces a summary.
    """
    files = state.get("filtered_files") or []
    if not files:
        return "security_scanner"

    settings = state.get("review_settings") or ReviewSettings()

    return [
        Send(
            "file_reviewer",
            {
                "file_to_review": file,
                "pr_title": state.get("pr_title", ""),
                "pr_body": state.get("pr_body", ""),
                "review_settings": settings,
            },
        )
        for file in files
    ]


# ── Graph definition ────────────────────────────────────────────────────────


def build_graph():
    """Build and compile the review pipeline StateGraph.

    Returns a compiled LangGraph graph ready for .invoke() or .ainvoke().
    """
    g = StateGraph(ReviewState)

    # Register all nodes
    g.add_node("diff_fetcher", diff_fetcher)
    g.add_node("diff_parser", diff_parser)
    g.add_node("file_filter", file_filter)
    g.add_node("file_reviewer", file_reviewer)
    g.add_node("security_scanner", security_scanner)
    g.add_node("complexity_scorer", complexity_scorer)
    g.add_node("summary_generator", summary_generator)
    g.add_node("comment_formatter", comment_formatter)
    g.add_node("github_poster", github_poster)

    # Linear edges: START → fetcher → parser → filter
    g.add_edge(START, "diff_fetcher")
    g.add_edge("diff_fetcher", "diff_parser")
    g.add_edge("diff_parser", "file_filter")

    # Conditional fan-out after filter:
    #   → list of Send("file_reviewer", ...)  if files exist
    #   → "security_scanner"                  if no files to review
    g.add_conditional_edges(
        "file_filter",
        _route_after_filter,
        ["file_reviewer", "security_scanner"],
    )

    # Fan-in: when ALL parallel file_reviewer invocations complete,
    # LangGraph automatically merges their outputs then continues here.
    g.add_edge("file_reviewer", "security_scanner")

    # Linear edges: scanner → scorer → summariser → formatter → poster → END
    g.add_edge("security_scanner", "complexity_scorer")
    g.add_edge("complexity_scorer", "summary_generator")
    g.add_edge("summary_generator", "comment_formatter")
    g.add_edge("comment_formatter", "github_poster")
    g.add_edge("github_poster", END)

    return g.compile()


# Module-level compiled graph — imported by review_task.py
review_graph = build_graph()

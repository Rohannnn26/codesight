import operator
from dataclasses import dataclass, field
from typing import Annotated, Optional, TypedDict


@dataclass
class FileChange:
    filename: str
    old_path: str
    new_path: str
    is_new: bool
    is_deleted: bool
    is_renamed: bool
    patch: str  # raw patch text from GitHub API
    additions: int
    deletions: int


@dataclass
class ReviewIssue:
    line: int
    severity: str       # INFO | WARNING | ERROR | CRITICAL
    category: str       # BUG | SECURITY | PERFORMANCE | STYLE | LOGIC | SUGGESTION
    message: str
    suggestion: Optional[str] = None


@dataclass
class FileReviewResult:
    filename: str
    issues: list[ReviewIssue]
    file_summary: str
    praise: list[str] = field(default_factory=list)


@dataclass
class SecurityFinding:
    severity: str       # LOW | MEDIUM | HIGH | CRITICAL
    file: str
    line: int
    description: str
    cwe_id: Optional[str] = None


@dataclass
class RiskScore:
    score: int          # 1-10
    level: str          # LOW | MEDIUM | HIGH | CRITICAL
    reasoning: str


@dataclass
class FormattedComment:
    path: str
    line: int
    start_line: Optional[int]
    body: str


@dataclass
class ReviewSettings:
    enabled: bool = True
    auto_review: bool = True
    review_language: str = "en"
    ignore_paths: list[str] = field(default_factory=list)
    custom_instructions: str = ""


class ReviewState(TypedDict):
    # ── Input (set before graph starts) ──────────────────────────────────
    pull_request_id: str
    review_id: str
    repository_full_name: str       # "owner/repo"
    pr_number: int
    github_token: str
    base_sha: str
    head_sha: str
    pr_title: str
    pr_body: str
    pr_author: str
    review_settings: ReviewSettings

    # ── Stage 1: diff_fetcher ─────────────────────────────────────────────
    # raw list of GitHub file objects stored as JSON string
    raw_files_json: str

    # ── Stage 2: diff_parser ──────────────────────────────────────────────
    parsed_files: list[FileChange]

    # ── Stage 3: file_filter ──────────────────────────────────────────────
    filtered_files: list[FileChange]
    skipped_files: list[dict]       # [{"filename": ..., "reason": ...}]

    # ── Stage 4: file_reviewer (parallel fan-out via Send()) ──────────────
    # Annotated with operator.add so results from all parallel nodes accumulate
    file_reviews: Annotated[list[FileReviewResult], operator.add]

    # ── Stage 5: security_scanner ─────────────────────────────────────────
    security_findings: list[SecurityFinding]

    # ── Stage 6: complexity_scorer ────────────────────────────────────────
    complexity_scores: dict[str, RiskScore]
    overall_risk: str               # LOW | MEDIUM | HIGH | CRITICAL

    # ── Stage 7: summary_generator ───────────────────────────────────────
    summary: str
    walkthrough: str

    # ── Stage 8: comment_formatter ───────────────────────────────────────
    formatted_comments: list[FormattedComment]
    review_body: str                # full markdown body for the GitHub review

    # ── Stage 9: github_poster ────────────────────────────────────────────
    github_review_id: Optional[int]

    # ── Metadata ──────────────────────────────────────────────────────────
    error: Optional[str]
    model_used: str
    token_usage: dict               # {"prompt_tokens": .., "completion_tokens": ..}
    duration_ms: int

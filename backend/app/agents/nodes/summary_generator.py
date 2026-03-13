import json
import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI

from app.agents.prompts.summary import SUMMARY_PROMPT
from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.state import ReviewState
from app.config import settings

logger = structlog.get_logger()

_RISK_EMOJI = {
    "LOW": "🟢",
    "MEDIUM": "🟡",
    "HIGH": "🟠",
    "CRITICAL": "🔴",
}


def summary_generator(state: ReviewState) -> dict:
    """Node 7: Generate a PR-level summary and per-file walkthrough table.

    Calls GPT-4o with aggregated context from all previous nodes to produce:
    - summary: 2-4 sentence description of what the PR does
    - walkthrough: markdown table (| File | Changes |) for every changed file

    These two pieces of text are later assembled into the final review_body
    by comment_formatter.
    """
    file_reviews = state.get("file_reviews", [])
    security_findings = state.get("security_findings", [])
    filtered_files = state.get("filtered_files", [])
    skipped_files = state.get("skipped_files", [])
    overall_risk = state.get("overall_risk", "LOW")
    risk_score = (state.get("complexity_scores") or {}).get("overall")

    total_issues = sum(len(r.issues) for r in file_reviews)
    critical_count = sum(1 for r in file_reviews for i in r.issues if i.severity == "CRITICAL")
    error_count = sum(1 for r in file_reviews for i in r.issues if i.severity == "ERROR")
    warning_count = sum(1 for r in file_reviews for i in r.issues if i.severity == "WARNING")
    security_count = len(security_findings)

    files_with_summaries = "\n".join(
        f"- `{r.filename}`: {r.file_summary}" for r in file_reviews
    ) or "No reviewed files."

    prompt = SUMMARY_PROMPT.format(
        pr_title=state.get("pr_title", ""),
        pr_author=state.get("pr_author", "unknown"),
        pr_body=(state.get("pr_body") or "No description provided.")[:600],
        files_with_summaries=files_with_summaries,
        reviewed_count=len(filtered_files),
        total_files=len(filtered_files) + len(skipped_files),
        total_issues=total_issues,
        critical_count=critical_count,
        error_count=error_count,
        warning_count=warning_count,
        security_count=security_count,
        overall_risk=overall_risk,
    )

    try:
        llm = AzureChatOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        raw = json.loads(response.content)
        summary = raw.get("summary", "")
        rows = raw.get("walkthrough_rows", [])

    except Exception as exc:
        logger.warning("summary_generator_failed", error=str(exc))
        summary = f"Review completed for PR: {state.get('pr_title', '')}."
        rows = [{"file": r.filename, "description": r.file_summary} for r in file_reviews]

    # Build markdown walkthrough table
    if rows:
        walkthrough_lines = ["| File | Changes |", "|------|---------|"]
        for row in rows:
            walkthrough_lines.append(f"| `{row['file']}` | {row['description']} |")
        walkthrough = "\n".join(walkthrough_lines)
    else:
        walkthrough = "_No files were reviewed._"

    logger.info("summary_generator_done", summary_len=len(summary))
    return {"summary": summary, "walkthrough": walkthrough}

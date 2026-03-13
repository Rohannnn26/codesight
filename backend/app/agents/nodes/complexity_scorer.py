import json
import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI

from app.agents.prompts.summary import COMPLEXITY_PROMPT
from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.state import ReviewState, RiskScore
from app.config import settings
from app.services.diff_service import is_critical_path

logger = structlog.get_logger()

_RISK_THRESHOLDS = [
    (3, "LOW"),
    (6, "MEDIUM"),
    (8, "HIGH"),
    (10, "CRITICAL"),
]


def _score_to_level(score: int) -> str:
    for threshold, level in _RISK_THRESHOLDS:
        if score <= threshold:
            return level
    return "CRITICAL"


def complexity_scorer(state: ReviewState) -> dict:
    """Node 6: Score the overall PR complexity and risk.

    Uses a heuristic pre-check combined with an AI rating. The heuristic gives
    a baseline score; GPT-4o is asked to confirm/adjust with reasoning.

    Returns:
      - complexity_scores: {"overall": RiskScore}
      - overall_risk: str  (LOW | MEDIUM | HIGH | CRITICAL)
    """
    filtered_files = state.get("filtered_files", [])
    file_reviews = state.get("file_reviews", [])

    # ── Heuristic baseline ────────────────────────────────────────────────
    total_additions = sum(f.additions for f in filtered_files)
    total_deletions = sum(f.deletions for f in filtered_files)
    file_count = len(filtered_files)
    critical_paths = [f.filename for f in filtered_files if is_critical_path(f.filename)]

    baseline = 1
    if total_additions + total_deletions > 500:
        baseline += 2
    if file_count > 10:
        baseline += 1
    if critical_paths:
        baseline += 3

    logger.info(
        "complexity_scorer_start",
        files=file_count,
        lines_changed=total_additions + total_deletions,
        critical_files=len(critical_paths),
        baseline=baseline,
    )

    # ── AI rating ─────────────────────────────────────────────────────────
    file_summaries = "\n".join(
        f"- `{r.filename}`: {r.file_summary}" for r in file_reviews
    ) or "No file summaries available."

    prompt = COMPLEXITY_PROMPT.format(
        pr_title=state.get("pr_title", ""),
        file_count=file_count,
        total_additions=total_additions,
        total_deletions=total_deletions,
        critical_paths=", ".join(critical_paths) or "none",
        file_summaries=file_summaries,
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
        ai_score = max(1, min(10, int(raw.get("score", baseline))))
        # Average heuristic and AI score, weighted toward AI
        final_score = round((baseline + ai_score * 2) / 3)
        level = raw.get("level") or _score_to_level(final_score)
        reasoning = raw.get("reasoning", "")

    except Exception as exc:
        logger.warning("complexity_scorer_ai_failed", error=str(exc))
        final_score = baseline
        level = _score_to_level(baseline)
        reasoning = "Heuristic score (AI scoring unavailable)."

    risk = RiskScore(score=final_score, level=level, reasoning=reasoning)
    logger.info("complexity_scorer_done", score=final_score, level=level)

    return {
        "complexity_scores": {"overall": risk},
        "overall_risk": level,
    }

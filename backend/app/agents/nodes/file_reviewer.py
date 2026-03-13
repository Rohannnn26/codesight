import json
import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI

from app.agents.prompts.file_review import FILE_REVIEW_PROMPT
from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.state import FileReviewResult, ReviewIssue
from app.config import settings

logger = structlog.get_logger()


def _get_llm() -> AzureChatOpenAI:
    return AzureChatOpenAI(
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_key=settings.AZURE_OPENAI_API_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
        temperature=0,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


def file_reviewer(input: dict) -> dict:
    """Node 4: Review a single file using Azure OpenAI GPT-4o.

    This node is invoked in PARALLEL for each filtered file via LangGraph Send().
    Each invocation receives:
      - input["file_to_review"]: FileChange dataclass for one file
      - input["pr_title"], input["pr_body"]: PR context
      - input["review_settings"]: ReviewSettings dataclass

    Returns:
      {"file_reviews": [FileReviewResult]} — a list with one item.
      The Annotated[list, operator.add] reducer on ReviewState.file_reviews
      accumulates results from all parallel invocations.
    """
    file = input["file_to_review"]
    pr_title = input.get("pr_title", "")
    pr_body = input.get("pr_body", "") or ""
    review_settings = input.get("review_settings")

    custom_section = ""
    if review_settings and review_settings.custom_instructions:
        custom_section = f"\n## Custom Review Instructions\n{review_settings.custom_instructions}\n"

    prompt = FILE_REVIEW_PROMPT.format(
        pr_title=pr_title,
        pr_body=pr_body[:500] if pr_body else "No description provided.",
        filename=file.filename,
        patch=file.patch[:8000],  # cap at ~8k chars to stay within context
        custom_instructions_section=custom_section,
    )

    logger.info("file_reviewer_start", filename=file.filename)

    try:
        llm = _get_llm()
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])

        raw = json.loads(response.content)

        issues = [
            ReviewIssue(
                line=issue.get("line", 1),
                severity=issue.get("severity", "INFO"),
                category=issue.get("category", "SUGGESTION"),
                message=issue.get("message", ""),
                suggestion=issue.get("suggestion"),
            )
            for issue in raw.get("issues", [])
        ]

        result = FileReviewResult(
            filename=file.filename,
            issues=issues,
            file_summary=raw.get("file_summary", ""),
            praise=raw.get("praise", []),
        )

        logger.info(
            "file_reviewer_done",
            filename=file.filename,
            issues=len(issues),
        )

    except Exception as exc:
        logger.warning("file_reviewer_failed", filename=file.filename, error=str(exc))
        # Return an empty result so the pipeline continues
        result = FileReviewResult(
            filename=file.filename,
            issues=[],
            file_summary=f"Review failed: {exc}",
        )

    return {"file_reviews": [result]}

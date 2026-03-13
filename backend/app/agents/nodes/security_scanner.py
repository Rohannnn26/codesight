import json
import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI

from app.agents.prompts.security_scan import SECURITY_PROMPT
from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.state import ReviewState, SecurityFinding
from app.config import settings
from app.services.diff_service import build_diff_summary

logger = structlog.get_logger()


def security_scanner(state: ReviewState) -> dict:
    """Node 5: Run a security-focused scan across ALL changed files.

    Unlike file_reviewer (which reviews one file at a time), security_scanner
    looks at the entire diff to catch cross-file vulnerabilities like:
    - Secrets committed across any file
    - Auth bypass patterns that span multiple files
    - Insecure data flows between components

    Returns security_findings: list[SecurityFinding].
    """
    filtered_files = state.get("filtered_files", [])
    if not filtered_files:
        logger.info("security_scanner_skipped", reason="no files to scan")
        return {"security_findings": []}

    logger.info("security_scanner_start", files=len(filtered_files))

    # Build a condensed diff — combine patches for all files (capped at 12k chars total)
    diff_parts = []
    total_chars = 0
    for f in filtered_files:
        chunk = f"### {f.filename}\n```diff\n{f.patch}\n```\n"
        if total_chars + len(chunk) > 12000:
            diff_parts.append("... (remaining files truncated for context limits)")
            break
        diff_parts.append(chunk)
        total_chars += len(chunk)

    full_diff = "\n".join(diff_parts)
    files_summary = build_diff_summary(filtered_files)
    owner_repo = state.get("repository_full_name", "unknown/unknown")

    prompt = SECURITY_PROMPT.format(
        pr_title=state.get("pr_title", ""),
        repository=owner_repo,
        files_summary=files_summary,
        diff=full_diff,
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
        findings = [
            SecurityFinding(
                severity=f.get("severity", "LOW"),
                file=f.get("file", "unknown"),
                line=f.get("line", 1),
                description=f.get("description", ""),
                cwe_id=f.get("cwe_id"),
            )
            for f in raw.get("findings", [])
        ]

        logger.info("security_scanner_done", findings=len(findings))

    except Exception as exc:
        logger.warning("security_scanner_failed", error=str(exc))
        findings = []

    return {"security_findings": findings}

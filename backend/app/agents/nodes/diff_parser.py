import json
import structlog

from app.agents.state import ReviewState
from app.services.diff_service import parse_github_files

logger = structlog.get_logger()


def diff_parser(state: ReviewState) -> dict:
    """Node 2: Parse raw GitHub file objects into FileChange dataclass instances.

    Reads state["raw_files_json"] (the JSON-serialised list from diff_fetcher) and
    converts each entry into a structured FileChange object with typed fields.
    """
    logger.info("diff_parser_start")

    raw_files: list[dict] = json.loads(state["raw_files_json"])
    parsed = parse_github_files(raw_files)

    logger.info("diff_parser_done", parsed_count=len(parsed))
    return {"parsed_files": parsed}

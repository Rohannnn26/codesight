import structlog

from app.agents.state import ReviewState, ReviewSettings
from app.services.diff_service import should_skip

logger = structlog.get_logger()

# Files with more than this many changed lines are skipped (too large for LLM context)
MAX_LINES_PER_FILE = 1000


def file_filter(state: ReviewState) -> dict:
    """Node 3: Filter parsed files to determine which ones should be reviewed.

    Applies three layers of filtering:
    1. Binary/generated files (lock files, build output, minified assets)
    2. Files exceeding MAX_LINES_PER_FILE changed lines
    3. Repository-level ignore patterns from ReviewSettings.ignore_paths

    Returns filtered_files (to review) and skipped_files (with skip reasons).
    """
    logger.info("file_filter_start", total=len(state.get("parsed_files", [])))

    settings: ReviewSettings = state.get("review_settings") or ReviewSettings()
    ignore_paths: list[str] = settings.ignore_paths or []

    filtered: list = []
    skipped: list[dict] = []

    for f in state.get("parsed_files", []):
        # Skip files with no patch (e.g. binary files returned by GitHub API)
        if not f.patch:
            skipped.append({"filename": f.filename, "reason": "binary file (no patch)"})
            continue

        # Apply ignore patterns + generated file detection
        skip, reason = should_skip(f.filename, ignore_paths)
        if skip:
            skipped.append({"filename": f.filename, "reason": reason})
            continue

        # Skip files that are too large for the LLM context window
        total_changed = f.additions + f.deletions
        if total_changed > MAX_LINES_PER_FILE:
            skipped.append({
                "filename": f.filename,
                "reason": f"too large ({total_changed} changed lines, limit {MAX_LINES_PER_FILE})",
            })
            continue

        filtered.append(f)

    logger.info(
        "file_filter_done",
        reviewing=len(filtered),
        skipping=len(skipped),
    )
    return {"filtered_files": filtered, "skipped_files": skipped}

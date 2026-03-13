import fnmatch

from app.agents.state import FileChange

# File extensions that are always binary/non-reviewable
_BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg",
    ".woff", ".woff2", ".eot", ".ttf", ".otf",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z",
    ".exe", ".dll", ".so", ".dylib",
    ".mp4", ".mp3", ".wav", ".avi",
}

# Glob patterns for generated/build files that are never worth reviewing
_GENERATED_PATTERNS = [
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.min.js",
    "*.min.css",
    "*.map",
    "dist/**",
    "build/**",
    ".next/**",
    "out/**",
    "node_modules/**",
    "vendor/**",
    "__pycache__/**",
    "*.pyc",
    "coverage/**",
    ".nyc_output/**",
]

# Paths that indicate security-sensitive code (used for complexity scoring)
CRITICAL_PATH_PATTERNS = [
    "*auth*", "*login*", "*password*", "*token*", "*secret*",
    "*payment*", "*billing*", "*stripe*",
    "*migration*", "*schema*",
    "*admin*", "*permission*", "*role*",
    "*crypto*", "*encrypt*", "*hash*",
    "*config*", "*env*", "*settings*",
]


def parse_github_files(github_files: list[dict]) -> list[FileChange]:
    """Convert GitHub API file objects to FileChange dataclass instances."""
    return [
        FileChange(
            filename=f.get("filename", ""),
            old_path=f.get("previous_filename", f.get("filename", "")),
            new_path=f.get("filename", ""),
            is_new=f.get("status") == "added",
            is_deleted=f.get("status") == "removed",
            is_renamed=f.get("status") == "renamed",
            patch=f.get("patch", ""),  # empty string for binary files
            additions=f.get("additions", 0),
            deletions=f.get("deletions", 0),
        )
        for f in github_files
    ]


def should_skip(filename: str, ignore_paths: list[str]) -> tuple[bool, str]:
    """Determine if a file should be skipped from review.

    Returns:
        (skip: bool, reason: str)
    """
    ext = ("." + filename.rsplit(".", 1)[-1]).lower() if "." in filename else ""

    if ext in _BINARY_EXTENSIONS:
        return True, "binary file"

    for pattern in _GENERATED_PATTERNS:
        if fnmatch.fnmatch(filename, pattern):
            return True, f"generated/build file"

    for pattern in ignore_paths:
        if pattern and fnmatch.fnmatch(filename, pattern):
            return True, f"ignored by repository settings ({pattern})"

    return False, ""


def is_critical_path(filename: str) -> bool:
    """Return True if this file touches security/payment/auth-critical code."""
    lower = filename.lower()
    return any(fnmatch.fnmatch(lower, pat) for pat in CRITICAL_PATH_PATTERNS)


def build_diff_summary(files: list[FileChange]) -> str:
    """Build a compact summary string of all changed files for use in prompts."""
    lines = []
    for f in files:
        status = "new" if f.is_new else ("deleted" if f.is_deleted else "modified")
        lines.append(f"- `{f.filename}` ({status}, +{f.additions}/-{f.deletions})")
    return "\n".join(lines)

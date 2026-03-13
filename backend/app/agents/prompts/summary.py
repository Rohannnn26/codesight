SUMMARY_PROMPT = """\
Generate a concise summary and walkthrough for the following pull request.

## PR Context
Title: {pr_title}
Author: {pr_author}
Description: {pr_body}

## Files Changed
{files_with_summaries}

## Review Stats
- Files reviewed: {reviewed_count} / {total_files}
- Total issues found: {total_issues} ({critical_count} critical, {error_count} errors, {warning_count} warnings)
- Security findings: {security_count}
- Overall risk: {overall_risk}

Return a JSON object with this exact schema:

{{
  "summary": "2-4 sentences describing what this PR does, which components are affected, and any notable architectural or behavioral changes.",
  "walkthrough_rows": [
    {{
      "file": "path/to/file.ext",
      "description": "One-line description of what changed in this file."
    }}
  ]
}}

Be factual and concise. The walkthrough should cover ALL changed files.\
"""

COMPLEXITY_PROMPT = """\
Rate the complexity and risk of this pull request.

## PR Context
Title: {pr_title}

## Change Stats
- Total files changed: {file_count}
- Total lines added: {total_additions}
- Total lines deleted: {total_deletions}
- Files touching critical paths: {critical_paths}

## File Summaries
{file_summaries}

Rate the overall complexity and risk of this change on a scale of 1-10, then map it to LOW/MEDIUM/HIGH/CRITICAL.

Scoring guide:
- 1-3 (LOW): Small, isolated changes. Low risk of introducing bugs or regressions.
- 4-6 (MEDIUM): Moderate changes touching several areas. Some risk, warrants careful review.
- 7-8 (HIGH): Large or complex changes, touching critical paths (auth, payments, data migrations). High regression risk.
- 9-10 (CRITICAL): Sweeping architectural changes, security-critical modifications, or very large refactors.

Return a JSON object with this exact schema:

{{
  "score": <integer 1-10>,
  "level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": "2-3 sentences explaining the score."
}}\
"""

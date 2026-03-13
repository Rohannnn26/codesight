FILE_REVIEW_PROMPT = """\
Review the following code changes from a pull request.

## PR Context
Title: {pr_title}
Description: {pr_body}

## File: `{filename}`
```diff
{patch}
```

{custom_instructions_section}

Analyze only the added/changed lines (starting with '+'). Return a JSON object with this exact schema:

{{
  "file_summary": "One concise sentence describing what changed in this file.",
  "issues": [
    {{
      "line": <integer — line number in the new version of the file>,
      "severity": "INFO" | "WARNING" | "ERROR" | "CRITICAL",
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "STYLE" | "LOGIC" | "SUGGESTION",
      "message": "Clear description of the issue and why it matters.",
      "suggestion": "Optional improved code snippet (just the relevant lines, not the full file)"
    }}
  ],
  "praise": [
    "Optional: one-line callout of a good pattern or practice used in this file"
  ]
}}

Return an empty issues array if the file looks correct. Return an empty praise array if nothing stands out positively.\
"""

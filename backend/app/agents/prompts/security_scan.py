SECURITY_PROMPT = """\
Perform a security analysis on the following pull request diff.

## PR Context
Title: {pr_title}
Repository: {repository}

## Changed Files Summary
{files_summary}

## Full Diff
```diff
{diff}
```

Look specifically for:
- Hardcoded secrets, API keys, passwords, tokens, credentials
- SQL injection (string interpolation in queries)
- XSS (unescaped user input rendered as HTML)
- Authentication or authorization bypasses
- Insecure cryptography (MD5, SHA1 for passwords, weak randomness)
- SSRF (user-controlled URLs used in server-side HTTP requests)
- Path traversal / directory traversal
- Command injection
- Unsafe deserialization
- Missing input validation on user-supplied data
- Sensitive data in logs, error messages, or API responses
- Broken access control (accessing resources without ownership checks)
- New imports of packages with known severe vulnerabilities

Return a JSON object with this exact schema:

{{
  "findings": [
    {{
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "file": "path/to/file.ext",
      "line": <integer — approximate line number in the new file>,
      "description": "Specific description of the vulnerability and its potential impact.",
      "cwe_id": "CWE-89"
    }}
  ]
}}

Return an empty findings array if no security concerns are found.\
"""

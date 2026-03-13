import hashlib
import hmac


def verify_webhook_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature.

    Args:
        payload_body: Raw request body bytes.
        signature_header: Value of the x-hub-signature-256 header.
        secret: The webhook secret configured in GitHub.

    Returns:
        True if the signature is valid, False otherwise.
    """
    if not signature_header:
        return False

    if not signature_header.startswith("sha256="):
        return False

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload_body,
        hashlib.sha256,
    ).hexdigest()

    received_signature = signature_header.removeprefix("sha256=")

    return hmac.compare_digest(expected_signature, received_signature)

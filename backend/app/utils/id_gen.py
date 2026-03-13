import secrets
import time


def generate_cuid() -> str:
    """Generate a CUID-like unique identifier.

    Produces a string similar to Prisma's cuid() default,
    using timestamp + random bytes for uniqueness.
    """
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = secrets.token_hex(8)
    return f"c{timestamp}{random_part}"

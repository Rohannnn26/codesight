from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings


def _prepare_database_url(url: str) -> str:
    """Convert a standard PostgreSQL URL to asyncpg-compatible format.

    - Changes scheme from postgres:// or postgresql:// to postgresql+asyncpg://
    - Removes sslmode and other unsupported query params
    """
    # Parse the URL
    parsed = urlparse(url)

    # Update scheme for asyncpg
    scheme = "postgresql+asyncpg"

    # Parse and filter query params
    query_params = parse_qs(parsed.query)

    # Remove unsupported params (asyncpg doesn't accept these as query params)
    unsupported_params = {"sslmode", "channel_binding"}
    filtered_params = {k: v for k, v in query_params.items() if k not in unsupported_params}
    new_query = urlencode(filtered_params, doseq=True)

    # Rebuild the URL
    new_parsed = parsed._replace(scheme=scheme, query=new_query)
    return urlunparse(new_parsed)


database_url = _prepare_database_url(settings.DATABASE_URL)

# SSL is required for Neon connections - pass as connect_args
# Neon (serverless Postgres) aggressively closes idle connections (~5 min)
# so we need pessimistic connection handling:
#   - pool_pre_ping: Test connection before using (detects dead connections)
#   - pool_recycle: Proactively recycle connections before Neon kills them
#   - pool_use_lifo: Use freshest connections first (better for serverless)
engine = create_async_engine(
    database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Test connection health before each use
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_use_lifo=True,  # Use most recently returned connection first
    connect_args={"ssl": "require"},  # asyncpg requires SSL for Neon
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

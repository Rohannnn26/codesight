from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.repository import Repository


async def get_github_token_for_repo(db: AsyncSession, repository_id: str) -> str | None:
    """Retrieve the GitHub access token for a repository's owner.

    Looks up the repository's userId, then finds the GitHub account
    with a valid access token for that user.

    Args:
        db: Async database session.
        repository_id: The repository ID in our database.

    Returns:
        The GitHub access token, or None if not found.
    """
    result = await db.execute(
        select(Account.accessToken)
        .join(Repository, Repository.userId == Account.userId)
        .where(
            Repository.id == repository_id,
            Account.providerId == "github",
            Account.accessToken.isnot(None),
        )
    )
    row = result.scalar_one_or_none()
    return row

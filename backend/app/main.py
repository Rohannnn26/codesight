from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings
from app.database import engine

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info(
        "backend_starting",
        bot_name=settings.CODESIGHT_BOT_NAME,
        max_diff_size=settings.MAX_DIFF_SIZE,
        max_files=settings.MAX_FILES_PER_REVIEW,
    )

    # Validate critical config
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")

    # Test database connection
    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("SELECT 1")
        )
    logger.info("database_connected")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("backend_shutdown")


app = FastAPI(
    title="CodeSight Backend",
    description="AI Code Review Agent",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routes
app.include_router(api_router)

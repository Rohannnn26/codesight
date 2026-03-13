from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.webhooks import router as webhooks_router
from app.api.reviews import router as reviews_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(webhooks_router, tags=["webhooks"])
api_router.include_router(reviews_router, tags=["reviews"])

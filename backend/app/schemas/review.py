from datetime import datetime

from pydantic import BaseModel


class ReviewResponse(BaseModel):
    id: str
    status: str
    summary: str
    state: str
    body: str
    pullRequestId: str
    createdAt: datetime
    updatedAt: datetime | None = None

    class Config:
        from_attributes = True


class ReviewStatusResponse(BaseModel):
    id: str
    status: str
    summary: str | None = None
    createdAt: datetime

    class Config:
        from_attributes = True


class ReviewRetryResponse(BaseModel):
    id: str
    status: str
    message: str

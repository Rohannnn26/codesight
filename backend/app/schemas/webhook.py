from pydantic import BaseModel


class WebhookRepository(BaseModel):
    id: int
    name: str
    full_name: str
    owner: dict
    html_url: str


class WebhookPullRequest(BaseModel):
    id: int
    number: int
    state: str
    title: str
    body: str | None = None
    user: dict
    base: dict
    head: dict
    html_url: str


class PullRequestEvent(BaseModel):
    action: str
    number: int
    pull_request: WebhookPullRequest
    repository: WebhookRepository
    sender: dict


class PushEvent(BaseModel):
    ref: str
    before: str
    after: str
    repository: WebhookRepository
    sender: dict


class PingEvent(BaseModel):
    zen: str | None = None
    hook_id: int | None = None
    repository: WebhookRepository | None = None

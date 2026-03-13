from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Azure OpenAI
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-10-21"
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"

    # GitHub
    GITHUB_WEBHOOK_SECRET: str = ""

    # App settings
    CODESIGHT_BOT_NAME: str = "CodeSight"
    MAX_DIFF_SIZE: int = 50000
    MAX_FILES_PER_REVIEW: int = 50

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()

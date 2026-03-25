from dataclasses import dataclass
import os


@dataclass
class Settings:
    app_name: str = "lobster-ai-engine"
    env: str = os.getenv("NODE_ENV", "development")
    openclaw_base_url: str = os.getenv("OPENCLAW_BASE_URL", "http://localhost:8088")
    heartbeat_minutes: int = int(os.getenv("AI_HEARTBEAT_MINUTES", "5"))


settings = Settings()


import json
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

def parse_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    if not raw or raw.strip() == "":
        return ["*"]
    raw = raw.strip()
    if raw == "*":
        return ["*"]
    if raw.startswith("["):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return ["*"]
    return [x.strip() for x in raw.split(",")]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Healthier API"
    app_version: str = "0.1.0"
    debug: bool = False

    host: str = "0.0.0.0"
    port: int = 8000

    # Supabase configuration
    supabase_url: str | None = None
    supabase_key: str | None = None

    # AI configuration (Cerebras)
    cerebras_key: str | None = None

    # Smplrspace configuration
    smplr_org_id: str | None = None
    smplr_client_token: str | None = None
    smplr_space_id: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return parse_cors_origins()

@lru_cache
def get_settings() -> Settings:
    return Settings()

import json
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

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

    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if v is None or v == "":
            return ["*"]
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v == "*":
                return ["*"]
            if v.startswith("["):
                return json.loads(v)
            return [x.strip() for x in v.split(",")]
        return v

    # Supabase configuration
    supabase_url: str | None = None
    supabase_key: str | None = None

    # AI configuration (Cerebras)
    cerebras_key: str | None = None

@lru_cache
def get_settings() -> Settings:
    return Settings()

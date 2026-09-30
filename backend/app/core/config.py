import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sangati"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite:////tmp/sangati_dev.db"

    # Supabase Auth & Storage
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "media"

    # CORS
    FRONTEND_URL: Optional[str] = None
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.strip():
                return ["http://localhost:3000"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def cors_origins(self) -> List[str]:
        origins = list(self.ALLOWED_ORIGINS) if isinstance(self.ALLOWED_ORIGINS, list) else [self.ALLOWED_ORIGINS]
        if self.FRONTEND_URL and self.FRONTEND_URL.strip():
            f_url = self.FRONTEND_URL.strip()
            if f_url not in origins:
                origins.append(f_url)
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()

"""Central configuration. Values come from environment variables / the .env file."""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field

try:  # python-dotenv is optional at import time so tests can run without it
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    # Gemini key used by Google ADK (AI Studio key). Backend only, never sent to the browser.
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./travel_agent.db"))
    frontend_origins: list[str] = field(
        default_factory=lambda: _split(os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")))
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")))
    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET") or secrets.token_urlsafe(32))
    jwt_expire_minutes: int = field(default_factory=lambda: int(os.getenv("JWT_EXPIRE_MINUTES", "720")))
    # Public website address, used for sitemap and share links.
    public_url: str = field(default_factory=lambda: os.getenv("PUBLIC_URL", "http://localhost:5173").rstrip("/"))

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.google_api_key)


settings = Settings()

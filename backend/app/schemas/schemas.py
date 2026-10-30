"""Pydantic request/response models. They validate everything that comes from the browser."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{8,64}$")
    language: str = Field(default="en-IN", max_length=12)


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    mode: Literal["adk", "demo"]
    destination_ids: list[str] = []
    follow_ups: list[str] = []
    notice: str | None = None


class TripPlanRequest(BaseModel):
    origin_city: str = Field(default="Hyderabad", min_length=2, max_length=60)
    destination_id: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9-]+$")
    days: int = Field(default=5, ge=1, le=14)
    adults: int = Field(default=2, ge=1, le=20)
    children: int = Field(default=0, ge=0, le=20)
    budget_inr: int | None = Field(default=None, ge=1000, le=10_000_000)
    style: Literal["budget", "standard", "comfort"] = "standard"
    transport_mode: Literal["train", "bus", "flight"] = "train"
    interests: list[str] = Field(default_factory=list, max_length=10)
    excluded_activities: list[str] = Field(default_factory=list, max_length=50)
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"
    start_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    accessibility_needs: str = Field(default="", max_length=200)
    special_requirements: str = Field(default="", max_length=300)


class SaveTripRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    plan: dict[str, Any]


class TripRecord(BaseModel):
    id: int
    title: str
    created_at: str
    plan: dict[str, Any]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class WishlistAdd(BaseModel):
    place_id: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")


class PreferencesIn(BaseModel):
    home_city: str = Field(default="", max_length=60)
    interests: list[str] = Field(default_factory=list, max_length=12)
    budget_style: Literal["budget", "standard", "comfort"] = "standard"
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"


class FeedbackIn(BaseModel):
    kind: Literal["incorrect_info", "bug", "idea", "other"] = "other"
    message: str = Field(min_length=5, max_length=2000)
    place_id: str | None = Field(default=None, max_length=80, pattern=r"^[a-z0-9-]+$")
    email: str | None = Field(default=None, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class BudgetRequest(BaseModel):
    destination_id: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    days: int = Field(ge=1, le=14)
    adults: int = Field(default=2, ge=1, le=20)
    children: int = Field(default=0, ge=0, le=20)
    origin_city: str = Field(default="Hyderabad", min_length=2, max_length=60)
    style: Literal["budget", "standard", "comfort"] = "standard"
    transport_mode: Literal["train", "bus", "flight"] = "train"
    budget_inr: int | None = Field(default=None, ge=1000, le=10_000_000)
    sightseeing_fees_per_adult: int = Field(default=0, ge=0, le=1_000_000)

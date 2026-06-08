"""Pydantic models for World Cup Predictor."""
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from pydantic import BaseModel, Field, ConfigDict


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Users ----------
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    full_name: str
    department: Optional[str] = None
    role: str = "employee"  # employee | admin | super_admin
    active: bool = True
    avatar_url: Optional[str] = None
    requires_password_change: bool = True


class UserCreate(UserBase):
    password: Optional[str] = None  # defaults to "123456" when omitted


class UserUpdate(BaseModel):
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None


class UserPublic(UserBase):
    id: str
    total_points: int = 0
    created_at: str = Field(default_factory=now_iso)


# ---------- Auth ----------
class LoginRequest(BaseModel):
    employee_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------- Teams ----------
class TeamBase(BaseModel):
    name: str
    code: str  # ISO short code e.g., KSA, ARG
    flag_emoji: Optional[str] = None
    group: Optional[str] = None  # Group A..H


class TeamCreate(TeamBase):
    pass


class Team(TeamBase):
    id: str = Field(default_factory=new_id)
    created_at: str = Field(default_factory=now_iso)


# ---------- Matches ----------
class MatchBase(BaseModel):
    home_team_id: str
    away_team_id: str
    kickoff: str  # ISO datetime
    stage: str = "group"  # group | r16 | qf | sf | final | 3rd
    venue: Optional[str] = None
    group: Optional[str] = None


class MatchCreate(MatchBase):
    pass


class MatchResultUpdate(BaseModel):
    home_score: int
    away_score: int


class Match(MatchBase):
    id: str = Field(default_factory=new_id)
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str = "scheduled"  # scheduled | live | finished
    created_at: str = Field(default_factory=now_iso)


# ---------- Predictions ----------
class PredictionCreate(BaseModel):
    match_id: str
    home_score: int = Field(ge=0, le=20)
    away_score: int = Field(ge=0, le=20)


class Prediction(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    match_id: str
    home_score: int
    away_score: int
    points_awarded: Optional[int] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


# ---------- News & Announcements ----------
class NewsBase(BaseModel):
    title: str
    title_ar: Optional[str] = None
    body: str
    body_ar: Optional[str] = None
    image_url: Optional[str] = None
    category: str = "world_cup"  # world_cup | team | stats | schedule


class NewsCreate(NewsBase):
    pass


class News(NewsBase):
    id: str = Field(default_factory=new_id)
    author_id: Optional[str] = None
    published: bool = True
    created_at: str = Field(default_factory=now_iso)


class AnnouncementBase(BaseModel):
    title: str
    title_ar: Optional[str] = None
    body: str
    body_ar: Optional[str] = None
    pinned: bool = False


class AnnouncementCreate(AnnouncementBase):
    pass


class Announcement(AnnouncementBase):
    id: str = Field(default_factory=new_id)
    author_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


# ---------- Prizes ----------
class PrizeBase(BaseModel):
    title: str
    title_ar: Optional[str] = None
    description: Optional[str] = None
    rank_from: int = 1
    rank_to: int = 1
    icon: Optional[str] = "trophy"


class PrizeCreate(PrizeBase):
    pass


class Prize(PrizeBase):
    id: str = Field(default_factory=new_id)
    assigned_user_ids: List[str] = []
    created_at: str = Field(default_factory=now_iso)


# ---------- Audit ----------
class AuditLog(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource: Optional[str] = None
    metadata: Optional[dict] = None
    ip: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


# ---------- Notifications ----------
class NotificationCreate(BaseModel):
    user_id: Optional[str] = None  # None == broadcast
    title: str
    title_ar: Optional[str] = None
    body: Optional[str] = None
    body_ar: Optional[str] = None
    type: str = "info"  # info | match | rank | prize | admin


class Notification(NotificationCreate):
    id: str = Field(default_factory=new_id)
    read: bool = False
    created_at: str = Field(default_factory=now_iso)


# ---------- Settings ----------
class ScoringRules(BaseModel):
    exact: int = 10
    outcome_and_diff: int = 5
    outcome_only: int = 3
    wrong: int = 0


class PredictionWindow(BaseModel):
    open: bool = True  # admin can disable predictions globally

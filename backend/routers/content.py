"""Content: news, announcements, notifications, prizes."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from audit import log_action
from database import db
from models import (
    Announcement,
    AnnouncementCreate,
    News,
    NewsCreate,
    Notification,
    NotificationCreate,
    Prize,
    PrizeCreate,
)
from security import get_current_user, require_role

router = APIRouter(prefix="/content", tags=["content"])


# News
@router.get("/news", response_model=List[News])
async def list_news(category: Optional[str] = None, user=Depends(get_current_user)):
    flt = {"published": True}
    if category:
        flt["category"] = category
    items = await db.news.find(flt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [News(**i) for i in items]


@router.post("/news", response_model=News)
async def create_news(payload: NewsCreate, admin=Depends(require_role("admin"))):
    n = News(**payload.model_dump(), author_id=admin["id"])
    await db.news.insert_one(n.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "news_create", "news", {"id": n.id})
    return n


@router.delete("/news/{news_id}")
async def delete_news(news_id: str, admin=Depends(require_role("admin"))):
    await db.news.delete_one({"id": news_id})
    await log_action(admin["id"], admin.get("employee_id"), "news_delete", "news", {"id": news_id})
    return {"ok": True}


# Announcements
@router.get("/announcements", response_model=List[Announcement])
async def list_announcements(user=Depends(get_current_user)):
    items = await db.announcements.find({}, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(200)
    return [Announcement(**i) for i in items]


@router.post("/announcements", response_model=Announcement)
async def create_announcement(payload: AnnouncementCreate, admin=Depends(require_role("admin"))):
    a = Announcement(**payload.model_dump(), author_id=admin["id"])
    await db.announcements.insert_one(a.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "announcement_create", "announcements", {"id": a.id})
    return a


@router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, admin=Depends(require_role("admin"))):
    await db.announcements.delete_one({"id": ann_id})
    await log_action(admin["id"], admin.get("employee_id"), "announcement_delete", "announcements", {"id": ann_id})
    return {"ok": True}


# Notifications
@router.get("/notifications", response_model=List[Notification])
async def list_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return [Notification(**i) for i in items]


@router.post("/notifications", response_model=Notification)
async def create_notification(payload: NotificationCreate, admin=Depends(require_role("admin"))):
    n = Notification(**payload.model_dump())
    await db.notifications.insert_one(n.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "notification_create", "notifications", {"id": n.id})
    return n


@router.post("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"ok": True}


# Prizes
@router.get("/prizes", response_model=List[Prize])
async def list_prizes(user=Depends(get_current_user)):
    items = await db.prizes.find({}, {"_id": 0}).sort("rank_from", 1).to_list(50)
    return [Prize(**i) for i in items]


@router.post("/prizes", response_model=Prize)
async def create_prize(payload: PrizeCreate, admin=Depends(require_role("admin"))):
    p = Prize(**payload.model_dump())
    await db.prizes.insert_one(p.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "prize_create", "prizes", {"id": p.id})
    return p


@router.delete("/prizes/{prize_id}")
async def delete_prize(prize_id: str, admin=Depends(require_role("admin"))):
    await db.prizes.delete_one({"id": prize_id})
    await log_action(admin["id"], admin.get("employee_id"), "prize_delete", "prizes", {"id": prize_id})
    return {"ok": True}


@router.post("/prizes/assign-winners")
async def assign_winners(admin=Depends(require_role("admin"))):
    """Auto-assign winners based on current leaderboard."""
    users = await db.users.find({"role": "employee", "active": True}, {"_id": 0, "password_hash": 0}).to_list(5000)
    users.sort(key=lambda u: -(u.get("total_points") or 0))
    prizes = await db.prizes.find({}, {"_id": 0}).sort("rank_from", 1).to_list(50)
    assignments = []
    for prize in prizes:
        winners = users[prize["rank_from"] - 1 : prize["rank_to"]]
        winner_ids = [w["id"] for w in winners]
        await db.prizes.update_one({"id": prize["id"]}, {"$set": {"assigned_user_ids": winner_ids}})
        assignments.append({"prize": prize["title"], "winners": winner_ids})
    await log_action(admin["id"], admin.get("employee_id"), "prizes_assign", "prizes", {"assignments": assignments})
    return assignments

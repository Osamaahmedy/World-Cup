"""Predictions, leaderboard, dashboard."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from audit import log_action
from database import db
from models import Prediction, PredictionCreate
from security import get_current_user, require_role

router = APIRouter(prefix="/predictions", tags=["predictions"])


async def _window_open() -> bool:
    doc = await db.settings.find_one({"key": "prediction_window"})
    return bool(doc and doc.get("value", {}).get("open", True))


@router.get("/mine", response_model=List[Prediction])
async def my_predictions(user=Depends(get_current_user)):
    preds = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Prediction(**p) for p in preds]


@router.post("", response_model=Prediction)
async def create_or_update_prediction(payload: PredictionCreate, user=Depends(get_current_user)):
    if not await _window_open():
        raise HTTPException(status_code=403, detail="Predictions are currently closed")
    match = await db.matches.find_one({"id": payload.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    # Lock when match started/finished
    try:
        ko = datetime.fromisoformat(match["kickoff"].replace("Z", "+00:00"))
    except Exception:
        ko = datetime.now(timezone.utc)
    if match["status"] in ("live", "finished") or ko <= datetime.now(timezone.utc):
        raise HTTPException(status_code=423, detail="Prediction locked: match already started")

    existing = await db.predictions.find_one({"user_id": user["id"], "match_id": payload.match_id}, {"_id": 0})
    if existing:
        await db.predictions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "home_score": payload.home_score,
                "away_score": payload.away_score,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        new_doc = await db.predictions.find_one({"id": existing["id"]}, {"_id": 0})
        return Prediction(**new_doc)

    p = Prediction(
        user_id=user["id"],
        match_id=payload.match_id,
        home_score=payload.home_score,
        away_score=payload.away_score,
    )
    await db.predictions.insert_one(p.model_dump())
    return p


# Leaderboard router (separate to keep namespace clean)
lb_router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@lb_router.get("")
async def leaderboard(department: Optional[str] = None, limit: int = 100, user=Depends(get_current_user)):
    flt = {"role": "employee"}
    if department:
        flt["department"] = department
    users = await db.users.find(flt, {"_id": 0, "password_hash": 0}).to_list(5000)
    users.sort(key=lambda u: (-(u.get("total_points") or 0), u.get("full_name", "")))
    rows = []
    for i, u in enumerate(users[:limit], start=1):
        rows.append({
            "rank": i,
            "user_id": u["id"],
            "full_name": u["full_name"],
            "department": u.get("department"),
            "total_points": u.get("total_points", 0),
            "avatar_url": u.get("avatar_url"),
        })
    return rows


@lb_router.get("/me")
async def my_rank(user=Depends(get_current_user)):
    users = await db.users.find({"role": "employee"}, {"_id": 0, "password_hash": 0}).to_list(5000)
    users.sort(key=lambda u: (-(u.get("total_points") or 0), u.get("full_name", "")))
    rank = next((i + 1 for i, u in enumerate(users) if u["id"] == user["id"]), None)
    # Department rank
    dept_users = [u for u in users if u.get("department") == user.get("department")]
    dept_rank = next((i + 1 for i, u in enumerate(dept_users) if u["id"] == user["id"]), None)
    # Accuracy
    preds = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    settled = [p for p in preds if p.get("points_awarded") is not None]
    correct = [p for p in settled if (p.get("points_awarded") or 0) > 0]
    accuracy = round((len(correct) / len(settled)) * 100, 1) if settled else 0.0
    return {
        "rank": rank,
        "department_rank": dept_rank,
        "total_users": len(users),
        "department_size": len(dept_users),
        "total_points": user.get("total_points", 0),
        "predictions_count": len(preds),
        "settled_count": len(settled),
        "accuracy": accuracy,
    }


# Dashboard
dash_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dash_router.get("")
async def dashboard(user=Depends(get_current_user)):
    # My rank
    rank_info = await my_rank(user)  # type: ignore
    # Upcoming matches (next 5)
    now_iso = datetime.now(timezone.utc).isoformat()
    upcoming = await db.matches.find(
        {"kickoff": {"$gte": now_iso}, "status": {"$in": ["scheduled", "live"]}},
        {"_id": 0},
    ).sort("kickoff", 1).to_list(5)
    # Recent predictions
    preds = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(5)
    # Latest news
    news = await db.news.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(5)
    # Pinned announcements
    annc = await db.announcements.find({}, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(5)
    # Enrich predictions with match summary
    match_ids = list({p["match_id"] for p in preds})
    matches = await db.matches.find({"id": {"$in": match_ids}}, {"_id": 0}).to_list(50)
    match_by_id = {m["id"]: m for m in matches}
    for p in preds:
        p["match"] = match_by_id.get(p["match_id"])
    # Enrich upcoming with team data
    team_ids = list({tid for m in upcoming for tid in (m["home_team_id"], m["away_team_id"])})
    teams = await db.teams.find({"id": {"$in": team_ids}}, {"_id": 0}).to_list(50)
    team_by_id = {t["id"]: t for t in teams}
    for m in upcoming:
        m["home_team"] = team_by_id.get(m["home_team_id"])
        m["away_team"] = team_by_id.get(m["away_team_id"])
    return {
        "me": rank_info,
        "upcoming_matches": upcoming,
        "recent_predictions": preds,
        "news": news,
        "announcements": annc,
    }

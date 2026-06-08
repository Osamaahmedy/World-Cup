"""Tournament management: teams, matches, results."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from audit import log_action
from database import db
from models import Match, MatchCreate, MatchResultUpdate, Team, TeamCreate
from scoring import settle_match
from security import get_current_user, require_role

router = APIRouter(prefix="/tournament", tags=["tournament"])


@router.get("/teams", response_model=List[Team])
async def list_teams(user=Depends(get_current_user)):
    teams = await db.teams.find({}, {"_id": 0}).sort("group", 1).to_list(500)
    return [Team(**t) for t in teams]


@router.post("/teams", response_model=Team)
async def create_team(payload: TeamCreate, admin=Depends(require_role("admin"))):
    if await db.teams.find_one({"code": payload.code}):
        raise HTTPException(status_code=409, detail="Team code already exists")
    t = Team(**payload.model_dump())
    await db.teams.insert_one(t.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "team_create", "teams", {"code": t.code})
    return t


@router.delete("/teams/{team_id}")
async def delete_team(team_id: str, admin=Depends(require_role("admin"))):
    await db.teams.delete_one({"id": team_id})
    await log_action(admin["id"], admin.get("employee_id"), "team_delete", "teams", {"id": team_id})
    return {"ok": True}


@router.get("/matches", response_model=List[Match])
async def list_matches(status: Optional[str] = None, user=Depends(get_current_user)):
    flt = {}
    if status:
        flt["status"] = status
    matches = await db.matches.find(flt, {"_id": 0}).sort("kickoff", 1).to_list(2000)
    return [Match(**m) for m in matches]


@router.post("/matches", response_model=Match)
async def create_match(payload: MatchCreate, admin=Depends(require_role("admin"))):
    home = await db.teams.find_one({"id": payload.home_team_id})
    away = await db.teams.find_one({"id": payload.away_team_id})
    if not home or not away:
        raise HTTPException(status_code=400, detail="Invalid team")
    m = Match(**payload.model_dump())
    await db.matches.insert_one(m.model_dump())
    await log_action(admin["id"], admin.get("employee_id"), "match_create", "matches", {"match": m.id})
    return m


@router.patch("/matches/{match_id}/result", response_model=Match)
async def set_result(match_id: str, payload: MatchResultUpdate, admin=Depends(require_role("admin"))):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "home_score": payload.home_score,
            "away_score": payload.away_score,
            "status": "finished",
        }},
    )
    updated = await settle_match(match_id)
    await log_action(admin["id"], admin.get("employee_id"), "match_result", "matches", {"match": match_id, "predictions_settled": updated})
    new_match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    return Match(**new_match)


@router.delete("/matches/{match_id}")
async def delete_match(match_id: str, admin=Depends(require_role("admin"))):
    await db.matches.delete_one({"id": match_id})
    await db.predictions.delete_many({"match_id": match_id})
    await log_action(admin["id"], admin.get("employee_id"), "match_delete", "matches", {"id": match_id})
    return {"ok": True}


@router.get("/standings")
async def standings(user=Depends(get_current_user)):
    """Compute group standings from finished matches."""
    teams = await db.teams.find({}, {"_id": 0}).to_list(500)
    matches = await db.matches.find({"status": "finished"}, {"_id": 0}).to_list(2000)
    table = {}
    for t in teams:
        table[t["id"]] = {
            "team": t,
            "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0,
        }
    for m in matches:
        hs, as_ = m["home_score"], m["away_score"]
        for tid, gf, ga in [(m["home_team_id"], hs, as_), (m["away_team_id"], as_, hs)]:
            if tid not in table:
                continue
            row = table[tid]
            row["p"] += 1
            row["gf"] += gf
            row["ga"] += ga
            if gf > ga:
                row["w"] += 1
                row["pts"] += 3
            elif gf == ga:
                row["d"] += 1
                row["pts"] += 1
            else:
                row["l"] += 1
        for tid in [m["home_team_id"], m["away_team_id"]]:
            if tid in table:
                table[tid]["gd"] = table[tid]["gf"] - table[tid]["ga"]
    # Group by group
    grouped = {}
    for row in table.values():
        g = row["team"].get("group") or "—"
        grouped.setdefault(g, []).append(row)
    for g in grouped:
        grouped[g].sort(key=lambda r: (-r["pts"], -r["gd"], -r["gf"]))
    return grouped

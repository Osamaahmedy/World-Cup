"""Admin: audit logs, reports, settings."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from database import db
from models import AuditLog, ScoringRules, PredictionWindow
from security import require_role
from audit import log_action
from storage import APP_NAME, MIME_TYPES, put_object

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit-logs", response_model=List[AuditLog])
async def list_audit_logs(limit: int = 200, action: Optional[str] = None, admin=Depends(require_role("admin"))):
    flt = {}
    if action:
        flt["action"] = action
    logs = await db.audit_logs.find(flt, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [AuditLog(**log) for log in logs]


@router.get("/reports/overview")
async def report_overview(admin=Depends(require_role("admin"))):
    total_users = await db.users.count_documents({"role": "employee"})
    active_users = await db.users.count_documents({"role": "employee", "active": True})
    total_matches = await db.matches.count_documents({})
    finished = await db.matches.count_documents({"status": "finished"})
    total_predictions = await db.predictions.count_documents({})
    participants = len(await db.predictions.distinct("user_id"))
    participation_rate = round((participants / total_users) * 100, 1) if total_users else 0.0
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_matches": total_matches,
        "finished_matches": finished,
        "total_predictions": total_predictions,
        "participants": participants,
        "participation_rate": participation_rate,
    }


@router.get("/reports/departments")
async def report_departments(admin=Depends(require_role("admin"))):
    pipeline = [
        {"$match": {"role": "employee"}},
        {"$group": {
            "_id": "$department",
            "members": {"$sum": 1},
            "total_points": {"$sum": "$total_points"},
            "avg_points": {"$avg": "$total_points"},
        }},
        {"$sort": {"total_points": -1}},
    ]
    rows = await db.users.aggregate(pipeline).to_list(200)
    result = []
    for r in rows:
        result.append({
            "department": r["_id"] or "—",
            "members": r["members"],
            "total_points": r["total_points"],
            "avg_points": round(r["avg_points"] or 0, 2),
        })
    return result


@router.get("/reports/accuracy")
async def report_accuracy(admin=Depends(require_role("admin"))):
    preds = await db.predictions.find({}, {"_id": 0}).to_list(20000)
    settled = [p for p in preds if p.get("points_awarded") is not None]
    correct = [p for p in settled if (p.get("points_awarded") or 0) > 0]
    exact = [p for p in settled if (p.get("points_awarded") or 0) >= 10]
    return {
        "settled": len(settled),
        "correct_outcome": len(correct),
        "exact_scores": len(exact),
        "accuracy": round((len(correct) / len(settled)) * 100, 1) if settled else 0.0,
    }


@router.get("/settings/scoring", response_model=ScoringRules)
async def get_scoring(admin=Depends(require_role("admin"))):
    doc = await db.settings.find_one({"key": "scoring_rules"}, {"_id": 0})
    if not doc:
        return ScoringRules()
    return ScoringRules(**doc["value"])


@router.put("/settings/scoring", response_model=ScoringRules)
async def set_scoring(rules: ScoringRules, admin=Depends(require_role("admin"))):
    await db.settings.update_one(
        {"key": "scoring_rules"},
        {"$set": {"key": "scoring_rules", "value": rules.model_dump()}},
        upsert=True,
    )
    await log_action(admin["id"], admin.get("employee_id"), "scoring_update", "settings", rules.model_dump())
    return rules


@router.get("/settings/window", response_model=PredictionWindow)
async def get_window(admin=Depends(require_role("admin"))):
    doc = await db.settings.find_one({"key": "prediction_window"}, {"_id": 0})
    if not doc:
        return PredictionWindow()
    return PredictionWindow(**doc["value"])


@router.put("/settings/window", response_model=PredictionWindow)
async def set_window(window: PredictionWindow, admin=Depends(require_role("admin"))):
    await db.settings.update_one(
        {"key": "prediction_window"},
        {"$set": {"key": "prediction_window", "value": window.model_dump()}},
        upsert=True,
    )
    await log_action(admin["id"], admin.get("employee_id"), "window_update", "settings", window.model_dump())
    return window


@router.get("/settings/branding")
async def get_branding(admin=Depends(require_role("super_admin"))):
    doc = await db.settings.find_one({"key": "branding"}, {"_id": 0})
    return doc["value"] if doc else {}


@router.put("/settings/branding")
async def set_branding(payload: dict, admin=Depends(require_role("super_admin"))):
    await db.settings.update_one(
        {"key": "branding"},
        {"$set": {"key": "branding", "value": payload}},
        upsert=True,
    )
    await log_action(admin["id"], admin.get("employee_id"), "branding_update", "settings", payload)
    return payload


@router.post("/branding/upload")
async def upload_branding_asset(file: UploadFile = File(...), admin=Depends(require_role("super_admin"))):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png").lower()
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    path = f"{APP_NAME}/branding/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, content_type)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_action(admin["id"], admin.get("employee_id"), "branding_upload", "settings", {"path": result["path"]})
    return {"url": f"/api/branding/file/{result['path']}"}

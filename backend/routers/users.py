"""User management routes (admin)."""
import io
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from audit import log_action
from database import db
from models import UserCreate, UserPublic, UserUpdate
from security import get_current_user, hash_password, require_role

router = APIRouter(prefix="/users", tags=["users"])

DEFAULT_PASSWORD = "123456"


def _public(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password_hash"}


@router.get("", response_model=List[UserPublic])
async def list_users(q: Optional[str] = None, department: Optional[str] = None, admin=Depends(require_role("admin"))):
    flt: dict = {}
    if q:
        flt["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"employee_id": {"$regex": q, "$options": "i"}},
        ]
    if department:
        flt["department"] = department
    users = await db.users.find(flt, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(2000)
    return [UserPublic(**u) for u in users]


@router.post("", response_model=UserPublic)
async def create_user(payload: UserCreate, admin=Depends(require_role("admin"))):
    employee_id = payload.employee_id.strip()
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")
    if payload.role == "super_admin" and admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a super admin can create super admins")
    exists = await db.users.find_one({"employee_id": employee_id})
    if exists:
        raise HTTPException(status_code=409, detail="Employee ID already exists")
    import uuid as _u
    doc = payload.model_dump()
    doc["employee_id"] = employee_id
    raw_pw = doc.pop("password", None) or DEFAULT_PASSWORD
    doc["password_hash"] = hash_password(raw_pw)
    # New accounts created with the default password must change it on first login
    doc["requires_password_change"] = (raw_pw == DEFAULT_PASSWORD)
    doc["id"] = "emp-" + _u.uuid4().hex[:8]
    doc["total_points"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one(doc)
    await log_action(admin["id"], admin.get("employee_id"), "user_create", "users", {"new_user": employee_id})
    return UserPublic(**_public(doc))


@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(user_id: str, payload: UserUpdate, admin=Depends(require_role("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if update.get("role") == "super_admin" and admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a super admin can assign super admin role")
    if "employee_id" in update:
        update["employee_id"] = update["employee_id"].strip()
        clash = await db.users.find_one({"employee_id": update["employee_id"], "id": {"$ne": user_id}})
        if clash:
            raise HTTPException(status_code=409, detail="Employee ID already exists")
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
        update["requires_password_change"] = False
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    await log_action(admin["id"], admin.get("employee_id"), "user_update", "users", {"target": user_id, "fields": list(update.keys())})
    new_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserPublic(**new_user)


@router.post("/{user_id}/reset-password")
async def reset_password(user_id: str, admin=Depends(require_role("admin"))):
    """Admin resets an employee's password back to the default and forces a change on next login."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(DEFAULT_PASSWORD), "requires_password_change": True}},
    )
    await log_action(admin["id"], admin.get("employee_id"), "password_reset", "users", {"target": user_id})
    return {"message": "Password reset to default", "default_password": DEFAULT_PASSWORD}


@router.delete("/{user_id}")
async def deactivate_user(user_id: str, admin=Depends(require_role("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"active": False}})
    await log_action(admin["id"], admin.get("employee_id"), "user_deactivate", "users", {"target": user_id})
    return {"ok": True}


@router.post("/import")
async def import_users(file: UploadFile = File(...), admin=Depends(require_role("admin"))):
    """Accept CSV with columns: employee_id,full_name,department,role"""
    content = await file.read()
    import csv as _csv
    text = content.decode("utf-8", errors="ignore")
    reader = _csv.DictReader(io.StringIO(text))
    created, skipped = 0, 0
    import uuid as _u
    for row in reader:
        employee_id = (row.get("employee_id") or "").strip()
        if not employee_id:
            skipped += 1
            continue
        if await db.users.find_one({"employee_id": employee_id}):
            skipped += 1
            continue
        role = (row.get("role") or "employee").strip()
        if role == "super_admin" and admin.get("role") != "super_admin":
            role = "admin"
        doc = {
            "id": "emp-" + _u.uuid4().hex[:8],
            "employee_id": employee_id,
            "full_name": (row.get("full_name") or employee_id).strip(),
            "department": (row.get("department") or "General").strip(),
            "role": role,
            "active": True,
            "avatar_url": None,
            "password_hash": hash_password(DEFAULT_PASSWORD),
            "requires_password_change": True,
            "total_points": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        created += 1
    await log_action(admin["id"], admin.get("employee_id"), "users_import", "users", {"created": created, "skipped": skipped})
    return {"created": created, "skipped": skipped}


@router.get("/departments")
async def list_departments(admin=Depends(require_role("admin"))):
    depts = await db.users.distinct("department")
    return [d for d in depts if d]

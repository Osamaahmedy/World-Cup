"""Auth routes: login by employee ID, me, forced password change."""
from collections import defaultdict
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from audit import log_action
from database import db
from models import LoginRequest, TokenResponse, UserPublic, ChangePasswordRequest
from security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
    validate_password_strength,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory brute-force throttle (per IP+employee_id)
_attempts: dict = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 300


def _key(ip: str, identifier: str) -> str:
    return f"{ip}:{identifier.lower()}"


def _check_rate(ip: str, identifier: str):
    k = _key(ip, identifier)
    now = time.time()
    _attempts[k] = [t for t in _attempts[k] if now - t < WINDOW_SECONDS]
    if len(_attempts[k]) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")


def _record_attempt(ip: str, identifier: str):
    _attempts[_key(ip, identifier)].append(time.time())


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
    employee_id = payload.employee_id.strip()
    _check_rate(ip, employee_id)

    user = await db.users.find_one({"employee_id": employee_id}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        _record_attempt(ip, employee_id)
        await log_action(None, employee_id, "login_failed", "auth", {"ip": ip}, ip=ip)
        raise HTTPException(status_code=401, detail="Invalid employee ID or password")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")

    token = create_access_token(subject=user["id"], role=user.get("role", "employee"))
    await log_action(user["id"], employee_id, "login_success", "auth", {"ip": ip}, ip=ip)

    public = {k: v for k, v in user.items() if k != "password_hash"}
    return TokenResponse(access_token=token, user=UserPublic(**public))


@router.get("/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(**user)


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    """Authenticated password change. Used for the forced first-login change and
    voluntary changes from the profile page. Enforces a strong password policy."""
    full = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full or not verify_password(payload.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    validate_password_strength(payload.new_password)
    if verify_password(payload.new_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="New password must be different from the current one")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(payload.new_password), "requires_password_change": False}},
    )
    await log_action(user["id"], user.get("employee_id"), "password_change", "auth")
    return {"message": "Password changed successfully"}

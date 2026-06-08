"""Audit log helper."""
from typing import Optional

from database import db
from models import AuditLog


async def log_action(
    user_id: Optional[str],
    user_email: Optional[str],
    action: str,
    resource: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip: Optional[str] = None,
):
    entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource=resource,
        metadata=metadata,
        ip=ip,
    )
    await db.audit_logs.insert_one(entry.model_dump())

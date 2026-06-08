"""Mongo DB singleton + indexing."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


async def ensure_indexes():
    # --- Users migration: drop legacy email-based users so the schema can switch
    # to employee_id. This runs before index creation so old indexes are removed too.
    try:
        legacy = await db.users.find_one({"employee_id": {"$exists": False}})
        if legacy is not None:
            await db.users.drop()
    except Exception:
        pass
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    await db.users.create_index("id", unique=True)
    await db.users.create_index("employee_id", unique=True)
    await db.users.create_index("department")
    await db.teams.create_index("id", unique=True)
    await db.teams.create_index("code", unique=True)
    await db.matches.create_index("id", unique=True)
    await db.matches.create_index("kickoff")
    await db.predictions.create_index("id", unique=True)
    await db.predictions.create_index([("user_id", 1), ("match_id", 1)], unique=True)
    await db.predictions.create_index("match_id")
    await db.news.create_index("id", unique=True)
    await db.announcements.create_index("id", unique=True)
    await db.prizes.create_index("id", unique=True)
    await db.audit_logs.create_index("id", unique=True)
    await db.audit_logs.create_index("created_at")
    await db.notifications.create_index("id", unique=True)
    await db.notifications.create_index("user_id")
    await db.settings.create_index("key", unique=True)

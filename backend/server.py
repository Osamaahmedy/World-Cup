"""World Cup Predictor - FastAPI entrypoint."""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from database import client, ensure_indexes  # noqa: E402
from storage import get_object, init_storage  # noqa: E402
from routers import auth as auth_router  # noqa: E402
from routers import users as users_router  # noqa: E402
from routers import tournament as tournament_router  # noqa: E402
from routers import predictions as predictions_router  # noqa: E402
from routers import content as content_router  # noqa: E402
from routers import admin as admin_router  # noqa: E402
from seed import seed_all  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("worldcup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await seed_all()
    try:
        init_storage()
        logger.info("Object storage initialized.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Storage init failed: {e}")
    logger.info("Database initialized and seeded.")
    yield
    client.close()


app = FastAPI(title="Company World Cup Predictor", version="1.0.0", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Company World Cup Predictor API", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


# Public settings endpoint (for branding) — no auth required
@api_router.get("/branding")
async def public_branding():
    from database import db
    doc = await db.settings.find_one({"key": "branding"}, {"_id": 0})
    return doc["value"] if doc else {}


# Public branding asset serving — login page must render before auth
@api_router.get("/branding/file/{path:path}")
async def serve_branding_file(path: str):
    from database import db
    from fastapi.concurrency import run_in_threadpool
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = await run_in_threadpool(get_object, path)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="File not available")
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=3600"},
    )


api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(tournament_router.router)
api_router.include_router(predictions_router.router)
api_router.include_router(predictions_router.lb_router)
api_router.include_router(predictions_router.dash_router)
api_router.include_router(content_router.router)
api_router.include_router(admin_router.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

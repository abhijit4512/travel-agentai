"""FastAPI entry point.  Run from the backend folder:  uvicorn app.main:app --reload"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .api.routes_v2 import router as router_v2
from .api.routes_admin import router as router_admin
from .api.routes_admin_catalog import router as router_admin_catalog
from .api.routes_memories import router as router_memories
from .api.routes_travel import router as router_travel
from .api.routes_admin_images import router as router_admin_images
from .config import settings
from .database.db import init_db
from .database.extras import init_extras
from .database.travel_extras import init_travel_tables
from .services.fuel import seed_fuel_and_vehicles
from .services.places import seed_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("travel-agent")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    init_extras()
    init_travel_tables()
    seed_fuel_and_vehicles()
    log.info("Seeded %d places", seed_db())
    yield


app = FastAPI(title="India AI Travel Agent", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.frontend_origins, allow_methods=["GET", "POST", "PUT", "DELETE"],
                   allow_headers=["Content-Type", "X-Session-Id", "Authorization"])
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(router)
app.include_router(router_v2)
app.include_router(router_admin)
app.include_router(router_admin_catalog)
app.include_router(router_travel)
app.include_router(router_memories)
app.include_router(router_admin_images)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return _error(exc.status_code, f"http_{exc.status_code}", str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    return _error(422, "validation_error", f"Invalid input{' at ' + where if where else ''}: {first.get('msg', '')}")


@app.exception_handler(Exception)
async def unexpected_error(_: Request, exc: Exception):
    log.exception("Unhandled error")          # stack trace goes to the server log only
    return _error(500, "internal_error", "Something went wrong on the server. Please try again.")

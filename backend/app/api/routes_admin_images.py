"""Admin-only image search, manual upload, and destination image selection."""
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field

from ..services import admin as svc, images
from .deps import client_ip, rate_limit, require_admin

router = APIRouter(prefix="/api/admin/images", dependencies=[Depends(rate_limit)])

BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads" / "destination-images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class SelectionIn(BaseModel):
    destination_id: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    destination_name: str = Field(min_length=2, max_length=120)
    state: str = Field(default="", max_length=80)
    photo: dict


@router.get("/search")
async def search(q: str = Query(..., min_length=2, max_length=160),
                 limit: int = Query(8, ge=1, le=12),
                 admin: dict = Depends(require_admin)):
    return await images.search_candidates(q, limit)


@router.post("/upload")
async def upload_image(request: Request, file: UploadFile = File(...),
                       admin: dict = Depends(require_admin)):
    """Store an admin-uploaded image and return it as a selectable gallery item."""
    suffix = ALLOWED_TYPES.get(file.content_type or "")
    if not suffix:
        raise HTTPException(415, "Upload a JPG, PNG, or WEBP image.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 8 MB or smaller.")

    filename = f"{uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(content)
    url = f"{str(request.base_url).rstrip('/')}/uploads/destination-images/{filename}"
    item = {
        "url": url,
        "alt": Path(file.filename or "Destination image").stem.replace("_", " ").replace("-", " "),
        "attribution": "Uploaded by admin",
        "attribution_uri": "",
        "provider": "Manual upload",
        "license": "Admin-provided image; confirm you have permission to use it.",
        "license_uri": "",
        "photo_uri": "",
        "source_id": filename,
    }
    return {"ok": True, "item": item}


@router.get("/selected")
def selected(destination_id: str = Query(..., min_length=2, max_length=100),
             admin: dict = Depends(require_admin)):
    return {"item": images.get_selected(destination_id)}


@router.put("/selection")
def save(body: SelectionIn, request: Request, admin: dict = Depends(require_admin)):
    try:
        item = images.save_selection(body.destination_id, body.destination_name,
                                     body.state, body.photo, int(admin["id"]))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    svc.audit(admin, "select_destination_image", "destination", body.destination_id,
              f"{body.destination_name} · {body.state}", client_ip(request))
    return {"ok": True, "item": item}

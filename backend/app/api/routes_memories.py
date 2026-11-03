"""Travel memories API. Everything is owner-only except share links and the public gallery. Files are served by short-lived signed links."""
from __future__ import annotations

import os
import tempfile
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from ..services import memories as mem
from ..services import memory_storage as store
from .deps import get_current_user, rate_limit

router = APIRouter(prefix="/api/memories", dependencies=[Depends(rate_limit)])
DATE = "^\\d{4}-\\d{2}-\\d{2}$"


def _guard(fn, *a, **k):
    try:
        return fn(*a, **k)
    except LookupError as exc:
        raise HTTPException(404, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))


class AlbumIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    story: str = Field(default="", max_length=8000)
    location_name: str = Field(default="", max_length=120)
    place_id: str | None = Field(default=None, max_length=80)
    travel_date: str | None = Field(default=None, pattern=DATE)


class AlbumPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    story: str | None = Field(default=None, max_length=8000)
    location_name: str | None = Field(default=None, max_length=120)
    travel_date: str | None = Field(default=None, pattern=DATE)
    cover_media_id: int | None = None


@router.post("/albums", status_code=201)
def create_album(body: AlbumIn, user: dict = Depends(get_current_user)) -> dict:
    return _guard(mem.create_album, user["id"], body.title, body.description, body.story, body.location_name, body.place_id, body.travel_date)


@router.get("/albums")
def albums(user: dict = Depends(get_current_user)) -> dict:
    return {"items": mem.list_albums(user["id"])}


@router.get("/albums/{album_id}")
def album(album_id: int, user: dict = Depends(get_current_user)) -> dict:
    return _guard(mem.get_album, user["id"], album_id)


@router.patch("/albums/{album_id}")
def patch_album(album_id: int, body: AlbumPatch, user: dict = Depends(get_current_user)) -> dict:
    return _guard(mem.update_album, user["id"], album_id, body.model_dump(exclude_unset=True))


@router.delete("/albums/{album_id}", status_code=204)
def delete_album(album_id: int, user: dict = Depends(get_current_user)) -> Response:
    _guard(mem.delete_album, user["id"], album_id)
    return Response(status_code=204)


class VisibilityIn(BaseModel):
    visibility: str = Field(pattern="^(private|shared|public)$")


@router.post("/albums/{album_id}/visibility")
def visibility(album_id: int, body: VisibilityIn, user: dict = Depends(get_current_user)) -> dict:
    return _guard(mem.set_visibility, user["id"], album_id, body.visibility)


# ---------- uploads ----------
@router.post("/albums/{album_id}/media", status_code=201)
async def upload(album_id: int, file: UploadFile = File(...), caption: str = Form("", max_length=300), user: dict = Depends(get_current_user)) -> dict:
    _guard(mem.assert_owner, user["id"], album_id)
    head = await file.read(32)
    sniffed = store.sniff(head)
    if sniffed is None:
        raise HTTPException(415, "Unsupported file. Allowed: JPEG, PNG, GIF, WebP photos, MP4 or WebM videos, and PDF documents.")
    mime, kind, ext = sniffed
    limit = store.MAX_BYTES[kind]
    stored = store.new_name(user["id"], ext)
    path = store.path_for(stored)
    path.parent.mkdir(parents=True, exist_ok=True)
    size = len(head)
    try:
        with open(path, "wb") as out:
            out.write(head)
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"That file is too large. The limit for this type is {limit // (1024 * 1024)} MB.")
                out.write(chunk)
        return mem.add_media_record(user["id"], album_id, os.path.basename(file.filename or "file" + ext), stored, mime, kind, size, caption)
    except ValueError as exc:
        store.delete(stored); raise HTTPException(422, str(exc))
    except Exception:
        store.delete(stored); raise


class CaptionIn(BaseModel):
    caption: str = Field(max_length=300)


@router.patch("/media/{media_id}")
def caption(media_id: int, body: CaptionIn, user: dict = Depends(get_current_user)) -> dict:
    return _guard(mem.update_caption, user["id"], media_id, body.caption)


@router.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: int, user: dict = Depends(get_current_user)) -> Response:
    _guard(mem.delete_media, user["id"], media_id)
    return Response(status_code=204)


@router.get("/file/{media_id}")
def serve_file(media_id: int, exp: int = Query(...), sig: str = Query(..., max_length=64)) -> FileResponse:
    """Signed, short-lived link created by the server only for the owner or for a valid share link. No login header is needed for <img> tags."""
    if not store.verify(media_id, exp, sig):
        raise HTTPException(403, "This link has expired or is not valid.")
    m = mem.media_file(media_id)
    if m is None:
        raise HTTPException(404, "File not found.")
    try:
        path = store.path_for(m["stored_name"])
    except ValueError:
        raise HTTPException(404, "File not found.")
    if not path.exists():
        raise HTTPException(404, "File not found.")
    return FileResponse(path, media_type=m["mime"], headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300"},
                        content_disposition_type="attachment" if m["mime"] == "application/pdf" else "inline", filename=m["original_name"])


# ---------- sharing, public gallery, timeline, download, AI ----------
@router.get("/shared/{token}")
def shared(token: str) -> dict:
    a = mem.shared_album(token)
    if a is None:
        raise HTTPException(404, "This album is private or the link is no longer valid.")
    return a


@router.get("/public")
def public(page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=48)) -> dict:
    return mem.public_albums(page, page_size)


@router.get("/timeline")
def timeline(user: dict = Depends(get_current_user)) -> dict:
    return mem.timeline(user["id"])


@router.get("/recap")
def recap(year: int | None = Query(None, ge=2000, le=2100), user: dict = Depends(get_current_user)) -> dict:
    return mem.recap(user["id"], year or date.today().year)


@router.get("/albums/{album_id}/download")
def download(album_id: int, user: dict = Depends(get_current_user)) -> FileResponse:
    fd, tmp = tempfile.mkstemp(suffix=".zip"); os.close(fd)
    try:
        _guard(mem.build_zip, user["id"], album_id, tmp)
    except HTTPException:
        os.remove(tmp); raise
    return FileResponse(tmp, media_type="application/zip", filename=f"album-{album_id}.zip", background=BackgroundTask(os.remove, tmp))


class AiIn(BaseModel):
    task: str = Field(pattern="^(titles|summary|highlights)$")


def _ai(fn, *a):
    try:
        return {"text": fn(*a), "note": "Written by AI from your album text only. Your photos are never sent. Check it before sharing."}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except LookupError as exc:
        raise HTTPException(404, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception:                                                              # noqa: BLE001
        raise HTTPException(502, "The AI service could not be reached. Please try again later.")


@router.post("/albums/{album_id}/ai")
def album_ai(album_id: int, body: AiIn, user: dict = Depends(get_current_user)) -> dict:
    return _ai(mem.album_ai, user["id"], album_id, body.task)


@router.get("/recap/ai")
def recap_ai(year: int | None = Query(None, ge=2000, le=2100), user: dict = Depends(get_current_user)) -> dict:
    return _ai(mem.recap_ai, user["id"], year or date.today().year)

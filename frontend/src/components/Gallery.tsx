import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Photo } from "../types";

/** Photo gallery with a full-screen viewer (Esc closes, arrow keys move). */
export default function Gallery({ id, name }: { id: string; name: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { api.photos(id, 8).then((r) => setPhotos(r.photos)).catch(() => setPhotos([])); }, [id]);

  useEffect(() => {
    if (open === null || !photos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos]);

  if (!photos) return <div className="skeleton" style={{ height: 260 }} aria-hidden="true" />;
  if (photos.length === 0) return <p className="muted">No free-licensed photos were found for {name}.</p>;
  const cur = open !== null ? photos[open] : null;
  return (
    <>
      <div className="gallery">
        {photos.slice(0, 5).map((p, i) => (
          <button key={p.url} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${name} full screen`}>
            <figure className="dest-img"><img src={p.url} alt={p.alt} loading="lazy" decoding="async" /></figure>
          </button>
        ))}
      </div>
      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${name} photo viewer`} onClick={() => setOpen(null)}>
          <button className="icon-btn close" aria-label="Close viewer" onClick={() => setOpen(null)}><X size={20} /></button>
          <div onClick={(e) => e.stopPropagation()}>
            <img src={cur.url} alt={cur.alt} />
            <p className="cap">Photo: {cur.attribution}{cur.license ? ` (${cur.license})` : ""} via Wikimedia Commons · {open! + 1} of {photos.length}</p>
          </div>
        </div>
      )}
    </>
  );
}

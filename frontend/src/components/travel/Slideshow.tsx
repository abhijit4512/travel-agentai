import { Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Row } from "../../services/travelApi";

/** Full-screen photo viewer and slideshow. Esc closes, arrow keys move, Space pauses. Respects reduced motion by not auto-playing. */
export default function Slideshow({ photos, start = 0, onClose }: { photos: Row[]; start?: number; onClose: () => void }) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(start), [playing, setPlaying] = useState(!reduce && photos.length > 1);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % photos.length), 3500);
    return () => window.clearInterval(t);
  }, [playing, photos.length]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + photos.length) % photos.length);
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, [photos.length, onClose]);
  const p = photos[i];
  if (!p) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo slideshow" onClick={onClose}>
      <div className="row" style={{ position: "absolute", top: 12, right: 12 }} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause slideshow" : "Play slideshow"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
      <div onClick={(e) => e.stopPropagation()}><img src={p.url} alt={p.caption || p.original_name} /><p className="cap">{p.caption || ""} {i + 1} of {photos.length}</p></div>
    </div>
  );
}

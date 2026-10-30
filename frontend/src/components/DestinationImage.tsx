import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Photo } from "../types";

interface Props { id: string; name: string; index?: number; className?: string; eager?: boolean; onPhoto?: (p: Photo | null) => void }

/**
 * Real, licensed photo with attribution, or a labelled placeholder. Never a random image.
 * Photos load only when the card scrolls near the screen. The box keeps its aspect ratio, so nothing jumps.
 */
export default function DestinationImage({ id, name, index = 0, className = "", eager = false, onPhoto }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(eager);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setState("loading"); setBroken(false);
    api.photos(id, Math.max(1, index + 1))
      .then((r) => { if (!alive) return; const p = r.photos[index] ?? r.photos[0] ?? null; setPhoto(p); setState(p ? "ready" : "none"); onPhoto?.(p); })
      .catch(() => { if (alive) { setState("none"); onPhoto?.(null); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, index, visible]);

  if (state === "ready" && photo && !broken) {
    return (
      <figure ref={ref} className={`dest-img ${className}`}>
        <img src={photo.url} alt={photo.alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBroken(true)} />
        <figcaption>
          Photo: {photo.attribution_uri ? <a href={photo.attribution_uri} target="_blank" rel="noreferrer">{photo.attribution}</a> : photo.attribution}
          {photo.license ? <> ({photo.license_uri ? <a href={photo.license_uri} target="_blank" rel="noreferrer">{photo.license}</a> : photo.license})</> : null} via Wikimedia Commons
        </figcaption>
      </figure>
    );
  }
  return (
    <figure ref={ref} className={`dest-img placeholder ${className} ${state === "loading" ? "skeleton" : ""}`} role="img" aria-label={`No photo available for ${name}`}>
      {state !== "loading" && <span>{name}<small>No free photo found for this place.</small></span>}
    </figure>
  );
}

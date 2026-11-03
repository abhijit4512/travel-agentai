import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Photo } from "../types";

interface Props {
  id: string;
  name: string;
  index?: number;
  className?: string;
  eager?: boolean;
  onPhoto?: (p: Photo | null) => void;
}

export default function DestinationImage({
  id,
  name,
  index = 0,
  className = "",
  eager = false,
  onPhoto,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(eager);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (visible || !ref.current) return;

    // Fallback for browsers without IntersectionObserver.
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    let alive = true;
    setState("loading");
    setBroken(false);

    api.photos(id, Math.max(1, index + 1), attempt > 0, name)
      .then((response) => {
        if (!alive) return;
        if (response.status === "unavailable") {
          setState("error");
          onPhoto?.(null);
          return;
        }

        const selected = response.photos[index] ?? response.photos[0] ?? null;
        setPhoto(selected);
        setState(selected ? "ready" : "none");
        onPhoto?.(selected);
      })
      .catch(() => {
        if (alive) {
          setState("error");
          onPhoto?.(null);
        }
      });

    return () => {
      alive = false;
    };
    // onPhoto is intentionally excluded: callers may pass an inline callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, index, visible, attempt]);

  if (state === "ready" && photo && !broken) {
    return (
      <figure ref={ref} className={`dest-img ${className}`}>
        <img
          src={photo.url}
          alt={photo.alt || name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onError={() => setBroken(true)}
        />
        <figcaption>
          {photo.license ? (
            <>
              {" ("}
              {photo.license_uri ? (
                <a href={photo.license_uri} target="_blank" rel="noreferrer">
                  {photo.license}
                </a>
              ) : photo.license}
              {")"}
            </>
          ) : null}
          {" via "}
          <a href={photo.photo_uri || "https://unsplash.com"} target="_blank" rel="noreferrer">
            {photo.provider || "Image provider"}
          </a>
        </figcaption>
      </figure>
    );
  }

  const failed = state === "error" || broken;

  return (
    <figure
      ref={ref}
      className={`dest-img placeholder ${className} ${state === "loading" ? "skeleton" : ""}`}
      role="img"
      aria-label={`No photo available for ${name}`}
    >
      {state !== "loading" && (
        <span>
          {name}
          <small>{failed ? "The photo could not be loaded." : "No free photo found for this place."}</small>
          {failed && (
            <button
              type="button"
              className="btn sm ghost"
              style={{ position: "relative", zIndex: 3, marginTop: 6 }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBroken(false);
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          )}
        </span>
      )}
    </figure>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, PlaceQuery } from "../services/api";
import type { Destination } from "../types";
import PlaceCard from "./PlaceCard";
import { SectionHead, Skeleton } from "./ui";

interface Props { eyebrow?: string; title: string; blurb?: string; query: PlaceQuery; to: string; variant?: "rail" | "mosaic"; note?: string }

/** A titled, horizontally scrolling row of destinations. It loads its data only when scrolled into view. */
export default function Rail({ eyebrow, title, blurb, query, to, variant = "rail", note }: Props) {
  const host = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Destination[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(host.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!go) return;
    api.placesCached({ page_size: variant === "mosaic" ? 5 : 10, ...query }).then((r) => setItems(r.items)).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  if (failed || (items && items.length === 0)) return null;
  return (
    <section ref={host} className="section" aria-label={title}>
      <div className="container">
        <SectionHead eyebrow={eyebrow} title={title} blurb={blurb} to={to}
          right={variant === "rail" ? (
            <div className="rail-nav">
              <button className="icon-btn" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><ChevronLeft size={20} /></button>
              <button className="icon-btn" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><ChevronRight size={20} /></button>
            </div>) : undefined} />
        {note && <p className="small muted">{note}</p>}
        {!items ? <Skeleton height={300} /> : variant === "mosaic" ? (
          <div className="mosaic">{items.slice(0, 5).map((d, i) => <PlaceCard key={d.id} d={d} variant={i === 0 ? "big" : "overlay"} />)}</div>
        ) : (
          <div className="rail"><div className="rail-track" ref={track}>{items.map((d) => <PlaceCard key={d.id} d={d} />)}</div></div>
        )}
      </div>
    </section>
  );
}

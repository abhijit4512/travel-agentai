import { useEffect, useState } from "react";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { ORIGIN_CITIES } from "../services/text";
import type { Destination } from "../types";

export default function Weekend() {
  useSeo({ title: "Weekend trip finder", description: "Find destinations within reach of your city." });
  const [origin, setOrigin] = useState("Hyderabad"), [maxKm, setMaxKm] = useState(400), [tag, setTag] = useState("");
  const [items, setItems] = useState<Destination[] | null>(null), [err, setErr] = useState(""), [note, setNote] = useState("");
  useEffect(() => { setItems(null); setErr(""); const t = setTimeout(() => api.weekend(origin, maxKm, tag).then((r) => { setItems(r.items); setNote(r.note); }).catch((e: Error) => setErr(e.message)), 250); return () => clearTimeout(t); }, [origin, maxKm, tag]);
  return (
    <div className="container page"><div className="page-head"><p className="eyebrow">Short breaks</p><h1>Weekend trip finder</h1><p className="muted">Pick your city and how far you are willing to go. Distances are straight-line estimates, so real travel time will be longer.</p></div>
      <div className="filters" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>Starting city<select value={origin} onChange={(e) => setOrigin(e.target.value)}>{ORIGIN_CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Within (km, straight line)<select value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))}>{[150, 250, 400, 600, 900].map((k) => <option key={k} value={k}>{k} km</option>)}</select></label>
        <label>Theme<select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Any</option>{["hills", "beach", "heritage", "temple", "wildlife", "waterfall", "adventure"].map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      {err && <ErrorBox message={err} />}{!items && !err && <Skeleton height={300} />}
      {items && items.length === 0 && <EmptyState title="Nothing in range"><p>Try a larger distance or another theme.</p></EmptyState>}
      {items && <><p className="small muted">{items.length} places. {note}</p><div className="grid">{items.map((d) => <PlaceCard key={d.id} d={d} />)}</div></>}
    </div>
  );
}

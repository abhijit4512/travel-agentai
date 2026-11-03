import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import type { Row } from "../../services/travelApi";

export function ExternalLinks({ links, disclaimer }: { links: { label: string; url: string; kind: string }[]; disclaimer?: string }) {
  return (
    <section className="card" aria-labelledby="ext-h">
      <h3 id="ext-h">Book on another website</h3>
      <p className="small muted">{disclaimer ?? "These links open other websites. This app does not book anything and cannot see what you book there."}</p>
      <ul className="ext-list">{links.map((l) => (
        <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={14} /> {l.label}</a>{l.kind === "official" && <span className="status s-confirmed">official</span>}{l.kind === "search" && <span className="muted xs"> web search</span>}</li>))}</ul>
    </section>
  );
}

/** Type a place name, pick it from the list. Reports the place id. */
export function PlacePicker({ label, value, onPick, placeholder = "Start typing a place" }: { label: string; value: string; onPick: (p: { id: string; name: string } | null, text: string) => void; placeholder?: string }) {
  const [sugs, setSugs] = useState<{ id: string; name: string; state: string }[]>([]);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function change(text: string) {
    onPick(null, text);
    window.clearTimeout(timer.current);
    if (text.trim().length < 2) { setSugs([]); return; }
    timer.current = window.setTimeout(() => api.suggest(text.trim()).then((r) => setSugs(r.suggestions)).catch(() => setSugs([])), 220);
  }
  return (
    <label className="ac">{label}
      <input value={value} onChange={(e) => change(e.target.value)} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={sugs.length > 0} />
      {sugs.length > 0 && <ul role="listbox">{sugs.map((s) => <li key={s.id}><button type="button" role="option" aria-selected={false} onClick={() => { onPick({ id: s.id, name: s.name }, s.name); setSugs([]); }}>{s.name} <span className="muted xs">{s.state}</span></button></li>)}</ul>}
    </label>
  );
}

export function NearbyList({ data, empty }: { data: Row | null; empty?: string }) {
  if (!data) return null;
  if (data.status === "unavailable") return <p className="notice warn small">{data.message}</p>;
  const items: Row[] = data.items ?? [];
  return (
    <div>
      {items.length === 0 ? <p className="muted small">{empty ?? "Nothing found nearby in OpenStreetMap."}</p> : (
        <ul className="nearby">{items.slice(0, 12).map((i) => (
          <li key={i.osm_id}><div><b>{i.name}</b>{i.brand || i.operator ? <span className="muted small"> · {i.brand || i.operator}</span> : null}<br /><span className="muted small">{i.address || "Address not listed"} · about {i.distance_km} km (straight line)</span></div>
            <a className="btn sm ghost" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`}>Map</a></li>))}</ul>)}
      <p className="xs muted">{data.attribution}. {data.note}{data.cached ? " Cached up to 24 hours." : ""}</p>
    </div>
  );
}

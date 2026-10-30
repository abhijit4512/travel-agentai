import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, ErrorBox, Pager, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { MONTHS } from "../services/text";
import type { Destination, StateInfo, TagInfo } from "../types";

const RECENT = "yatra_recent_searches";
export const addRecent = (q: string) => { try { const cur: string[] = JSON.parse(localStorage.getItem(RECENT) ?? "[]"); localStorage.setItem(RECENT, JSON.stringify([q, ...cur.filter((x) => x !== q)].slice(0, 8))); } catch { /* blocked */ } };
export const getRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? "[]"); } catch { return []; } };

export default function Explore() {
  useSeo({ title: "Explore India", description: "Search temples, wildlife parks, beaches, hill stations and heritage sites across every Indian state and union territory." });
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "", state = sp.get("state") ?? "", tag = sp.get("tag") ?? "", month = sp.get("month") ?? "", sort = sp.get("sort") ?? "relevance";
  const page = Number(sp.get("page") ?? 1) || 1;
  const [text, setText] = useState(q);
  const [data, setData] = useState<{ items: Destination[]; total: number; pages: number } | null>(null);
  const [error, setError] = useState("");
  const [states, setStates] = useState<StateInfo[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [featured, setFeatured] = useState<Destination[]>([]);

  useEffect(() => { api.states().then(setStates).catch(() => setStates([])); api.tags().then(setTags).catch(() => setTags([])); api.placesCached({ featured: true, page_size: 4 }).then((r) => setFeatured(r.items)).catch(() => {}); }, []);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setSp(n, { replace: true }); };

  useEffect(() => { const t = setTimeout(() => { if (text !== q) set("q", text); }, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [text]);
  useEffect(() => {
    setData(null); setError("");
    api.places({ q, state, tag, month: month ? Number(month) : null, sort, page, page_size: 12 }).then((r) => { setData(r); if (q.trim().length > 2) addRecent(q.trim()); }).catch((e: Error) => setError(e.message));
  }, [q, state, tag, month, sort, page]);
  const clear = () => { setText(""); setSp({}, { replace: true }); };
  const recent = getRecent();

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Explore</p><h1>Explore India</h1><p className="muted">A seed catalogue covering every state and union territory. It grows as places are added, and it is not a complete list of India.</p></div>
      <div className="filters" role="search">
        <label>Search<input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Place, state or theme" /></label>
        <label>State or UT<select value={state} onChange={(e) => set("state", e.target.value)}><option value="">All</option>{states.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.count})</option>)}</select></label>
        <label>Category<select value={tag} onChange={(e) => set("tag", e.target.value)}><option value="">All</option>{tags.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.count})</option>)}</select></label>
        <label>Travel month<select value={month} onChange={(e) => set("month", e.target.value)}><option value="">Any</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        <label>Sort<select value={sort} onChange={(e) => set("sort", e.target.value)}><option value="relevance">Featured first</option><option value="name">Name A to Z</option></select></label>
      </div>
      {!q && recent.length > 0 && <p className="small muted row">Recent: {recent.map((r) => <button key={r} className="chip" onClick={() => { setText(r); set("q", r); }}>{r}</button>)}</p>}
      {error && <ErrorBox message={error} />}
      {!data && !error && <div className="grid">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={330} />)}</div>}
      {data && <p className="small muted" aria-live="polite">{data.total} destination{data.total === 1 ? "" : "s"} found</p>}
      {data && data.items.length === 0 && (
        <EmptyState title="No destinations match"><p>Try removing a filter. Here are some popular places:</p>
          <div className="row" style={{ justifyContent: "center" }}>{featured.map((f) => <a key={f.id} className="chip" href={`/destinations/${f.state_slug}/${f.slug}`}>{f.name}</a>)}</div>
          <p><button className="btn sm" onClick={clear}>Clear all filters</button></p></EmptyState>)}
      {data && <div className="grid">{data.items.map((d) => <PlaceCard key={d.id} d={d} />)}</div>}
      {data && <Pager page={page} pages={data.pages} onPage={(p) => { set("page", String(p)); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    </div>
  );
}

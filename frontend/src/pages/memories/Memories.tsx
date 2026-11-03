import { Plus, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import IndiaMap from "../../components/IndiaMap";
import { PlacePicker } from "../../components/travel/Bits";
import { EmptyState, ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, travelApi } from "../../services/travelApi";
import type { Destination } from "../../types";

const TABS = [["albums", "My albums"], ["timeline", "Timeline"], ["map", "Map"], ["recap", "Yearly recap"], ["public", "Public gallery"]] as const;

export default function Memories() {
  useSeo({ title: "My travel memories", description: "Keep photos, videos and stories from your trips in private albums." });
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("albums");
  const [albums, setAlbums] = useState<Row[] | null>(null), [tl, setTl] = useState<Row | null>(null), [err, setErr] = useState("");
  const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [place, setPlace] = useState<{ id: string; name: string } | null>(null), [placeText, setPlaceText] = useState(""), [date, setDate] = useState(""), [desc, setDesc] = useState("");
  const [year, setYear] = useState(new Date().getFullYear()), [recap, setRecap] = useState<Row | null>(null), [ai, setAi] = useState<Row | null>(null), [pub, setPub] = useState<Row | null>(null);

  useEffect(() => { travelApi.albums().then((r) => setAlbums(r.items)).catch((e: Error) => setErr(e.message)); }, []);
  useEffect(() => { if (tab === "timeline" || tab === "map") travelApi.timeline().then(setTl).catch((e: Error) => setErr(e.message)); }, [tab]);
  useEffect(() => { if (tab === "recap") { setAi(null); travelApi.recap(year).then(setRecap).catch((e: Error) => setErr(e.message)); } }, [tab, year]);
  useEffect(() => { if (tab === "public") travelApi.publicAlbums().then(setPub).catch((e: Error) => setErr(e.message)); }, [tab]);

  async function create(e: FormEvent) {
    e.preventDefault(); setErr("");
    try { const a = await travelApi.createAlbum({ title, place_id: place?.id ?? null, location_name: place ? "" : placeText, travel_date: date || null, description: desc }); nav(`/memories/${a.id}`); }
    catch (x) { setErr((x as Error).message); }
  }
  const mapItems = useMemo(() => (tl?.map ?? []).map((m: Row) => ({ id: String(m.id), name: `${m.title} (${m.media_count} files)`, state: "", lat: m.lat, lng: m.lng, interests: [], tags: [], description: "", best_season: "", budget_per_person_per_day_inr: { low: 0, high: 0, quality: "" } }) as unknown as Destination), [tl]);

  return (
    <div className="container page">
      <div className="page-head row" style={{ justifyContent: "space-between" }}>
        <div><p className="eyebrow">Your journal</p><h1>My travel memories</h1><p className="muted">Albums are private by default. Only you can see them unless you choose to share.</p></div>
        <button className="btn primary" onClick={() => setOpen(!open)}><Plus size={16} /> New album</button>
      </div>
      {open && (
        <form className="card stack" onSubmit={create}>
          <div className="field-row"><label>Album title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Goa Trip" /></label>
            <PlacePicker label="Destination (optional)" value={placeText} onPick={(p, t) => { setPlace(p); setPlaceText(t); }} /><label>Travel date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
          <label>Description (optional)<textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} /></label>
          <div className="row"><button className="btn solid">Create album</button><button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>)}
      {err && <ErrorBox message={err} />}
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "albums" && (!albums ? <Skeleton height={240} /> : albums.length === 0 ? <EmptyState title="No albums yet"><p>Create an album for your next trip, then add photos, videos and stories.</p></EmptyState> :
        <div className="grid" style={{ marginTop: "1rem" }}>{albums.map((a) => (
          <Link key={a.id} to={`/memories/${a.id}`} className="pcard" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="dest-img placeholder">{a.cover_url ? <img src={a.cover_url} alt={`Cover of ${a.title}`} loading="lazy" /> : <span>No photos yet</span>}</div>
            <div className="pcard-body"><h3>{a.title}</h3><p className="meta">{a.location_name || "No location"}{a.travel_date ? ` · ${new Date(a.travel_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
              <p className="small muted">{a.media_count} file{a.media_count === 1 ? "" : "s"} · <span className={`status s-${a.visibility === "private" ? "unpaid" : "confirmed"}`}>{a.visibility}</span></p></div></Link>))}</div>)}

      {tab === "timeline" && (!tl ? <Skeleton height={200} /> : <><p className="small muted">{tl.totals.albums} albums · {tl.totals.places} places · {tl.totals.files} files</p>
        {tl.timeline.length === 0 ? <EmptyState title="Your travel history will appear here" /> : <ol className="timeline">{tl.timeline.map((t: Row) => <li key={t.id}><b>{t.travel_date ?? "No date"}</b><Link to={`/memories/${t.id}`}>{t.title}</Link> <span className="muted small">{t.location_name} · {t.media_count} files</span></li>)}</ol>}</>)}

      {tab === "map" && (!tl ? <Skeleton height={300} /> : tl.map.length === 0 ? <EmptyState title="No albums with a destination yet"><p>Choose a destination when you create an album to see it on the map.</p></EmptyState> :
        <div className="mapgrid" style={{ marginTop: "1rem" }}><IndiaMap items={mapItems} onSelect={(d) => nav(`/memories/${d.id}`)} /><div className="card"><h3>Places you saved memories from</h3><ul>{tl.map.map((m: Row) => <li key={m.id}><Link to={`/memories/${m.id}`}>{m.title}</Link> <span className="muted small">{m.media_count} files</span></li>)}</ul></div></div>)}

      {tab === "recap" && (
        <section className="stack" style={{ marginTop: "1rem" }}>
          <label style={{ maxWidth: 160 }}>Year<input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value) || year)} /></label>
          {!recap ? <Skeleton height={120} /> : <div className="statrow"><div className="stat"><b>{recap.album_count}</b>Albums</div><div className="stat"><b>{recap.files}</b>Files</div><div className="stat"><b>{recap.places.length}</b>Places</div></div>}
          {recap && recap.places.length > 0 && <p className="small">Places: {recap.places.join(", ")}</p>}
          <div className="row"><button className="btn" disabled={!recap?.album_count} onClick={() => void travelApi.recapAi(year).then(setAi).catch((e: Error) => setErr(e.message))}><Sparkles size={16} /> Write my recap with AI</button></div>
          {ai && <div className="card"><p>{ai.text}</p><p className="xs muted">{ai.note}</p></div>}
        </section>)}

      {tab === "public" && (!pub ? <Skeleton height={200} /> : pub.items.length === 0 ? <EmptyState title="No public albums yet"><p>Albums appear here only when their owners choose to make them public.</p></EmptyState> :
        <div className="grid" style={{ marginTop: "1rem" }}>{pub.items.map((a: Row) => (
          <Link key={a.token} to={`/memories/shared/${a.token}`} className="pcard" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="dest-img placeholder">{a.cover_url ? <img src={a.cover_url} alt={`Cover of ${a.title}`} loading="lazy" /> : <span>No cover</span>}</div>
            <div className="pcard-body"><h3>{a.title}</h3><p className="meta">{a.location_name} · by {a.by}</p></div></Link>))}</div>)}
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLinks, PlacePicker } from "../../components/travel/Bits";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { useAuth } from "../../services/auth";
import { Row, travelApi } from "../../services/travelApi";
import { formatInr } from "../../services/text";

const CATS: [string, string][] = [["", "Any"], ["budget", "Budget and hostels"], ["3_star", "3-star"], ["4_star", "4-star"], ["5_star", "5-star"], ["resort", "Resorts"], ["homestay_guesthouse", "Homestays and guest houses"], ["villa_apartment", "Villas and apartments"], ["unrated", "No star rating listed"]];
const FACILITIES = ["", "Swimming pool", "Wi-Fi", "Parking", "Restaurant", "Air conditioning"];

export default function Hotels() {
  useSeo({ title: "Hotels near any destination", description: "Find hotels, resorts and homestays near destinations in India from OpenStreetMap, with links to book on other sites." });
  const [sp] = useSearchParams();
  const { user } = useAuth();
  const [text, setText] = useState(sp.get("name") ?? ""), [placeId, setPlaceId] = useState<string | null>(sp.get("place"));
  const [ci, setCi] = useState(""), [co, setCo] = useState(""), [adults, setAdults] = useState(2), [rooms, setRooms] = useState(1), [radius, setRadius] = useState(10);
  const [cat, setCat] = useState(""), [fac, setFac] = useState(""), [q, setQ] = useState("");
  const [data, setData] = useState<Row | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [log, setLog] = useState<Row | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function search() {
    if (!placeId) { setErr("Choose a destination from the suggestions."); return; }
    if (ci && co && co <= ci) { setErr("Check-out must be after check-in."); return; }
    setErr(""); setBusy(true); setMsg("");
    try { setData(await travelApi.hotels({ place_id: placeId, radius_km: radius, category: cat, facility: fac, q, check_in: ci, check_out: co, adults, rooms })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => { if (placeId) void search(); /* eslint-disable-next-line */ }, []);
  async function saveSearch() { try { await travelApi.saveSearch("hotel", `Hotels near ${text}`, { place: placeId, name: text, ci, co, adults, rooms }); setMsg("Search saved under My Travel."); } catch (e) { setMsg((e as Error).message); } }
  async function submitLog(e: FormEvent) {
    e.preventDefault(); if (!log) return;
    try { await travelApi.logBooking({ category: "hotel", title: log.title, provider: log.provider || "", to_location: text, travel_date: ci || null, amount_inr: Number(log.amount) || 0, reference_from_provider: log.ref || "" }); setMsg("Saved to your own records as an external booking. It is not verified by this app."); setLog(null); }
    catch (x) { setMsg((x as Error).message); }
  }

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Stays</p><h1>Hotels near your destination</h1>
        <p className="muted">Real places from OpenStreetMap. Prices, ratings, photos and room availability are not available from this data, so booking happens on another site.</p></div>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <div className="field-row">
          <PlacePicker label="Destination" value={text} onPick={(p, t) => { setText(t); setPlaceId(p?.id ?? null); }} />
          <label>Check-in<input type="date" min={today} value={ci} onChange={(e) => setCi(e.target.value)} /></label>
          <label>Check-out<input type="date" min={ci || today} value={co} onChange={(e) => setCo(e.target.value)} /></label>
          <label>Guests<input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} /></label>
          <label>Rooms<input type="number" min={1} max={10} value={rooms} onChange={(e) => setRooms(Math.max(1, Number(e.target.value) || 1))} /></label>
        </div>
        <div className="field-row">
          <label>Category<select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Facility (if listed)<select value={fac} onChange={(e) => setFac(e.target.value)}>{FACILITIES.map((f) => <option key={f} value={f}>{f || "Any"}</option>)}</select></label>
          <label>Distance from destination<select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{[3, 5, 10, 20, 30].map((k) => <option key={k} value={k}>within {k} km</option>)}</select></label>
          <label>Hotel name contains<input value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} /></label>
        </div>
        {err && <ErrorBox message={err} />}
        <div className="row"><button className="btn primary" disabled={busy}>{busy ? "Searching..." : "Search hotels"}</button>{data && <button type="button" className="btn ghost" onClick={() => void saveSearch()}>Save this search</button>}{msg && <span role="status" className="small ok">{msg}</span>}</div>
        <p className="xs muted">Price range and star-rating filters are not offered because this data has no prices, and stars are only listed for some hotels.</p>
      </form>
      {busy && <Skeleton height={200} />}
      {data && (
        <div className="two-col" style={{ marginTop: "1.5rem" }}>
          <div>
            <h2>{data.items.length} places near {data.around.name}</h2>
            {data.status === "unavailable" && <p className="notice warn">{data.message}</p>}
            {data.items.length === 0 && data.status !== "unavailable" && <div className="empty">No matches. Try a bigger distance or remove a filter.</div>}
            <ul className="hotels">{data.items.map((h: Row) => (
              <li key={h.osm_id} className="card"><div className="hh"><div><h3>{h.name}</h3><p className="small muted" style={{ margin: 0 }}>{CATS.find(([k]) => k === h.category)?.[1] ?? h.category}{h.stars ? ` · ${h.stars} star` : ""} · about {h.distance_km} km from {data.around.name} (straight line)</p></div></div>
                <p className="small">{h.address || "Address not listed"}</p>
                <p className="small">{h.facilities.length ? h.facilities.join(" · ") : "Facilities not listed in the map data"}</p>
                <p className="xs muted">Price, rating, photos and availability: see a booking site.</p>
                <div className="row">{h.website && <a className="btn sm ghost" href={h.website} target="_blank" rel="noreferrer noopener">Website</a>}{h.phone && <a className="btn sm ghost" href={`tel:${h.phone}`}>{h.phone}</a>}
                  <a className="btn sm ghost" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`}>Map</a>
                  {user && <button className="btn sm" onClick={() => setLog({ title: h.name })}>I booked this elsewhere</button>}</div></li>))}</ul>
            <p className="xs muted">{data.attribution}. {data.note}</p>
          </div>
          <aside className="stack"><ExternalLinks links={data.booking_links} disclaimer={data.availability_note} />
            {log && <form className="card stack" onSubmit={submitLog}><h3>Record an outside booking</h3><p className="small muted">This is your own note. It is saved as "external, not verified".</p>
              <label>Hotel<input value={log.title} onChange={(e) => setLog({ ...log, title: e.target.value })} required minLength={2} /></label>
              <label>Booked on (website)<input value={log.provider ?? ""} onChange={(e) => setLog({ ...log, provider: e.target.value })} /></label>
              <label>Amount you paid (₹, optional)<input type="number" min="0" value={log.amount ?? ""} onChange={(e) => setLog({ ...log, amount: e.target.value })} /></label>
              <label>Their reference (optional)<input value={log.ref ?? ""} onChange={(e) => setLog({ ...log, ref: e.target.value })} /></label>
              <div className="row"><button className="btn solid">Save record</button><button type="button" className="btn ghost" onClick={() => setLog(null)}>Cancel</button></div></form>}
            {!user && <p className="small muted">Log in to keep a record of hotels you book elsewhere.</p>}</aside>
        </div>)}
    </div>
  );
}
export { formatInr };

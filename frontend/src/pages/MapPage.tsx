import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DestinationImage from "../components/DestinationImage";
import IndiaMap, { canonicalState, normState } from "../components/IndiaMap";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { placeLink, tagLabel } from "../services/tags";
import type { Destination, StateInfo } from "../types";

const km = (a: Destination, b: Destination) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export default function MapPage() {
  useSeo({ title: "Map of destinations", description: "Browse destinations on a map of India with state borders, preview them and build a multi-stop route." });
  const [tag, setTag] = useState("");
  const [items, setItems] = useState<Destination[]>([]);
  const [states, setStates] = useState<StateInfo[]>([]);
  const [stateSel, setStateSel] = useState<StateInfo | null>(null);
  const [stateMsg, setStateMsg] = useState("");
  const [sel, setSel] = useState<Destination | null>(null);
  const [route, setRoute] = useState<Destination[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => { api.states().then(setStates).catch(() => setStates([])); }, []);
  useEffect(() => {
    setErr("");
    (async () => { const all: Destination[] = []; for (let p = 1; p <= 6; p++) { const r = await api.places({ tag, page: p, page_size: 48 }); all.push(...r.items); if (p >= r.pages) break; } setItems(all); })().catch((e: Error) => setErr(e.message));
  }, [tag]);

  function onStateClick(name: string) {
    const match = states.find((s) => normState(s.name) === canonicalState(name)) ?? null;
    if (!match) { setStateSel(null); setStateMsg(`No destinations are listed for ${name} yet.`); return; }
    setStateMsg(""); setStateSel((cur) => (cur?.slug === match.slug ? null : match));       // click again to clear
  }
  const inState = useMemo(() => (stateSel ? items.filter((d) => d.state_slug === stateSel.slug) : []), [stateSel, items]);
  const total = useMemo(() => route.slice(1).reduce((n, d, i) => n + km(route[i], d), 0), [route]);
  const dir = route.length >= 2 ? `https://www.google.com/maps/dir/?api=1&origin=${route[0].lat},${route[0].lng}&destination=${route[route.length - 1].lat},${route[route.length - 1].lng}${route.length > 2 ? `&waypoints=${route.slice(1, -1).map((d) => `${d.lat},${d.lng}`).join("%7C")}` : ""}` : null;
  const near = useMemo(() => sel ? items.filter((d) => d.id !== sel.id).map((d) => ({ d, k: km(sel, d) })).sort((a, b) => a.k - b.k).slice(0, 4) : [], [sel, items]);

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Discover</p><h1>Map of destinations</h1><p className="muted">Select a state to focus on it, or a dot to preview a destination, then add stops to build a route. Distances shown are straight-line estimates.</p></div>
      <div className="chips" role="group" aria-label="Filter map by category">
        {["", "temple", "wildlife", "beach", "hills", "heritage", "island", "snow"].map((t) => <button key={t} className={`chip ${tag === t ? "on" : ""}`} onClick={() => setTag(t)}>{t ? tagLabel(t) : "All"}</button>)}
      </div>
      {err && <p className="notice error" role="alert">{err}</p>}
      <div className="mapgrid">
        <IndiaMap items={items} selected={sel?.id} picked={route.map((r) => r.id)} onSelect={setSel} activeState={stateSel ? normState(stateSel.name) : null} onStateClick={onStateClick} />
        <div className="stack">
          {stateMsg && <p className="notice warn small" role="status">{stateMsg}</p>}
          {stateSel && (
            <section className="card"><h3>{stateSel.name}</h3>
              <p className="small muted">{inState.length} destination{inState.length === 1 ? "" : "s"} shown{tag ? ` for ${tagLabel(tag)}` : ""}.</p>
              <ul className="small" style={{ columns: 1 }}>{inState.slice(0, 10).map((d) => <li key={d.id}><button className="link" onClick={() => setSel(d)}>{d.name}</button></li>)}</ul>
              <div className="row"><Link className="btn sm solid" to={`/states/${stateSel.slug}`}>Open {stateSel.name}</Link><button className="btn sm ghost" onClick={() => setStateSel(null)}>Clear state</button></div>
            </section>)}
          {sel ? (
            <article className="card"><div className="pcard" style={{ border: 0, boxShadow: "none" }}><DestinationImage id={sel.id} name={sel.name} /></div>
              <h3 style={{ marginTop: ".75rem" }}>{sel.name}</h3><p className="small muted">{sel.state} · {(sel.tags ?? sel.interests).slice(0, 3).map(tagLabel).join(", ")}</p><p className="small">{sel.description}</p>
              <div className="row"><Link className="btn sm solid" to={placeLink(sel)}>Open details</Link>
                <button className="btn sm" onClick={() => setRoute((r) => r.some((x) => x.id === sel.id) ? r.filter((x) => x.id !== sel.id) : [...r, sel])}>{route.some((x) => x.id === sel.id) ? "Remove from route" : "Add to route"}</button></div>
              {near.length > 0 && <><h4 style={{ margin: "1rem 0 .3rem" }}>Closest in the catalogue</h4><ul className="small">{near.map(({ d, k }) => <li key={d.id}><button className="link" onClick={() => setSel(d)}>{d.name}</button> · about {Math.round(k)} km</li>)}</ul></>}
            </article>
          ) : !stateSel && <div className="empty">Select a state or a dot on the map.</div>}
          <section className="card"><h3>Your route ({route.length} stops)</h3>
            {route.length === 0 ? <p className="small muted">Add stops from the preview card.</p> : <ol>{route.map((d) => <li key={d.id}>{d.name} <button className="link xs" onClick={() => setRoute((r) => r.filter((x) => x.id !== d.id))}>remove</button></li>)}</ol>}
            {route.length >= 2 && <p className="small">Straight-line total about <strong>{Math.round(total)} km</strong> (not road distance or travel time).</p>}
            {dir && <a className="btn sm primary" href={dir} target="_blank" rel="noreferrer">Open route in Google Maps</a>}
            {route.length > 0 && <button className="btn sm ghost" style={{ marginLeft: ".5rem" }} onClick={() => setRoute([])}>Clear</button>}
          </section>
        </div>
      </div>
    </div>
  );
}
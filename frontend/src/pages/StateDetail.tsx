import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { CATEGORY_TILES, tagLabel } from "../services/tags";
import type { Destination } from "../types";

export default function StateDetail() {
  const { state = "" } = useParams();
  const [tag, setTag] = useState("");
  const [items, setItems] = useState<Destination[] | null>(null);
  const [name, setName] = useState(state);
  const [err, setErr] = useState("");
  useSeo({ title: `${name} travel guide`, description: `Temples, wildlife, beaches, hills and heritage in ${name}.` });

  useEffect(() => { api.states().then((s) => setName(s.find((x) => x.slug === state)?.name ?? state)).catch(() => {}); }, [state]);
  useEffect(() => { setItems(null); setErr(""); api.places({ state, tag, page_size: 48 }).then((r) => setItems(r.items)).catch((e: Error) => setErr(e.message)); }, [state, tag]);

  return (
    <div className="container page">
      <p className="small"><Link to="/states">All states and UTs</Link></p>
      <div className="page-head"><h1>{name}</h1><p className="muted">Destinations from the seed catalogue. Food, festivals and hidden gems appear as categories below when we have places for them.</p></div>
      <div className="chips" role="group" aria-label="Filter by category">
        <button className={`chip ${tag === "" ? "on" : ""}`} onClick={() => setTag("")}>All</button>
        {[...CATEGORY_TILES, "culture", "island", "lake", "honeymoon", "weekend"].map((t) => <button key={t} className={`chip ${tag === t ? "on" : ""}`} onClick={() => setTag(t)}>{tagLabel(t)}</button>)}
      </div>
      {err && <ErrorBox message={err} />}
      {!items && !err && <div className="grid">{[1, 2, 3].map((i) => <Skeleton key={i} height={330} />)}</div>}
      {items && items.length === 0 && <EmptyState title="Nothing here yet"><p>No places in this category for {name}. Try another category or add places through the import tool.</p></EmptyState>}
      {items && <div className="grid">{items.map((d) => <PlaceCard key={d.id} d={d} />)}</div>}
    </div>
  );
}

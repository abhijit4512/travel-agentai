import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { ErrorBox, Pager, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import type { Collection, Destination, Paged } from "../types";
import CollectionCard from "../components/CollectionCard";

export function Collections() {
  useSeo({ title: "Travel collections" });
  const [c, setC] = useState<Collection[] | null>(null);
  useEffect(() => { api.collections().then(setC).catch(() => setC([])); }, []);
  return (
    <div className="container page"><div className="page-head"><p className="eyebrow">Inspiration</p><h1>Travel collections</h1><p className="muted">Hand-picked groupings to start your planning.</p></div>
      {!c ? <Skeleton height={240} /> : <div className="grid">{c.map((x) => <CollectionCard key={x.slug} c={x} />)}</div>}</div>
  );
}

export function CollectionDetail() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paged<Destination> & { collection: Collection }) | null>(null);
  const [err, setErr] = useState("");
  useSeo({ title: data?.collection.title ?? "Collection", description: data?.collection.blurb });
  useEffect(() => { setData(null); setErr(""); api.collection(slug, page).then(setData).catch((e: Error) => setErr(e.message)); }, [slug, page]);
  return (
    <div className="container page"><p className="small"><Link to="/collections">All collections</Link></p>
      {err && <ErrorBox message={err} />}
      {!data && !err && <Skeleton height={300} />}
      {data && <><div className="page-head"><h1>{data.collection.title}</h1><p className="muted">{data.collection.blurb} {data.total} destinations.</p></div>
        <div className="grid">{data.items.map((d) => <PlaceCard key={d.id} d={d} />)}</div><Pager page={page} pages={data.pages} onPage={setPage} /></>}</div>
  );
}

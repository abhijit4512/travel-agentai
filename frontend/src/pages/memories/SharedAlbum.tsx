import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Slideshow from "../../components/travel/Slideshow";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, travelApi } from "../../services/travelApi";

export default function SharedAlbum() {
  const { token = "" } = useParams();
  const [a, setA] = useState<Row | null>(null), [err, setErr] = useState(""), [show, setShow] = useState<number | null>(null);
  useEffect(() => { travelApi.shared(token).then(setA).catch((e: Error) => setErr(e.message)); }, [token]);
  useSeo({ title: a?.title ?? "Shared album" });
  if (err) return <div className="container page"><ErrorBox message={err} /><Link className="btn" to="/">Home</Link></div>;
  if (!a) return <div className="container page"><Skeleton height={300} /></div>;
  const photos: Row[] = a.media.filter((m: Row) => m.kind === "photo"), videos: Row[] = a.media.filter((m: Row) => m.kind === "video");
  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Shared by {a.by}</p><h1>{a.title}</h1><p className="muted">{a.location_name}{a.travel_date ? ` · ${a.travel_date}` : ""}</p>{a.description && <p>{a.description}</p>}{a.story && <p style={{ whiteSpace: "pre-wrap" }}>{a.story}</p>}
        {photos.length > 0 && <button className="btn solid" onClick={() => setShow(0)}><Play size={14} /> Slideshow</button>}</div>
      <div className="mgrid">{photos.map((p, i) => <figure key={p.id} className="mitem"><button className="mimg" onClick={() => setShow(i)}><img src={p.url} alt={p.caption || p.original_name} loading="lazy" /></button>{p.caption && <figcaption>{p.caption}</figcaption>}</figure>)}
        {videos.map((v) => <figure key={v.id} className="mitem"><video src={v.url} controls preload="metadata" />{v.caption && <figcaption>{v.caption}</figcaption>}</figure>)}</div>
      <p className="xs muted" style={{ marginTop: "1.5rem" }}>This album was shared by its owner. Please do not reuse the photos without their permission.</p>
      {show !== null && <Slideshow photos={photos} start={show} onClose={() => setShow(null)} />}
    </div>
  );
}

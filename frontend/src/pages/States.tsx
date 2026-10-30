import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import type { StateInfo } from "../types";

export default function States() {
  useSeo({ title: "Explore India by state and union territory" });
  const [states, setStates] = useState<StateInfo[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.states().then(setStates).catch((e: Error) => setErr(e.message)); }, []);
  const group = (t: "state" | "ut") => states?.filter((s) => s.type === t) ?? [];
  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Explore India</p><h1>Every state and union territory</h1><p className="muted">Pick a place to see its temples, forests, beaches, hills and heritage.</p></div>
      {err && <ErrorBox message={err} />}
      {!states && !err && <Skeleton height={300} />}
      {states && (<>
        <h2>28 states</h2><div className="grid">{group("state").map((s) => <Link key={s.slug} className="statecard" to={`/states/${s.slug}`}><span><strong>{s.name}</strong><br /><span className="small muted">{s.count} destinations</span></span><ArrowRight size={18} /></Link>)}</div>
        <h2 style={{ marginTop: "2rem" }}>8 union territories</h2><div className="grid">{group("ut").map((s) => <Link key={s.slug} className="statecard" to={`/states/${s.slug}`}><span><strong>{s.name}</strong><br /><span className="small muted">{s.count} destinations</span></span><ArrowRight size={18} /></Link>)}</div>
      </>)}
    </div>
  );
}

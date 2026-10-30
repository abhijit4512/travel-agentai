import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, Pager, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { MONTHS } from "../services/text";
import type { Destination } from "../types";

const SEASONS = [["Summer", [4, 5, 6]], ["Monsoon", [7, 8, 9]], ["Winter", [11, 12, 1]], ["Festival season", [10, 11]]] as const;

export default function Seasons() {
  useSeo({ title: "Seasonal explorer", description: "Find destinations that suit the month you plan to travel." });
  const [sp, setSp] = useSearchParams();
  const month = Number(sp.get("month") ?? new Date().getMonth() + 1);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Destination[]; pages: number; total: number } | null>(null);
  useEffect(() => { setData(null); api.places({ month, page, page_size: 12 }).then(setData).catch(() => setData({ items: [], pages: 1, total: 0 })); }, [month, page]);
  return (
    <div className="container page"><div className="page-head"><p className="eyebrow">When to go</p><h1>Seasonal explorer</h1><p className="muted">Based on general seasonal guidance. Always check current weather, road status and local advisories. Festival dates change each year, so check official sources.</p></div>
      <div className="months" role="group" aria-label="Choose a month">{MONTHS.map((m, i) => <button key={m} className={`chip ${month === i + 1 ? "on" : ""}`} onClick={() => { setSp({ month: String(i + 1) }); setPage(1); }}>{m}</button>)}</div>
      <p className="small muted">Quick picks: {SEASONS.map(([n, ms]) => <button key={n} className="chip" style={{ marginRight: 6 }} onClick={() => { setSp({ month: String(ms[1]) }); setPage(1); }}>{n}</button>)}</p>
      {!data ? <Skeleton height={300} /> : data.items.length === 0 ? <EmptyState title="Nothing listed for this month" /> : <><p className="small muted">{data.total} destinations suit {MONTHS[month - 1]}.</p><div className="grid">{data.items.map((d) => <PlaceCard key={d.id} d={d} />)}</div><Pager page={page} pages={data.pages} onPage={setPage} /></>}
    </div>
  );
}

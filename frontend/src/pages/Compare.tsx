import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DestinationImage from "../components/DestinationImage";
import { EmptyState } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { formatInr, MONTHS } from "../services/text";
import { placeLink, tagLabel } from "../services/tags";
import type { Destination } from "../types";

export default function Compare() {
  useSeo({ title: "Compare destinations" });
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3);
  const [items, setItems] = useState<Destination[]>([]);
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { if (!ids.length) { setItems([]); return; } api.places({ ids, page_size: 3 }).then((r) => setItems(ids.map((i) => r.items.find((x) => x.id === i)).filter(Boolean) as Destination[])).catch(() => setItems([])); }, [sp]);
  useEffect(() => { if (q.length < 2) { setSugs([]); return; } const t = setTimeout(() => api.suggest(q).then((r) => setSugs(r.suggestions)).catch(() => {}), 200); return () => clearTimeout(t); }, [q]);
  const setIds = (n: string[]) => setSp(n.length ? { ids: n.join(",") } : {}, { replace: true });
  const row = (label: string, f: (d: Destination) => React.ReactNode) => <tr><th scope="row">{label}</th>{items.map((d) => <td key={d.id}>{f(d)}</td>)}</tr>;
  return (
    <div className="container page"><div className="page-head"><p className="eyebrow">Decide</p><h1>Compare destinations</h1><p className="muted">Compare up to three places by season, theme, budget guide and category. Budgets are illustrative.</p></div>
      {ids.length < 3 && <div className="ac card" style={{ maxWidth: 420 }}><label>Add a destination<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a place name" /></label>
        {sugs.length > 0 && <ul role="listbox">{sugs.filter((s) => !ids.includes(s.id)).map((s) => <li key={s.id}><button type="button" onClick={() => { setIds([...ids, s.id]); setQ(""); setSugs([]); }}>{s.name}</button></li>)}</ul>}</div>}
      {items.length === 0 ? <div style={{ marginTop: "1rem" }}><EmptyState title="Pick two or three places to compare" /></div> : (
        <div className="cmp-wrap" style={{ marginTop: "1rem" }}><table className="cmp"><thead><tr><th />{items.map((d) => <th key={d.id} style={{ width: "auto" }}><div className="pcard" style={{ maxWidth: 260 }}><DestinationImage id={d.id} name={d.name} /></div><Link to={placeLink(d)}>{d.name}</Link><br /><button className="link xs" onClick={() => setIds(ids.filter((i) => i !== d.id))}>remove</button></th>)}</tr></thead>
          <tbody>
            {row("State", (d) => d.state)}
            {row("Best months", (d) => (d.best_months ?? []).map((m) => MONTHS[m - 1]).join(", "))}
            {row("Travel style", (d) => (d.tags ?? d.interests).map(tagLabel).join(", "))}
            {row("Budget guide", (d) => `${formatInr(d.budget_per_person_per_day_inr.low)} to ${formatInr(d.budget_per_person_per_day_inr.high)} per person per day`)}
            {row("Activities", (d) => (d.tags ?? d.interests).filter((t) => ["adventure", "trekking", "beach", "wildlife", "waterfall", "food", "culture"].includes(t)).map(tagLabel).join(", ") || "Sightseeing")}
            {row("Plan", (d) => <Link className="btn sm" to={`/plan?destination=${d.id}`}>Plan a trip</Link>)}
          </tbody></table></div>)}
    </div>
  );
}

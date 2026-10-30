import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatInr } from "../services/text";
import { placeLink } from "../services/tags";
import type { Day, Destination, Plan, Slot } from "../types";
import BudgetCard from "./BudgetCard";
import DestinationImage from "./DestinationImage";
import MapSection from "./MapSection";
import WeatherCard from "./WeatherCard";
import type { Weather } from "../types";

interface Props { plan: Plan; onChange?: (p: Plan) => void; readOnly?: boolean; weather?: Weather | null }

const FREE = (name: string): Slot => ({ slot: "evening", title: `Relaxed time in ${name}`, kind: "free", duration_hours: 2, fee_inr: 0, lat: null, lng: null, notes: "Free time. General suggestion.", transport_from_previous: "", attraction: false });

function dateFor(start: string | null | undefined, day: number): string {
  if (!start) return "";
  const d = new Date(start); d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Renders a full trip plan. When editable, activities can be moved, removed or added and the budget recalculates. */
export default function PlanView({ plan, onChange, readOnly = false, weather = null }: Props) {
  const r = plan.request;
  const [nearby, setNearby] = useState<Destination[]>([]);
  const [addDay, setAddDay] = useState(1);
  useEffect(() => { if (!readOnly) fetch(`/api/nearby/${plan.destination.id}?radius_km=150`).then((x) => x.json()).then((j) => setNearby(j.items ?? [])).catch(() => setNearby([])); }, [plan.destination.id, readOnly]);

  async function commit(days: Day[]) {
    const fees = days.flatMap((d) => d.slots).filter((s) => s.kind === "attraction").reduce((n, s) => n + s.fee_inr, 0);
    let budget = plan.budget;
    try {
      budget = await api.budget({ destination_id: plan.destination.id, days: r.days, adults: r.adults, children: r.children, origin_city: r.origin_city,
        style: r.style, transport_mode: r.transport_mode, budget_inr: r.budget_inr, sightseeing_fees_per_adult: fees });
    } catch { /* keep the old budget if the server is unreachable */ }
    onChange?.({ ...plan, itinerary: { ...plan.itinerary, days }, budget });
  }
  const days = plan.itinerary.days;
  const edit = (fn: (d: Day[]) => void) => { const copy = days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s })) })); fn(copy); void commit(copy); };
  const move = (di: number, si: number, dir: number) => edit((d) => {
    const s = d[di].slots, j = si + dir; if (j < 0 || j >= s.length) return;
    const a = s[si], b = s[j];                                  // swap content, keep the morning/afternoon/evening labels in place
    s[si] = { ...b, slot: a.slot }; s[j] = { ...a, slot: b.slot };
  });
  const remove = (di: number, si: number) => edit((d) => { d[di].slots[si] = { ...FREE(plan.destination.name), slot: d[di].slots[si].slot }; });
  const add = (p: Destination) => edit((d) => {
    const day = d[addDay - 1]; const entry: Slot = { slot: "extra", title: p.name, kind: "attraction", duration_hours: 2, fee_inr: 0, lat: p.lat, lng: p.lng,
      notes: "Added by you. Entry fee and timings are not verified here.", transport_from_previous: "", attraction: true };
    const freeIdx = day.slots.findIndex((s) => s.kind === "free");
    if (freeIdx >= 0) day.slots[freeIdx] = { ...entry, slot: day.slots[freeIdx].slot }; else day.slots.push(entry);
  });

  return (
    <>
      <section className="summary">
        <DestinationImage id={plan.destination.id} name={plan.destination.name} className="fill" eager />
        <div>
          <p className="eyebrow">Trip overview</p>
          <h1>{r.days} days in {plan.destination.name}</h1>
          <p>{plan.destination.description}</p>
          <p className="muted">From {r.origin_city} for {r.adults} adult{r.adults > 1 ? "s" : ""}{r.children ? ` and ${r.children} children` : ""}, {r.pace ?? "balanced"} pace. Best time: {plan.destination.best_season}.</p>
          <div className="statrow">
            <div className="stat"><b>{formatInr(plan.budget.total_inr)}</b><span className="small muted">Estimated total</span></div>
            <div className="stat"><b>{formatInr(plan.budget.per_person_inr)}</b><span className="small muted">Per person</span></div>
          </div>
          {(r.accessibility_needs || r.special_requirements) && <p className="small muted" style={{ marginTop: ".75rem" }}>Your notes: {[r.accessibility_needs, r.special_requirements].filter(Boolean).join(" · ")}. These are saved with the trip but do not filter results automatically. Please verify accessibility with each venue.</p>}
          <p className="small"><Link to={placeLink(plan.destination)}>Read the destination guide</Link></p>
        </div>
      </section>

      <div className="two-col">
        <div>
          <h2>Day by day</h2>
          {days.map((day, di) => (
            <article key={day.day} className="card day">
              <div className="day-head"><h3>{day.title}</h3><span className="small">{dateFor(r.start_date, day.day)}</span></div>
              {day.slots.map((s, si) => (
                <div key={si} className="slot">
                  <div className="slot-when">{s.slot}</div>
                  <div>
                    <strong>{s.title}</strong>
                    <p className="small muted" style={{ margin: 0 }}>About {s.duration_hours} h{s.fee_inr ? `, entry about ${formatInr(s.fee_inr)}` : ""}. {s.notes}</p>
                    {s.transport_from_previous && <p className="small" style={{ margin: 0 }}>{s.transport_from_previous}</p>}
                  </div>
                  {!readOnly && (
                    <div className="slot-tools no-print">
                      <button onClick={() => move(di, si, -1)} disabled={si === 0} aria-label={`Move ${s.title} earlier`}><ArrowUp size={16} /></button>
                      <button onClick={() => move(di, si, 1)} disabled={si === day.slots.length - 1} aria-label={`Move ${s.title} later`}><ArrowDown size={16} /></button>
                      {s.kind === "attraction" && <button onClick={() => remove(di, si)} aria-label={`Remove ${s.title}`}><Trash2 size={16} /></button>}
                    </div>)}
                </div>
              ))}
            </article>
          ))}
          <p className="small muted">Entry fees and times are sample figures. Confirm opening hours and prices on official sites. Distances are straight-line estimates.</p>

          {!readOnly && nearby.length > 0 && (
            <section className="card no-print" aria-label="Add attractions">
              <h3>Add a nearby attraction</h3>
              <label style={{ maxWidth: 200 }}>To day<select value={addDay} onChange={(e) => setAddDay(Number(e.target.value))}>{days.map((d) => <option key={d.day} value={d.day}>Day {d.day}</option>)}</select></label>
              <ul className="chips">{nearby.slice(0, 10).map((p) => <li key={p.id}><button className="chip" onClick={() => add(p)}><Plus size={14} /> {p.name} <span className="muted xs">{p.distance_km} km</span></button></li>)}</ul>
            </section>)}
        </div>
        <aside className="stack">
          <BudgetCard budget={plan.budget} />
          {plan.stay && <section className="card"><h3>Where to stay</h3><p>Typical room about <strong>{formatInr(plan.stay.typical_room_per_night_inr)}</strong> per night ({plan.stay.rooms} room{plan.stay.rooms > 1 ? "s" : ""}).</p><p className="small muted">{plan.stay.note}</p></section>}
          <WeatherCard weather={weather} />
          {plan.food.length > 0 && <section className="card"><h3>Local food</h3><ul>{plan.food.map((f) => <li key={f}>{f}</li>)}</ul></section>}
          <section className="card"><h3>Practical tips</h3><ul>{plan.tips.map((t) => <li key={t}>{t}</li>)}<li>Book trains and hotels yourself on official sites. This app cannot make bookings.</li></ul></section>
        </aside>
      </div>
      <div style={{ marginTop: "1.5rem" }}><MapSection days={days} destName={plan.destination.name} /></div>
      {plan.alternatives.length > 0 && !readOnly && (
        <section className="section no-print"><h2>Alternative destinations</h2>
          <ul className="chips">{plan.alternatives.map((a) => <li key={a.id}><Link className="chip" to={`/plan?destination=${a.id}&days=${r.days}&adults=${r.adults}`}>{a.name}, {a.state}</Link></li>)}</ul></section>)}
    </>
  );
}

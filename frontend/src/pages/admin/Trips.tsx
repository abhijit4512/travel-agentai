import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DataTable, RangeBar, Status, day, useRange, when } from "../../components/admin/AdminUi";
import MapSection from "../../components/MapSection";
import { ErrorBox, Pager, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Paged, Row, adminApi } from "../../services/adminApi";
import { formatInr } from "../../services/text";

const STATUSES = ["planning", "saved", "booking_in_progress", "confirmed", "ongoing", "completed", "cancelled"];
const LABELS: Record<string, string> = { transport_to_and_from: "Travel to and from (estimate)", accommodation: "Hotel stay (estimate)", food: "Food (estimate)", local_transport: "Local transport and fuel (estimate)", sightseeing_and_activities: "Attractions (estimate)", contingency_8_percent: "Contingency (estimate)" };

export function Trips() {
  useSeo({ title: "Trip monitoring" });
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const r = useRange("all");
  const [q, setQ] = useState(sp.get("q") ?? ""), [status, setStatus] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [sort, setSort] = useState("newest"), [page, setPage] = useState(1);
  const [data, setData] = useState<Paged | null>(null), [err, setErr] = useState("");
  useEffect(() => { setData(null); setErr(""); const t = setTimeout(() => adminApi.trips({ q, status, travel_from: from, travel_to: to, sort, page, ...r.value }).then(setData).catch((e: Error) => setErr(e.message)), 250); return () => clearTimeout(t); }, [q, status, from, to, sort, page, r.range, r.start, r.end]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Trip monitoring</h1><p className="muted small">What customers are planning. A trip appears here when a customer or guest saves it.</p></div>
        <button className="btn sm" onClick={() => void adminApi.downloadCsv("trips", r.value)}>Export CSV</button></div>
      <RangeBar r={r} />
      <div className="filter-row">
        <label>Search<input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Customer, email, destination" /></label>
        <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
        <label>Departing from<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label>Departing until<input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="travel_date">Departure date</option><option value="budget">Highest budget</option></select></label>
      </div>
      {err && <ErrorBox message={err} />}{!data && !err && <Skeleton height={240} />}
      {data && <><DataTable rows={data.items} onRow={(t) => nav(`/admin/trips/${t.id}`)} emptyText="No trips match."
        cols={[{ key: "cust_name", label: "Customer", render: (t) => <>{t.cust_name ?? "Guest"}<br /><span className="muted xs">{t.cust_email ?? "not logged in"}</span></> },
          { key: "route", label: "Route", render: (t) => `${t.origin_city ?? "-"} to ${t.destination_name ?? "-"}` },
          { key: "dates", label: "Dates", render: (t) => t.start_date ? `${day(t.start_date)} to ${day(t.end_date)}` : "Not set" }, { key: "travellers", label: "Travellers" },
          { key: "transport_mode", label: "Transport" }, { key: "est_total_inr", label: "Est. budget", render: (t) => formatInr(t.est_total_inr ?? 0) },
          { key: "derived_status", label: "Status", render: (t) => <Status value={t.derived_status} /> }, { key: "created_at", label: "Created", render: (t) => day(t.created_at) }]} />
        <p className="small muted">{data.total} trips</p><Pager page={data.page} pages={Math.max(1, Math.ceil(data.total / data.page_size))} onPage={setPage} /></>}
    </div>
  );
}

export function TripDetail() {
  const { id = "" } = useParams();
  const [d, setD] = useState<Row | null>(null), [err, setErr] = useState("");
  useEffect(() => { setD(null); adminApi.trip(id).then(setD).catch((e: Error) => setErr(e.message)); }, [id]);
  useSeo({ title: "Admin trip" });
  if (err) return <ErrorBox message={err} />;
  if (!d) return <Skeleton height={300} />;
  const t = d.trip, plan = d.plan, c = d.customer, days = plan.itinerary.days, items = Object.entries(plan.budget.items as Record<string, number>);
  return (
    <div className="stack">
      <p className="small"><Link to="/admin/trips">All trips</Link></p>
      <div className="admin-head"><div><h1>{plan.request.origin_city} to {plan.destination.name}</h1><p className="muted small">{t.title}</p></div><Status value={t.derived_status} /></div>
      <p className="notice warn small">This trip contains a customer's travel plans. Access is recorded in the audit log.</p>
      <div className="two-col">
        <section className="card"><h2>Customer</h2>
          <p><strong>{c.name}</strong><br />{c.email ?? "Not logged in (guest session)"}{c.phone ? <><br />{c.phone}</> : null}</p>
          {c.id && <Link className="btn sm" to={`/admin/users/${c.id}`}>Open customer profile</Link>}</section>
        <section className="card"><h2>Trip overview</h2>
          <dl className="kv"><dt>Departure</dt><dd>{day(t.start_date)}</dd><dt>Return</dt><dd>{day(t.end_date)}</dd><dt>Travellers</dt><dd>{t.travellers} ({plan.request.adults} adults, {plan.request.children} children)</dd>
            <dt>Transport</dt><dd>{plan.request.transport_mode}</dd><dt>Pace and style</dt><dd>{plan.request.pace ?? "balanced"}, {plan.request.style}</dd></dl></section>
      </div>
      <div className="two-col">
        <section className="card"><h2>Budget</h2>
          <table className="dtable"><tbody>{items.map(([k, v]) => <tr key={k}><td>{LABELS[k] ?? k}</td><td className="num">{formatInr(v)}</td></tr>)}</tbody>
            <tfoot><tr><th>Estimated total</th><th className="num">{formatInr(plan.budget.total_inr)}</th></tr><tr><th>Confirmed platform bookings</th><th className="num">{formatInr(d.confirmed_booking_cost_inr)}</th></tr></tfoot></table>
          <p className="small muted">Estimates are illustrative rules, not prices. Confirmed costs come only from platform bookings.</p>
          {plan.stay && <p className="small">Selected accommodation: none chosen. Typical room about {formatInr(plan.stay.typical_room_per_night_inr)} per night.</p>}</section>
        <section className="card"><h2>Timeline</h2>
          <ol className="timeline"><li><b>{when(t.created_at)}</b> Trip saved</li>{t.updated_at !== t.created_at && <li><b>{when(t.updated_at)}</b> Last updated</li>}
            {t.start_date && <li><b>{day(t.start_date)}</b> Departure</li>}{t.end_date && <li><b>{day(t.end_date)}</b> Return</li>}<li><b>Now</b> <Status value={t.derived_status} /></li></ol></section>
      </div>
      <section className="card"><h2>Day-wise itinerary</h2>
        {days.map((dy: Row) => (<div key={dy.day} className="day-block"><h3>{dy.title}</h3>
          <ul>{dy.slots.map((s: Row, i: number) => <li key={i}><span className="muted">{s.slot}:</span> {s.title} <span className="muted xs">({s.duration_hours} h{s.fee_inr ? `, entry about ${formatInr(s.fee_inr)}` : ""})</span></li>)}</ul></div>))}</section>
      <MapSection days={days} destName={plan.destination.name} />
      <section className="card"><h2>Linked bookings</h2>
        <DataTable rows={d.bookings} emptyText="No bookings linked to this trip." cols={[{ key: "reference", label: "Reference" }, { key: "category", label: "Type" }, { key: "title", label: "Booking" }, { key: "source", label: "Source", render: (b) => <Status value={b.source} /> }, { key: "amount_inr", label: "Amount", render: (b) => formatInr(b.amount_inr) }, { key: "status", label: "Status", render: (b) => <Status value={b.status} /> }]} /></section>
      <ul className="small muted">{d.notes.map((n: string) => <li key={n}>{n}</li>)}</ul>
    </div>
  );
}

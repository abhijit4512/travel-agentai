import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { DataTable, Status, day } from "../components/admin/AdminUi";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { useAuth } from "../services/auth";
import { Row, travelApi } from "../services/travelApi";
import { formatInr } from "../services/text";
import type { Destination, TripRecord } from "../types";

const TABS = [["overview", "Overview"], ["trips", "My trips"], ["bookings", "My bookings"], ["roadtrips", "Car rentals and road trips"], ["searches", "Saved searches"], ["memories", "Travel memories"], ["places", "Saved destinations"], ["payments", "Payments"], ["notifications", "Notifications"], ["settings", "Settings"]] as const;
const CAT_LABEL: Record<string, string> = { hotel: "Hotels", car: "Car rentals", bus: "Buses", train: "Trains", flight: "Flights" };

export default function MyTravel() {
  useSeo({ title: "My travel" });
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const [ov, setOv] = useState<Row | null>(null), [err, setErr] = useState("");
  const [trips, setTrips] = useState<TripRecord[] | null>(null), [bk, setBk] = useState<Row[] | null>(null), [cat, setCat] = useState("");
  const [rt, setRt] = useState<Row[] | null>(null), [ss, setSs] = useState<Row[] | null>(null), [al, setAl] = useState<Row[] | null>(null), [fav, setFav] = useState<Destination[] | null>(null);

  useEffect(() => { travelApi.overview().then(setOv).catch((e: Error) => setErr(e.message)); }, []);
  useEffect(() => {
    if (tab === "trips") api.trips().then(setTrips).catch((e: Error) => setErr(e.message));
    if (tab === "bookings") { setBk(null); travelApi.myBookings(cat).then((r) => setBk(r.items)).catch((e: Error) => setErr(e.message)); }
    if (tab === "roadtrips") travelApi.roadTrips().then((r) => setRt(r.items)).catch((e: Error) => setErr(e.message));
    if (tab === "searches") travelApi.searches().then((r) => setSs(r.items)).catch((e: Error) => setErr(e.message));
    if (tab === "memories") travelApi.albums().then((r) => setAl(r.items)).catch((e: Error) => setErr(e.message));
    if (tab === "places") api.wishlist().then((r) => setFav(r.items)).catch((e: Error) => setErr(e.message));
  }, [tab, cat]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips?.filter((t) => (t.plan.request.start_date ?? "") >= today && t.plan.request.start_date) ?? [];
  const previous = trips?.filter((t) => t.plan.request.start_date && t.plan.request.start_date < today) ?? [];
  const link = (k: string) => (k === "flight" ? "flights" : k);

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Your account</p><h1>My travel</h1><p className="muted">Hi {user?.name.split(" ")[0]}. Everything you saved, in one place.</p></div>
      <div className="tabs" role="tablist" style={{ flexWrap: "wrap" }}>{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {err && <ErrorBox message={err} />}
      <div style={{ marginTop: "1.25rem" }}>
        {tab === "overview" && (!ov ? <Skeleton height={160} /> : <div className="stack">
          <div className="statrow"><div className="stat"><b>{ov.trips}</b>Trips</div><div className="stat"><b>{Object.values(ov.bookings_by_category as Record<string, number>).reduce((a, b) => a + b, 0)}</b>Bookings recorded</div><div className="stat"><b>{ov.road_trips}</b>Road trips</div>
            <div className="stat"><b>{ov.albums}</b>Memory albums</div><div className="stat"><b>{ov.memory_files}</b>Memory files</div><div className="stat"><b>{ov.wishlist}</b>Saved places</div><div className="stat"><b>{formatInr(ov.estimated_spend_inr)}</b>Estimated trip spending</div></div>
          <p className="small muted">Estimated spending adds up the budget estimates of your saved trips. It is not what you actually paid.</p></div>)}

        {tab === "trips" && (!trips ? <Skeleton height={160} /> : trips.length === 0 ? <EmptyState title="No trips yet"><Link className="btn primary" to="/plan">Plan a trip</Link></EmptyState> : <div className="stack">
          <h2>Upcoming ({upcoming.length})</h2>{upcoming.length === 0 && <p className="muted small">Add a start date to a saved trip to see it here.</p>}
          <ul className="saved">{upcoming.map((t) => <li key={t.id} className="card"><div><b>{t.title}</b><br /><span className="muted small">Starts {day(t.plan.request.start_date)} · {formatInr(t.plan.budget.total_inr)} estimate</span></div><Link className="btn sm solid" to={`/plan?trip=${t.id}`}>Open</Link></li>)}</ul>
          <h2>Previous ({previous.length})</h2><ul className="saved">{previous.map((t) => <li key={t.id} className="card"><div><b>{t.title}</b><br /><span className="muted small">{day(t.plan.request.start_date)}</span></div><Link className="btn sm" to={`/plan?trip=${t.id}`}>Open</Link></li>)}</ul>
          <h2>All trips</h2><ul className="saved">{trips.map((t) => <li key={t.id} className="card"><b>{t.title}</b><Link className="btn sm" to={`/plan?trip=${t.id}`}>Open</Link></li>)}</ul></div>)}

        {tab === "bookings" && <div className="stack">
          <p className="notice warn small">This app cannot make or confirm bookings. These are records you saved of bookings made on other websites, marked "external, not verified".</p>
          <div className="chips"><button className={`chip ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>All</button>{Object.entries(CAT_LABEL).map(([k, l]) => <button key={k} className={`chip ${cat === k ? "on" : ""}`} onClick={() => setCat(k)}>{l}</button>)}</div>
          {!bk ? <Skeleton height={120} /> : <DataTable rows={bk} emptyText={<>No records yet. After booking elsewhere, use "I booked this elsewhere" on the <Link to="/hotels">hotels</Link>, <Link to="/train">train</Link>, <Link to="/bus">bus</Link> or <Link to="/flights">flight</Link> pages.</>}
            cols={[{ key: "reference", label: "Reference" }, { key: "category", label: "Type", render: (b) => <Link to={`/${link(b.category)}`}>{CAT_LABEL[b.category]}</Link> }, { key: "title", label: "What" }, { key: "provider", label: "Booked on" }, { key: "travel_date", label: "Travel date", render: (b) => day(b.travel_date) },
              { key: "amount_inr", label: "You paid", render: (b) => (b.amount_inr ? formatInr(b.amount_inr) : "-") }, { key: "source", label: "Source", render: (b) => <Status value={b.source} /> },
              { key: "x", label: "", render: (b) => <button className="link xs" onClick={(e) => { e.stopPropagation(); void travelApi.deleteBooking(b.id).then(() => setBk((x) => x?.filter((r) => r.id !== b.id) ?? null)); }}>Remove</button> }]} />}</div>}

        {tab === "roadtrips" && (!rt ? <Skeleton height={120} /> : rt.length === 0 ? <EmptyState title="No saved road trips"><Link className="btn primary" to="/cars">Open the car calculator</Link></EmptyState> :
          <ul className="saved">{rt.map((r) => <li key={r.id} className="card"><div><b>{r.title}</b><br /><span className="muted small">Saved {day(r.created_at)}{r.summary?.cars ? ` · ${r.summary.cars.length} cars compared` : ""}</span></div><button className="btn sm ghost" onClick={() => void travelApi.deleteRoadTrip(r.id).then(() => setRt((x) => x?.filter((y) => y.id !== r.id) ?? null))}>Delete</button></li>)}</ul>)}

        {tab === "searches" && (!ss ? <Skeleton height={120} /> : ss.length === 0 ? <EmptyState title="No saved searches" /> :
          <ul className="saved">{ss.map((s) => <li key={s.id} className="card"><div><b>{s.title}</b><br /><span className="muted small">{s.kind}</span></div><div className="row"><Link className="btn sm solid" to={s.kind === "hotel" ? `/hotels?place=${s.params.place}&name=${encodeURIComponent(s.params.name ?? "")}` : `/${link(s.kind)}?src=${encodeURIComponent(s.params.src ?? "")}&dst=${encodeURIComponent(s.params.dst ?? "")}`}>Search again</Link><button className="btn sm ghost" onClick={() => void travelApi.deleteSearch(s.id).then(() => setSs((x) => x?.filter((y) => y.id !== s.id) ?? null))}>Delete</button></div></li>)}</ul>)}

        {tab === "memories" && (!al ? <Skeleton height={120} /> : <div className="stack"><p><Link className="btn primary" to="/memories">Open my travel memories</Link></p>{al.length === 0 ? <p className="muted">No albums yet.</p> : <ul className="saved">{al.slice(0, 8).map((a) => <li key={a.id} className="card"><div><b>{a.title}</b><br /><span className="muted small">{a.location_name} · {a.media_count} files · {a.visibility}</span></div><Link className="btn sm" to={`/memories/${a.id}`}>Open</Link></li>)}</ul>}</div>)}

        {tab === "places" && (!fav ? <Skeleton height={200} /> : fav.length === 0 ? <EmptyState title="No saved destinations yet"><Link className="btn primary" to="/explore">Explore India</Link></EmptyState> : <div className="grid">{fav.map((d) => <PlaceCard key={d.id} d={d} />)}</div>)}

        {tab === "payments" && <EmptyState title="No payments"><p>This app does not process payments. Anything you pay for happens on the booking site you use, so nothing is listed here.</p></EmptyState>}
        {tab === "notifications" && <EmptyState title="No notifications"><p>Booking and payment notifications will appear here if a booking integration is added later.</p></EmptyState>}
        {tab === "settings" && <div className="card stack"><p>Name: <b>{user?.name}</b><br />Email: <b>{user?.email}</b></p><p className="small muted">Travel preferences such as home city and interests are on your <Link to="/dashboard">dashboard</Link>.</p></div>}
      </div>
    </div>
  );
}

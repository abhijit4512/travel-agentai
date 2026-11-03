import { useEffect, useState } from "react";
import { BarChart, HBars, LineChart } from "../../components/admin/Charts";
import { RangeBar, StatCard, useRange } from "../../components/admin/AdminUi";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, adminApi } from "../../services/adminApi";
import { formatInr } from "../../services/text";

export default function Analytics() {
  useSeo({ title: "Admin analytics" });
  const r = useRange("30d");
  const [a, setA] = useState<Row | null>(null), [err, setErr] = useState("");
  useEffect(() => { setA(null); setErr(""); adminApi.analytics(r.value).then(setA).catch((e: Error) => setErr(e.message)); }, [r.range, r.start, r.end]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Analytics</h1><p className="muted small">Revenue counts only paid platform-confirmed bookings, never estimates or referrals.</p></div>
        <div className="row no-print"><button className="btn sm" onClick={() => void adminApi.downloadCsv("trips", r.value)}>Trips CSV</button><button className="btn sm" onClick={() => void adminApi.downloadCsv("bookings", r.value)}>Bookings CSV</button><button className="btn sm" onClick={() => window.print()}>Print or save as PDF</button></div></div>
      <RangeBar r={r} />
      {err && <ErrorBox message={err} />}{!a && !err && <Skeleton height={300} />}
      {a && (<>
        <div className="stat-grid">
          <StatCard label="Upcoming trips" value={a.upcoming_trips} /><StatCard label="Average estimated budget" value={a.average_estimated_budget_inr == null ? "n/a" : formatInr(a.average_estimated_budget_inr)} hint="Estimates, not spending" />
          <StatCard label="Cancellation rate" value={a.cancellation_rate_percent == null ? "n/a" : `${a.cancellation_rate_percent}%`} hint={`${a.platform_bookings} platform bookings`} />
        </div>
        <div className="chart-grid">
          <section className="card"><h2>Most planned destinations</h2><HBars data={a.popular_destinations} /></section>
          <section className="card"><h2>Most saved to wishlists</h2><HBars data={a.most_saved_places} /></section>
          <section className="card"><h2>Most searched destinations</h2><p className="muted small">{a.most_searched.note}</p></section>
          <section className="card"><h2>Most booked hotels</h2><HBars data={a.hotels_booked} /></section>
          <section className="card"><h2>Transport in trip plans</h2><HBars data={a.transport_popularity} /></section>
          <section className="card"><h2>User registrations ({a.granularity})</h2><LineChart data={a.registrations_over_time} /></section>
          <section className="card"><h2>Trips created ({a.granularity})</h2><BarChart data={a.trips_over_time} /></section>
          <section className="card"><h2>Bookings ({a.granularity})</h2><BarChart data={a.bookings_over_time} /></section>
          <section className="card"><h2>Confirmed revenue ({a.granularity})</h2><BarChart data={a.revenue_over_time} format={formatInr} /></section>
        </div></>)}
    </div>
  );
}

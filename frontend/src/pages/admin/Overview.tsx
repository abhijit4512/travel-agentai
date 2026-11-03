import { useEffect, useState } from "react";
import { BarChart, HBars, LineChart } from "../../components/admin/Charts";
import { RangeBar, StatCard, useRange } from "../../components/admin/AdminUi";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, adminApi } from "../../services/adminApi";
import { formatInr } from "../../services/text";

export default function Overview() {
  useSeo({ title: "Admin overview" });
  const r = useRange("30d");
  const [s, setS] = useState<Row | null>(null), [a, setA] = useState<Row | null>(null), [err, setErr] = useState("");
  useEffect(() => {
    setS(null); setA(null); setErr("");
    Promise.all([adminApi.stats(r.value), adminApi.analytics(r.value)]).then(([x, y]) => { setS(x); setA(y); }).catch((e: Error) => setErr(e.message));
  }, [r.range, r.start, r.end]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Overview</h1><p className="muted small">What is happening on the platform.</p></div><RangeBar r={r} /></div>
      {err && <ErrorBox message={err} />}
      {!s && !err && <Skeleton height={300} />}
      {s && a && (<>
        <div className="stat-grid">
          <StatCard label="Registered users" value={s.users} hint={`${s.active_users} active`} />
          <StatCard label="Planned trips" value={s.trips_planned} />
          <StatCard label="Upcoming trips" value={s.trips_upcoming} />
          <StatCard label="Completed trips" value={s.trips_completed} />
          <StatCard label="Platform bookings" value={s.bookings_total} />
          <StatCard label="Hotel bookings" value={s.bookings_by_category.hotel} />
          <StatCard label="Car rentals" value={s.bookings_by_category.car} />
          <StatCard label="Bus bookings" value={s.bookings_by_category.bus} />
          <StatCard label="Train bookings" value={s.bookings_by_category.train} />
          <StatCard label="Flight bookings" value={s.bookings_by_category.flight} />
          <StatCard label="Cancelled bookings" value={s.bookings_cancelled} />
          <StatCard label="Confirmed revenue" value={formatInr(s.revenue_inr)} hint="Paid platform bookings only" tone="accent" />
          <StatCard label="External referrals" value={s.external_referrals} hint="Not counted as bookings or revenue" tone="muted" />
          <StatCard label="Travel memories" value="n/a" hint={s.memories.note} tone="muted" />
        </div>
        {s.bookings_total === 0 && <p className="notice warn small">{s.notes[0]}</p>}
        <div className="chart-grid">
          <section className="card"><h2>Trips saved over time</h2><BarChart data={a.trips_over_time} /></section>
          <section className="card"><h2>New registrations</h2><LineChart data={a.registrations_over_time} /></section>
          <section className="card"><h2>Most planned destinations</h2><HBars data={a.popular_destinations} /></section>
          <section className="card"><h2>Transport choices in trip plans</h2><HBars data={a.transport_popularity} /></section>
          <section className="card"><h2>Bookings over time</h2><BarChart data={a.bookings_over_time} /></section>
          <section className="card"><h2>Revenue over time</h2><BarChart data={a.revenue_over_time} format={formatInr} /></section>
        </div>
      </>)}
    </div>
  );
}

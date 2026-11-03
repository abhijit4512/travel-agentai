import { Bell, CreditCard, LifeBuoy, MapPin, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, RangeBar, StatCard, when, useRange } from "../../components/admin/AdminUi";
import { ErrorBox, Pager, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Paged, Row, adminApi } from "../../services/adminApi";
import { useAdmin } from "../../services/adminAuth";
import { formatInr } from "../../services/text";

const ICON: Record<string, JSX.Element> = { new_user: <UserPlus size={16} />, trip_created: <MapPin size={16} />, support_request: <LifeBuoy size={16} />, payment: <CreditCard size={16} /> };

export function Notifications() {
  useSeo({ title: "Admin notifications" });
  const [d, setD] = useState<{ items: Row[]; unread: number } | null>(null), [err, setErr] = useState("");
  const load = () => adminApi.notifications().then(setD).catch((e: Error) => setErr(e.message));
  useEffect(() => { void load(); const t = window.setInterval(load, 30000); return () => window.clearInterval(t); }, []);
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Notifications</h1><p className="muted small">New users, saved trips and support requests. Refreshes every 30 seconds. Booking and payment alerts appear once a booking integration exists.</p></div>
        <button className="btn sm" onClick={() => void adminApi.markRead().then(load)} disabled={!d?.unread}>Mark all read ({d?.unread ?? 0})</button></div>
      {err && <ErrorBox message={err} />}{!d && !err && <Skeleton height={200} />}
      {d && d.items.length === 0 && <div className="empty">No notifications yet.</div>}
      {d && <ul className="notif">{d.items.map((n) => (
        <li key={n.id} className={n.read_at ? "" : "unread"}><span className="n-icon">{ICON[n.type] ?? <Bell size={16} />}</span>
          <div><b>{n.title}</b><p className="small" style={{ margin: 0 }}>{n.body}</p><span className="muted xs">{when(n.created_at)}</span></div>
          {n.ref_type === "trip" && <Link className="btn sm ghost" to={`/admin/trips/${n.ref_id}`}>Open</Link>}{n.ref_type === "user" && <Link className="btn sm ghost" to={`/admin/users/${n.ref_id}`}>Open</Link>}</li>))}</ul>}
    </div>
  );
}

export function Reports() {
  useSeo({ title: "Admin reports" });
  const r = useRange("30d");
  const [s, setS] = useState<Row | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { setS(null); adminApi.stats(r.value).then(setS).catch((e: Error) => setMsg(e.message)); }, [r.range, r.start, r.end]);   // eslint-disable-line react-hooks/exhaustive-deps
  const dl = (k: string) => adminApi.downloadCsv(k, r.value).then(() => setMsg(`${k} report downloaded. The export is recorded in the audit log.`)).catch((e: Error) => setMsg(e.message));
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Reports</h1><p className="muted small">Download data as CSV, or print this page to save a PDF summary.</p></div><button className="btn sm no-print" onClick={() => window.print()}>Print or save as PDF</button></div>
      <RangeBar r={r} />
      <section className="card no-print"><h2>CSV exports</h2><div className="row">
        <button className="btn" onClick={() => void dl("users")}>Users</button><button className="btn" onClick={() => void dl("trips")}>Trips</button><button className="btn" onClick={() => void dl("bookings")}>Bookings</button></div>
        <p className="small muted">Exports never include passwords. Cells that start with = + - or @ are escaped so spreadsheets cannot run them as formulas.</p>{msg && <p role="status" className="small">{msg}</p>}</section>
      <section className="card"><h2>Summary for the selected period</h2>
        {!s ? <Skeleton height={100} /> : <div className="stat-grid"><StatCard label="Users" value={s.users} /><StatCard label="Trips planned" value={s.trips_planned} /><StatCard label="Platform bookings" value={s.bookings_total} /><StatCard label="Cancelled bookings" value={s.bookings_cancelled} /><StatCard label="Confirmed revenue" value={formatInr(s.revenue_inr)} tone="accent" /><StatCard label="External referrals" value={s.external_referrals} tone="muted" /></div>}
        <p className="small muted">Generated {when(new Date().toISOString())}. Revenue includes only paid platform-confirmed bookings.</p></section>
    </div>
  );
}

export function Audit() {
  useSeo({ title: "Admin audit log" });
  const [page, setPage] = useState(1), [d, setD] = useState<Paged | null>(null), [err, setErr] = useState("");
  useEffect(() => { adminApi.audit(page).then(setD).catch((e: Error) => setErr(e.message)); }, [page]);
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Audit log</h1><p className="muted small">Who viewed or changed sensitive records, and when. Entries cannot be edited here.</p></div></div>
      {err && <ErrorBox message={err} />}{!d && !err && <Skeleton height={200} />}
      {d && <><DataTable rows={d.items} emptyText="No audit entries yet." cols={[{ key: "created_at", label: "When", render: (a) => when(a.created_at) }, { key: "admin_email", label: "Admin", render: (a) => a.admin_email ?? "unknown" }, { key: "action", label: "Action" }, { key: "target", label: "Target", render: (a) => a.target_type ? `${a.target_type} ${a.target_id ?? ""}` : "-" }, { key: "detail", label: "Detail" }, { key: "ip", label: "IP" }]} />
        <Pager page={d.page} pages={Math.max(1, Math.ceil(d.total / d.page_size))} onPage={setPage} /></>}
    </div>
  );
}

export function AdminSettings() {
  useSeo({ title: "Admin settings" });
  const { admin } = useAdmin();
  return (
    <div className="stack"><div className="admin-head"><h1>Settings</h1></div>
      <section className="card"><h2>Your admin account</h2><dl className="kv"><dt>Name</dt><dd>{admin?.name}</dd><dt>Email</dt><dd>{admin?.email}</dd><dt>Last sign-in</dt><dd>{when(admin?.last_login_at)}</dd></dl></section>
      <section className="card"><h2>Security</h2><ul>
        <li>Admin sessions last 2 hours and use a separate token from customer logins.</li>
        <li>Every admin API checks your admin role on the server. Hiding a menu is never the only protection.</li>
        <li>Viewing a customer, trip or booking, changing an account status and exporting data are recorded in the <Link to="/admin/audit">audit log</Link>.</li>
        <li>Admin accounts are created only from the command line: <code>python -m app.tools.make_admin email</code>. Two-factor sign-in is not implemented yet.</li>
        <li>Customers are told that admins can see trip plans in the <Link to="/privacy">privacy policy</Link>.</li></ul></section>
    </div>
  );
}

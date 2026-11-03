import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DataTable, Status, day, when } from "../../components/admin/AdminUi";
import { ErrorBox, Pager, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Paged, Row, adminApi } from "../../services/adminApi";
import { formatInr } from "../../services/text";

export function Users() {
  useSeo({ title: "Admin users" });
  const nav = useNavigate();
  const [q, setQ] = useState(""), [status, setStatus] = useState(""), [sort, setSort] = useState("newest"), [page, setPage] = useState(1);
  const [data, setData] = useState<Paged | null>(null), [err, setErr] = useState("");
  useEffect(() => { setData(null); setErr(""); const t = setTimeout(() => adminApi.users({ q, status, sort, page }).then(setData).catch((e: Error) => setErr(e.message)), 250); return () => clearTimeout(t); }, [q, status, sort, page]);
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Users</h1><p className="muted small">Customers who registered. Search by name, email or phone. Phone numbers appear only if the app collected one.</p></div></div>
      <div className="filter-row">
        <label>Search<input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or phone" /></label>
        <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="inactive">Deactivated</option></select></label>
        <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option></select></label>
      </div>
      {err && <ErrorBox message={err} />}
      {!data && !err && <Skeleton height={240} />}
      {data && <><DataTable rows={data.items} onRow={(r) => nav(`/admin/users/${r.id}`)} emptyText="No users match."
        cols={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "created_at", label: "Registered", render: (r) => day(r.created_at) },
          { key: "trips", label: "Trips" }, { key: "bookings", label: "Bookings" }, { key: "is_active", label: "Status", render: (r) => <Status value={r.is_active ? "active" : "deactivated"} /> }]} />
        <p className="small muted">{data.total} users</p><Pager page={data.page} pages={Math.max(1, Math.ceil(data.total / data.page_size))} onPage={setPage} /></>}
    </div>
  );
}

export function UserDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState<Row | null>(null), [err, setErr] = useState(""), [reason, setReason] = useState(""), [msg, setMsg] = useState(""), [confirm, setConfirm] = useState(false);
  const load = () => adminApi.user(id).then(setD).catch((e: Error) => setErr(e.message));
  useEffect(() => { setD(null); void load(); }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: d ? `Admin: ${d.user.name}` : "Admin user" });

  async function toggle(e: FormEvent) {
    e.preventDefault(); setMsg("");
    try { await adminApi.setActive(d!.user.id, !d!.user.is_active, reason); setReason(""); setConfirm(false); setMsg("Account status updated and recorded in the audit log."); await load(); }
    catch (x) { setMsg((x as Error).message); }
  }
  if (err) return <ErrorBox message={err} />;
  if (!d) return <Skeleton height={300} />;
  const u = d.user, active = !!u.is_active;
  return (
    <div className="stack">
      <p className="small"><Link to="/admin/users">All users</Link></p>
      <div className="admin-head"><div><h1>{u.name}</h1><p className="muted small">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p></div><Status value={active ? "active" : "deactivated"} /></div>
      <p className="notice warn small">You are viewing a customer's personal data. This access is recorded in the audit log.</p>
      <div className="stat-grid">
        <div className="stat-card"><span className="sc-label">Registered</span><b className="sc-value" style={{ fontSize: "1.1rem" }}>{when(u.created_at)}</b></div>
        <div className="stat-card"><span className="sc-label">Planned trips</span><b className="sc-value">{d.counts.planned_trips}</b></div>
        <div className="stat-card"><span className="sc-label">Completed trips</span><b className="sc-value">{d.counts.completed_trips}</b></div>
        <div className="stat-card"><span className="sc-label">Cancelled bookings</span><b className="sc-value">{d.counts.cancelled_bookings}</b></div>
      </div>
      <section className="card"><h2>Trips</h2>
        <DataTable rows={d.trips} onRow={(r) => nav(`/admin/trips/${r.id}`)} emptyText="No trips yet."
          cols={[{ key: "destination_name", label: "Destination" }, { key: "origin_city", label: "From" }, { key: "start_date", label: "Departure", render: (r) => day(r.start_date) }, { key: "est_total_inr", label: "Estimate", render: (r) => formatInr(r.est_total_inr ?? 0) }, { key: "derived_status", label: "Status", render: (r) => <Status value={r.derived_status} /> }]} /></section>
      <section className="card"><h2>Booking history</h2>
        <DataTable rows={d.bookings} emptyText="No bookings. The app does not process bookings yet."
          cols={[{ key: "reference", label: "Reference" }, { key: "category", label: "Type" }, { key: "title", label: "Booking" }, { key: "source", label: "Source", render: (r) => <Status value={r.source} /> }, { key: "amount_inr", label: "Amount", render: (r) => formatInr(r.amount_inr) }, { key: "status", label: "Status", render: (r) => <Status value={r.status} /> }]} /></section>
      <section className="card"><h2>Account status</h2>
        <form className="stack" onSubmit={toggle}>
          <label>Reason (required, saved in the audit log)<input value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={300} required placeholder={active ? "Why is this account being deactivated?" : "Why is this account being reactivated?"} /></label>
          <label className="check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I confirm I want to {active ? "deactivate" : "reactivate"} this account{active ? ". The customer will be signed out and cannot log in." : "."}</label>
          <div className="row"><button className={`btn ${active ? "live" : "solid"}`} disabled={!confirm || reason.trim().length < 5}>{active ? "Deactivate account" : "Reactivate account"}</button>{msg && <span role="status" className="small">{msg}</span>}</div>
        </form></section>
      <button className="link small" onClick={() => nav(-1)}>Back</button>
    </div>
  );
}

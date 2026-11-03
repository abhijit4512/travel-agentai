import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable, RangeBar, Status, day, useRange, when } from "../../components/admin/AdminUi";
import { ErrorBox, Pager, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Paged, Row, adminApi } from "../../services/adminApi";
import { formatInr } from "../../services/text";

const CATS: [string, string][] = [["", "All"], ["hotel", "Hotels"], ["car", "Car rentals"], ["bus", "Buses"], ["train", "Trains"], ["flight", "Flights"]];

export default function Bookings() {
  useSeo({ title: "Admin bookings" });
  const [sp] = useSearchParams();
  const r = useRange("all");
  const [cat, setCat] = useState(""), [source, setSource] = useState("platform"), [status, setStatus] = useState(""), [pay, setPay] = useState(""), [q, setQ] = useState(sp.get("q") ?? ""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [page, setPage] = useState(1);
  const [data, setData] = useState<Paged | null>(null), [err, setErr] = useState(""), [open, setOpen] = useState<Row | null>(null);
  useEffect(() => { setData(null); setErr(""); const t = setTimeout(() => adminApi.bookings({ category: cat, source, status, payment_status: pay, q, travel_from: from, travel_to: to, page, ...r.value }).then(setData).catch((e: Error) => setErr(e.message)), 250); return () => clearTimeout(t); }, [cat, source, status, pay, q, from, to, page, r.range, r.start, r.end]);   // eslint-disable-line react-hooks/exhaustive-deps
  const reset = (f: () => void) => { f(); setPage(1); };
  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Bookings</h1><p className="muted small">Hotels, cars, buses, trains and flights.</p></div><button className="btn sm" onClick={() => void adminApi.downloadCsv("bookings", r.value)}>Export CSV</button></div>
      <div className="tabs" role="tablist" aria-label="Booking source">
        <button role="tab" aria-selected={source === "platform"} className={source === "platform" ? "on" : ""} onClick={() => reset(() => setSource("platform"))}>Provider-confirmed (platform)</button>
        <button role="tab" aria-selected={source === "external_referral"} className={source === "external_referral" ? "on" : ""} onClick={() => reset(() => setSource("external_referral"))}>External referrals</button>
      </div>
      {source === "external_referral" && <p className="notice warn small">External referrals were sent to another website. They are not confirmed bookings, are not counted in revenue, and completion is not verified here.</p>}
      <div className="chips" role="group" aria-label="Category">{CATS.map(([k, l]) => <button key={k} className={`chip ${cat === k ? "on" : ""}`} onClick={() => reset(() => setCat(k))}>{l}</button>)}</div>
      <RangeBar r={r} />
      <div className="filter-row">
        <label>Search<input type="search" value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Reference, customer, hotel, operator" /></label>
        <label>Status<select value={status} onChange={(e) => reset(() => setStatus(e.target.value))}><option value="">All</option>{["pending", "confirmed", "cancelled", "completed", "failed"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Payment<select value={pay} onChange={(e) => reset(() => setPay(e.target.value))}><option value="">All</option>{["unpaid", "paid", "refunded", "failed"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Travel from<input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} /></label>
        <label>Travel until<input type="date" value={to} min={from} onChange={(e) => reset(() => setTo(e.target.value))} /></label>
      </div>
      {err && <ErrorBox message={err} />}{!data && !err && <Skeleton height={240} />}
      {data && <><DataTable rows={data.items} onRow={(b) => void adminApi.booking(b.id).then(setOpen).catch((e: Error) => setErr(e.message))}
        emptyText={<>No bookings here yet. This app does not process bookings yet, so this list stays empty until a booking integration writes to the bookings tables.</>}
        cols={[{ key: "reference", label: "Reference" }, { key: "customer_name", label: "Customer", render: (b) => <>{b.customer_name ?? "-"}<br /><span className="muted xs">{b.customer_email}</span></> }, { key: "category", label: "Type" }, { key: "title", label: "Booking" },
          { key: "route", label: "Route", render: (b) => b.from_location ? `${b.from_location} to ${b.to_location}` : "-" }, { key: "travel_date", label: "Travel date", render: (b) => day(b.travel_date) },
          { key: "amount_inr", label: "Amount", render: (b) => formatInr(b.amount_inr) }, { key: "status", label: "Status", render: (b) => <Status value={b.status} /> }, { key: "payment_status", label: "Payment", render: (b) => <Status value={b.payment_status} /> }]} />
        <p className="small muted">{data.total} bookings</p><Pager page={data.page} pages={Math.max(1, Math.ceil(data.total / data.page_size))} onPage={setPage} /></>}
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Booking details" onClick={() => setOpen(null)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-head"><h2>{open.booking.reference}</h2><button className="btn sm ghost" onClick={() => setOpen(null)}>Close</button></div>
            {open.warning && <p className="notice warn small">{open.warning}</p>}
            <dl className="kv"><dt>Customer</dt><dd>{open.booking.customer_name ?? "-"} ({open.booking.customer_email ?? "-"})</dd><dt>Type</dt><dd>{open.booking.category}</dd><dt>Source</dt><dd><Status value={open.booking.source} /></dd>
              <dt>Status</dt><dd><Status value={open.booking.status} /></dd><dt>Payment</dt><dd><Status value={open.booking.payment_status} /></dd><dt>Amount</dt><dd>{formatInr(open.booking.amount_inr)}</dd>
              <dt>Booked</dt><dd>{when(open.booking.booked_at)}</dd><dt>Provider reference</dt><dd>{open.booking.provider_ref ?? "-"}</dd>
              {Object.entries(open.detail as Row).filter(([k]) => k !== "booking_id").map(([k, v]) => <Fragment key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{String(v ?? "-")}</dd></Fragment>)}</dl>
            <h3>Payments</h3><DataTable rows={open.payments} emptyText="No payments recorded." cols={[{ key: "amount_inr", label: "Amount", render: (p) => formatInr(p.amount_inr) }, { key: "status", label: "Status", render: (p) => <Status value={p.status} /> }, { key: "provider", label: "Provider" }, { key: "created_at", label: "When", render: (p) => when(p.created_at) }]} />
            <p className="xs muted">Card numbers are never stored.</p>
          </div>
        </div>)}
    </div>
  );
}

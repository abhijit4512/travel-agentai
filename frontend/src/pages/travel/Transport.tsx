import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLinks } from "../../components/travel/Bits";
import { ErrorBox } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { useAuth } from "../../services/auth";
import { Row, travelApi } from "../../services/travelApi";
import { ORIGIN_CITIES } from "../../services/text";

type Mode = "bus" | "train" | "flight";
const CFG: Record<Mode, { title: string; eyebrow: string; classes: string[]; classLabel: string; blurb: string; note: string[] }> = {
  bus: { title: "Bus tickets", eyebrow: "By road", classes: ["Any", "AC Sleeper", "Non-AC Sleeper", "AC Seater", "Non-AC Seater", "Volvo", "Semi-Sleeper", "Luxury"], classLabel: "Bus type",
    blurb: "Compare buses on a booking site.", note: ["Live bus schedules, seat maps and fares need a bus booking partner. This app does not have one, so it never shows fake buses.", "Use the links to search and book on the operator or ticket site."] },
  train: { title: "Train tickets", eyebrow: "By rail", classes: ["Any", "1AC", "2AC", "3AC", "Sleeper", "Chair Car", "Executive Chair Car", "Second Sitting"], classLabel: "Class",
    blurb: "Search and book on the official IRCTC site.", note: ["Live schedules, seat availability and fares need authorised Indian Railways access. This app does not have it, so it never shows fake trains.", "Never share your IRCTC password with any website or app, including this one.",
      "To check a PNR or running status, use the official IRCTC or Indian Railways (NTES) pages linked below."] },
  flight: { title: "Flights", eyebrow: "By air", classes: ["Economy", "Premium Economy", "Business", "First"], classLabel: "Travel class",
    blurb: "Compare fares on Google Flights or an airline site.", note: ["Live flight search and booking needs an approved flight provider. This app does not have one, so it never shows invented fares.", "Fares, baggage and refund rules are shown on the airline or booking site you open."] },
};

export default function Transport({ mode }: { mode: Mode }) {
  const cfg = CFG[mode];
  useSeo({ title: cfg.title, description: cfg.blurb });
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const [src, setSrc] = useState(sp.get("src") ?? "Hyderabad"), [dst, setDst] = useState(sp.get("dst") ?? ""), [date, setDate] = useState(""), [ret, setRet] = useState(""), [trip, setTrip] = useState("oneway");
  const [pax, setPax] = useState(1), [kids, setKids] = useState(0), [infants, setInfants] = useState(0), [cls, setCls] = useState(cfg.classes[0]);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof travelApi.links>> | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [saved, setSaved] = useState<Row[]>([]), [log, setLog] = useState(false), [form, setForm] = useState<Row>({});
  const today = new Date().toISOString().slice(0, 10);
  const loadSaved = () => travelApi.searches(mode).then((r) => setSaved(r.items)).catch(() => setSaved([]));
  useEffect(() => { setLinks(null); setCls(cfg.classes[0]); setMsg(""); void loadSaved(); }, [mode]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function go() {
    setErr(""); setMsg("");
    if (!src.trim() || !dst.trim()) { setErr("Enter where you are travelling from and to."); return; }
    if (date && date < today) { setErr("The journey date cannot be in the past."); return; }
    if (trip === "round" && ret && date && ret < date) { setErr("The return date must be on or after the journey date."); return; }
    try { setLinks(await travelApi.links({ kind: mode, src, dst, date, return_date: trip === "round" ? ret : "" })); } catch (e) { setErr((e as Error).message); }
  }
  async function save() { try { await travelApi.saveSearch(mode, `${src} to ${dst}`, { src, dst, date, ret, trip, pax, kids, infants, cls }); setMsg("Search saved."); void loadSaved(); } catch (e) { setMsg((e as Error).message); } }
  async function submitLog(e: FormEvent) {
    e.preventDefault();
    try { await travelApi.logBooking({ category: mode, title: form.title || `${src} to ${dst}`, provider: form.provider || "", from_location: src, to_location: dst, travel_date: date || null, amount_inr: Number(form.amount) || 0, reference_from_provider: form.ref || "" }); setMsg("Saved to your own records as an external booking. It is not verified by this app."); setLog(false); }
    catch (x) { setMsg((x as Error).message); }
  }
  const pnr = mode === "train";

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">{cfg.eyebrow}</p><h1>{cfg.title}</h1><p className="muted">{cfg.blurb}</p></div>
      <div className="notice warn small" role="note"><strong>How this works:</strong><ul style={{ margin: ".4rem 0 0" }}>{cfg.note.map((n) => <li key={n}>{n}</li>)}</ul></div>
      <form className="card stack" style={{ marginTop: "1rem" }} onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <div className="field-row">
          <label>From<input list="tcities" value={src} onChange={(e) => setSrc(e.target.value)} /><datalist id="tcities">{ORIGIN_CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label>To<input list="tcities" value={dst} onChange={(e) => setDst(e.target.value)} placeholder="City or station" /></label>
          <label>Journey date<input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          {mode === "flight" && <label>Trip<select value={trip} onChange={(e) => setTrip(e.target.value)}><option value="oneway">One way</option><option value="round">Round trip</option></select></label>}
          {mode === "flight" && trip === "round" && <label>Return date<input type="date" min={date || today} value={ret} onChange={(e) => setRet(e.target.value)} /></label>}
          <label>{mode === "flight" ? "Adults" : "Passengers"}<input type="number" min={1} max={9} value={pax} onChange={(e) => setPax(Math.max(1, Number(e.target.value) || 1))} /></label>
          {mode === "flight" && <><label>Children<input type="number" min={0} max={8} value={kids} onChange={(e) => setKids(Math.max(0, Number(e.target.value) || 0))} /></label><label>Infants<input type="number" min={0} max={4} value={infants} onChange={(e) => setInfants(Math.max(0, Number(e.target.value) || 0))} /></label></>}
          <label>{cfg.classLabel}<select value={cls} onChange={(e) => setCls(e.target.value)}>{cfg.classes.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        {err && <ErrorBox message={err} />}
        <div className="row"><button className="btn primary">Find where to book</button>{links && <button type="button" className="btn ghost" onClick={() => void save()}>Save this search</button>}{msg && <span className="small ok" role="status">{msg}</span>}</div>
        <p className="xs muted">Your class, passenger count and dates are kept in your saved search. They are not sent to the booking sites unless the link supports them.</p>
      </form>

      {links && <div className="two-col" style={{ marginTop: "1.5rem" }}>
        <ExternalLinks links={links.links} disclaimer={links.disclaimer} />
        <section className="card stack"><h3>After you book</h3>
          {user ? (log ? (
            <form className="stack" onSubmit={submitLog}>
              <label>What did you book?<input value={form.title ?? `${src} to ${dst}`} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>Booked on (website)<input value={form.provider ?? ""} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></label>
              <label>Amount you paid (₹, optional)<input type="number" min="0" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
              <label>{pnr ? "PNR (optional)" : "Their reference (optional)"}<input value={form.ref ?? ""} onChange={(e) => setForm({ ...form, ref: e.target.value })} maxLength={60} /></label>
              <div className="row"><button className="btn solid">Save record</button><button type="button" className="btn ghost" onClick={() => setLog(false)}>Cancel</button></div></form>
          ) : <><p className="small muted">Keep your own note of what you booked. It is marked "external, not verified".</p><button className="btn" onClick={() => setLog(true)}>Record my booking</button></>)
            : <p className="small muted"><Link to="/login">Log in</Link> to keep a record of what you book elsewhere.</p>}</section></div>}

      <section className="section"><h2 style={{ fontSize: "1.3rem" }}>Saved {mode} searches</h2>
        {saved.length === 0 ? <p className="muted small">Nothing saved yet.</p> : <ul className="saved">{saved.map((s) => (
          <li key={s.id} className="card"><div><b>{s.title}</b><br /><span className="muted small">{s.params.date || "no date"} · {s.params.pax} passenger(s) · {s.params.cls}</span></div>
            <div className="row"><button className="btn sm solid" onClick={() => { setSrc(s.params.src); setDst(s.params.dst); setDate(s.params.date || ""); setPax(s.params.pax || 1); setCls(s.params.cls || cfg.classes[0]); }}>Use again</button>
              <button className="btn sm ghost" onClick={() => void travelApi.deleteSearch(s.id).then(loadSaved)}>Delete</button></div></li>))}</ul>}</section>
    </div>
  );
}

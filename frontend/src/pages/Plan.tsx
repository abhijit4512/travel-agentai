import { Check, Copy, Printer, Save, Share2, Volume2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PlanView from "../components/PlanView";
import { ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { useSpeechSynthesis } from "../hooks/useSpeech";
import { api, PlanParams } from "../services/api";
import { ORIGIN_CITIES, stripMarkdown } from "../services/text";
import type { Plan, Weather } from "../types";

const INTERESTS = ["temple", "wildlife", "beach", "hills", "heritage", "waterfall", "adventure", "food", "culture", "offbeat"];

export default function PlanPage() {
  const [sp] = useSearchParams();
  const destination = sp.get("destination"), tripId = sp.get("trip");
  useSeo({ title: "Plan your trip", description: "Build a day-by-day India itinerary with an editable schedule and an INR budget." });
  return destination || tripId ? <Results /> : <Builder budget={sp.get("budget") ?? "25000"} />;
}

/* ---------------- builder form ---------------- */
function Builder({ budget: b0 }: { budget: string }) {
  const [, setSp] = useSearchParams();
  const [origin, setOrigin] = useState("Hyderabad");
  const [dest, setDest] = useState(""), [destId, setDestId] = useState<string | null>(null);
  const [sugs, setSugs] = useState<{ id: string; name: string; state: string }[]>([]);
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [adults, setAdults] = useState(2), [children, setChildren] = useState(0);
  const [budget, setBudget] = useState(b0);
  const [mode, setMode] = useState("train"), [style, setStyle] = useState("standard"), [pace, setPace] = useState("balanced");
  const [interests, setInterests] = useState<string[]>([]);
  const [access, setAccess] = useState(""), [special, setSpecial] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { if (destId || dest.trim().length < 2) { setSugs([]); return; } const t = setTimeout(() => api.suggest(dest.trim()).then((r) => setSugs(r.suggestions)).catch(() => setSugs([])), 220); return () => clearTimeout(t); }, [dest, destId]);
  // Preferences of logged-in users prefill the form.
  useEffect(() => { api.preferences().then((p) => { if (p.home_city) setOrigin(p.home_city); setInterests(p.interests); setStyle(p.budget_style); setPace(p.pace); }).catch(() => {}); }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!destId) errs.push("Choose a destination from the suggestions.");
    if (start && start < today) errs.push("Departure date cannot be in the past.");
    if (start && end && end < start) errs.push("Return date must be on or after departure.");
    setErrors(errs); if (errs.length) return;
    const days = start && end ? Math.min(14, Math.max(1, Math.round((+new Date(end) - +new Date(start)) / 864e5) + 1)) : 4;
    const q = new URLSearchParams({ destination: destId!, origin, days: String(days), adults: String(adults), children: String(children), budget, mode, style, pace });
    if (start) q.set("start", start); if (access) q.set("access", access); if (special) q.set("special", special);
    interests.forEach((i) => q.append("interest", i));
    setSp(q);
  }
  return (
    <div className="container page" style={{ maxWidth: 900 }}>
      <div className="page-head"><p className="eyebrow">Itinerary builder</p><h1>Plan your trip</h1><p className="muted">Tell us the basics. You can edit, reorder and save the result. One destination per plan for now; use the Map page for multi-stop routes.</p></div>
      <form className="card stack" onSubmit={submit} noValidate>
        <div className="field-row">
          <label>Starting city<input list="cities2" value={origin} onChange={(e) => setOrigin(e.target.value)} /><datalist id="cities2">{ORIGIN_CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="ac">Destination
            <input value={dest} onChange={(e) => { setDest(e.target.value); setDestId(null); }} placeholder="Start typing a place" autoComplete="off" role="combobox" aria-expanded={sugs.length > 0} />
            {sugs.length > 0 && <ul role="listbox">{sugs.map((s) => <li key={s.id}><button type="button" role="option" aria-selected={false} onClick={() => { setDest(s.name); setDestId(s.id); setSugs([]); }}>{s.name} <span className="muted xs">{s.state}</span></button></li>)}</ul>}
          </label>
        </div>
        <div className="field-row">
          <label>Departure<input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label>Return<input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <label>Adults<input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} /></label>
          <label>Children<input type="number" min={0} max={20} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} /></label>
        </div>
        <div className="field-row">
          <label>Total budget (₹)<input type="number" min={1000} step={1000} value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
          <label>Travel by<select value={mode} onChange={(e) => setMode(e.target.value)}><option value="train">Train</option><option value="bus">Bus</option><option value="flight">Flight</option></select></label>
          <label>Stay<select value={style} onChange={(e) => setStyle(e.target.value)}><option value="budget">Budget</option><option value="standard">Standard</option><option value="comfort">Comfort</option></select></label>
          <label>Pace<select value={pace} onChange={(e) => setPace(e.target.value)}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option></select></label>
        </div>
        <fieldset><legend>Interests</legend><div className="chips">{INTERESTS.map((t) => <label key={t} className={`chip ${interests.includes(t) ? "on" : ""}`} style={{ flexDirection: "row", fontWeight: 500 }}><input type="checkbox" checked={interests.includes(t)} onChange={() => setInterests((c) => c.includes(t) ? c.filter((x) => x !== t) : [...c, t])} />{t}</label>)}</div></fieldset>
        <label>Accessibility needs (optional)<input value={access} onChange={(e) => setAccess(e.target.value)} maxLength={200} placeholder="e.g. wheelchair access, limited walking" /></label>
        <label>Special requirements (optional)<textarea rows={2} value={special} onChange={(e) => setSpecial(e.target.value)} maxLength={300} placeholder="e.g. vegetarian food, travelling with a toddler" /></label>
        <p className="small muted">Accessibility and special requirements are saved with your trip and shown on it. They do not change the suggestions automatically, so please verify them with each venue.</p>
        {errors.length > 0 && <p className="err" role="alert">{errors.join(" ")}</p>}
        <button className="btn primary" type="submit">Build my itinerary</button>
      </form>
    </div>
  );
}

/* ---------------- results ---------------- */
function Results() {
  const [sp, setSp] = useSearchParams();
  const tts = useSpeechSynthesis();
  const tripId = sp.get("trip");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [msg, setMsg] = useState("");
  const [savedId, setSavedId] = useState<number | null>(tripId ? Number(tripId) : null);
  const [shareUrl, setShareUrl] = useState(""), [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipFetch = useRef(false);

  const params: PlanParams | null = useMemo(() => {
    const dest = sp.get("destination"); if (!dest) return null;
    const num = (k: string, d: number) => { const n = Number(sp.get(k)); return Number.isFinite(n) && n > 0 ? n : d; };
    return { destination_id: dest, days: Math.min(14, num("days", 4)), adults: Math.min(20, num("adults", 2)), children: Number(sp.get("children") ?? 0) || 0,
      origin_city: sp.get("origin") ?? "Hyderabad", budget_inr: sp.get("budget") ? Number(sp.get("budget")) : null, style: sp.get("style") ?? "standard",
      transport_mode: sp.get("mode") ?? "train", interests: sp.getAll("interest"), excluded_activities: [], pace: sp.get("pace") ?? "balanced",
      start_date: sp.get("start"), accessibility_needs: sp.get("access") ?? "", special_requirements: sp.get("special") ?? "" };
  }, [sp]);

  const load = useCallback(() => {
    setError(""); setLoading(true); setMsg(""); setDirty(false);
    const done = (p: Plan) => { setPlan(p); api.weather(p.destination.id).then(setWeather).catch(() => setWeather({ status: "unavailable", message: "Weather could not be loaded." })); };
    const job = tripId ? api.trip(Number(tripId)).then((t) => done(t.plan)) : params ? api.plan(params).then(done) : Promise.resolve();
    job.catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [params, tripId]);
  useEffect(() => { if (skipFetch.current) { skipFetch.current = false; return; } load(); }, [load]);

  const update = (changes: Record<string, string>) => { const n = new URLSearchParams(sp); Object.entries(changes).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); n.delete("trip"); setSavedId(null); setSp(n, { replace: true }); };

  async function save(): Promise<number | null> {
    if (!plan) return null;
    try { const t = await api.saveTrip(`${plan.request.days} days in ${plan.destination.name}`, plan); setSavedId(t.id); setMsg("Saved. Find it on your dashboard or under Saved trips."); return t.id; }
    catch (e) { setMsg((e as Error).message); return null; }
  }
  async function share() {
    const id = savedId ?? (await save()); if (!id) return;
    try { const r = await api.shareTrip(id); setShareUrl(window.location.origin + r.path); } catch (e) { setMsg((e as Error).message); }
  }
  async function stopSharing() { if (savedId) { await api.unshareTrip(savedId).catch(() => {}); setShareUrl(""); setMsg("Sharing turned off. The old link no longer works."); } }
  function speak() { if (!plan) return; tts.speak(stripMarkdown(plan.itinerary.days.map((d) => `${d.title}. ${d.slots.filter((s) => s.kind === "attraction").map((s) => s.title).join(", ")}.`).join(" ") + ` Estimated total ${plan.budget.total_inr} rupees. This is an illustrative estimate.`), "en-IN"); }

  return (
    <div className="container page">
      {error && <ErrorBox message={error} onRetry={load} />}
      {!plan && loading && <><Skeleton height={260} /><Skeleton height={320} /></>}
      {plan && (<>
        <section className="card controls no-print" aria-label="Adjust trip">
          <label>Days<input type="number" min={1} max={14} value={plan.request.days} disabled={!!tripId} onChange={(e) => update({ days: e.target.value })} /></label>
          <label>Adults<input type="number" min={1} max={20} value={plan.request.adults} disabled={!!tripId} onChange={(e) => update({ adults: e.target.value })} /></label>
          <label>Budget (₹)<input type="number" min={1000} step={1000} value={plan.request.budget_inr ?? ""} placeholder="No limit" disabled={!!tripId} onChange={(e) => update({ budget: e.target.value })} /></label>
          <label>Pace<select value={plan.request.pace ?? "balanced"} disabled={!!tripId} onChange={(e) => update({ pace: e.target.value })}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option></select></label>
          <label>Style<select value={plan.request.style} disabled={!!tripId} onChange={(e) => update({ style: e.target.value })}><option value="budget">Budget</option><option value="standard">Standard</option><option value="comfort">Comfort</option></select></label>
          <label>Start date<input type="date" value={plan.request.start_date ?? ""} onChange={(e) => { setPlan({ ...plan, request: { ...plan.request, start_date: e.target.value || null } }); setDirty(true); }} /></label>
          <button className="btn" onClick={() => { if (tripId) { const n = new URLSearchParams(sp); n.delete("trip"); n.set("destination", plan.destination.id); n.set("days", String(plan.request.days)); n.set("adults", String(plan.request.adults)); setSp(n); } else load(); }} disabled={loading}>{loading ? "Updating..." : tripId ? "Edit as new plan" : "Regenerate"}</button>
        </section>
        {dirty && !tripId && <p className="small muted no-print">You have manual edits. Regenerating resets them.</p>}
        <div className="row no-print" style={{ margin: ".75rem 0 1.25rem" }}>
          <button className="btn solid" onClick={() => void save()}><Save size={16} /> Save trip</button>
          <button className="btn" onClick={() => void share()}><Share2 size={16} /> Share link</button>
          <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>
          <button className="btn ghost" onClick={tts.speaking ? tts.stop : speak} disabled={!tts.supported}><Volume2 size={16} /> {tts.speaking ? "Stop" : "Listen"}</button>
        </div>
        {msg && <p role="status" className="small ok"><Check size={14} /> {msg}</p>}
        {shareUrl && <div className="notice warn no-print"><p className="small" style={{ margin: 0 }}>Anyone with this link can view this plan (not your account details):</p>
          <div className="row"><input readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
            <button className="btn sm" onClick={async () => { await navigator.clipboard.writeText(shareUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
            <button className="btn sm ghost" onClick={() => void stopSharing()}>Stop sharing</button></div></div>}
        <PlanView plan={plan} weather={weather} onChange={(p) => { skipFetch.current = false; setPlan(p); setDirty(true); }} />
      </>)}
    </div>
  );
}

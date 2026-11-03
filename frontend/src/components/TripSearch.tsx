import { Mic, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpeechRecognition } from "../hooks/useSpeech";
import { api } from "../services/api";
import { ORIGIN_CITIES } from "../services/text";

const INTERESTS = ["temple", "wildlife", "beach", "hills", "heritage", "waterfall", "adventure", "food"];
type Sug = { id: string; name: string; state: string };

/** The big hero search: where from, where to, dates, travellers, budget, interests, plus voice. */
export default function TripSearch() {
  const nav = useNavigate();
  const [origin, setOrigin] = useState("Hyderabad");
  const [dest, setDest] = useState("");
  const [destId, setDestId] = useState<string | null>(null);
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [budget, setBudget] = useState("25000");
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [nl, setNl] = useState("");
  const timer = useRef<number>();
  const onVoice = useCallback((t: string) => setNl(t), []);
  const voice = useSpeechRecognition("en-IN", onVoice);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (destId || dest.trim().length < 2) { setSugs([]); return; }
    setBusy(true);
    timer.current = window.setTimeout(() => api.suggest(dest.trim()).then((r) => setSugs(r.suggestions)).catch(() => setSugs([])).finally(() => setBusy(false)), 220);
    return () => window.clearTimeout(timer.current);
  }, [dest, destId]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (start && start < today) errs.push("Departure date cannot be in the past.");
    if (start && end && end < start) errs.push("Return date must be on or after departure.");
    if (origin.trim().length < 2) errs.push("Enter a starting city.");
    setErrors(errs);
    if (errs.length) return;
    const days = start && end ? Math.min(14, Math.max(1, Math.round((+new Date(end) - +new Date(start)) / 864e5) + 1)) : 4;
    if (destId) {
      const q = new URLSearchParams({ destination: destId, origin, days: String(days), adults: String(adults), budget });
      if (start) q.set("start", start);
      interests.forEach((i) => q.append("interest", i));
      nav(`/plan?${q}`);
    } else {
      const q = new URLSearchParams(); if (dest.trim()) q.set("q", dest.trim()); if (interests[0]) q.set("tag", interests[0]);
      nav(`/explore?${q}`);
    }
  }
  function askAi(e: FormEvent) { e.preventDefault(); if (nl.trim()) nav("/chat", { state: { prefill: nl.trim() } }); }

  return (
    <div className="tripsearch">
      <form onSubmit={submit} noValidate aria-label="Trip search">
        <div className="grid-fields">
          <label>From<input list="cities" value={origin} onChange={(e) => setOrigin(e.target.value)} autoComplete="off" /><datalist id="cities">{ORIGIN_CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="ac">To (any place in India)
            <input value={dest} onChange={(e) => { setDest(e.target.value); setDestId(null); }} placeholder="Munnar, Kedarnath, Hampi..." role="combobox" aria-expanded={sugs.length > 0} aria-autocomplete="list" autoComplete="off" />
            {(sugs.length > 0 || (busy && dest.length > 1)) && (
              <ul role="listbox">
                {busy && sugs.length === 0 && <li className="small muted" style={{ padding: ".5rem" }}>Searching...</li>}
                {sugs.map((s) => <li key={s.id}><button type="button" role="option" aria-selected={false} onClick={() => { setDest(s.name); setDestId(s.id); setSugs([]); }}>{s.name} <span className="muted xs">{s.state}</span></button></li>)}
              </ul>)}
          </label>
          <label>Departure<input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label>Return<input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <label>Travellers<input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
          <label>Budget (total)<select value={budget} onChange={(e) => setBudget(e.target.value)}>{["10000", "15000", "25000", "40000", "60000", "100000"].map((b) => <option key={b} value={b}>Up to ₹{Number(b).toLocaleString("en-IN")}</option>)}</select></label>
        </div>
        <div className="row" style={{ marginTop: ".75rem" }} role="group" aria-label="Travel interests">
          {INTERESTS.map((t) => <label key={t} className={`chip ${interests.includes(t) ? "on" : ""}`} style={{ flexDirection: "row", fontWeight: 500 }}><input type="checkbox" checked={interests.includes(t)} onChange={() => setInterests((c) => c.includes(t) ? c.filter((x) => x !== t) : [...c, t])} />{t}</label>)}
        </div>
        {errors.length > 0 && <p className="err" role="alert">{errors.join(" ")}</p>}
        <button className="btn primary" type="submit" style={{ marginTop: ".75rem" }}><Search size={18} /> {destId ? "Plan my trip" : "Search destinations"}</button>
      </form>
      <form onSubmit={askAi} className="row" aria-label="Ask the AI planner" style={{ flexWrap: "nowrap" }}>
        <label style={{ flex: 1 }}><span className="sr">Describe your trip in your own words</span>
          <input value={nl} onChange={(e) => setNl(e.target.value)} maxLength={500} placeholder="Or just say it: 7-day South India temple trip from Hyderabad" /></label>
        <button type="button" className={`icon-btn ${voice.listening ? "live" : ""}`} onClick={voice.listening ? voice.stop : voice.start} aria-pressed={voice.listening} aria-label={voice.listening ? "Stop listening" : "Speak your trip request"} disabled={!voice.supported} title={voice.supported ? "" : "Voice input is not supported in this browser"}><Mic size={18} /></button>
        <button className="btn solid" type="submit">Plan with AI</button>
      </form>
      {voice.error && <p className="err" role="status">{voice.error}</p>}
    </div>
  );
}

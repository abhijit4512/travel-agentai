import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { useAuth } from "../services/auth";
import { formatInr, ORIGIN_CITIES } from "../services/text";
import { tagLabel } from "../services/tags";
import { getRecent } from "./Explore";
import type { Destination, Preferences, TripRecord } from "../types";

const TAGS = ["temple", "wildlife", "beach", "hills", "heritage", "waterfall", "adventure", "food", "offbeat", "honeymoon", "family"];

export default function Dashboard() {
  useSeo({ title: "Your dashboard" });
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [fav, setFav] = useState<Destination[] | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ home_city: "", interests: [], budget_style: "standard", pace: "balanced" });
  const [rec, setRec] = useState<Destination[]>([]);
  const [saved, setSaved] = useState("");
  const recent = getRecent();

  useEffect(() => {
    api.trips().then(setTrips).catch(() => setTrips([]));
    api.wishlist().then((r) => setFav(r.items)).catch(() => setFav([]));
    api.preferences().then(setPrefs).catch(() => {});
  }, []);
  useEffect(() => { api.places({ tag: prefs.interests[0] ?? "", featured: !prefs.interests[0], page_size: 4 }).then((r) => setRec(r.items)).catch(() => setRec([])); }, [prefs.interests]);

  async function savePrefs() { try { await api.savePreferences(prefs); setSaved("Preferences saved."); } catch (e) { setSaved((e as Error).message); } }
  const upcoming = trips?.filter((t) => t.plan.request.start_date && new Date(t.plan.request.start_date) >= new Date(new Date().toDateString())) ?? [];

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Dashboard</p><h1>Welcome back, {user?.name.split(" ")[0]}</h1></div>
      <div className="statrow"><div className="stat"><b>{trips?.length ?? "-"}</b>Saved trips</div><div className="stat"><b>{fav?.length ?? "-"}</b>Favourite places</div><div className="stat"><b>{upcoming.length}</b>Upcoming trips</div></div>

      <section className="section"><h2>Upcoming trips</h2>
        {upcoming.length === 0 ? <p className="muted">No upcoming trips. Set a start date on a saved itinerary and it will appear here.</p> :
          <ul className="saved">{upcoming.map((t) => <li key={t.id} className="card"><div><strong>{t.title}</strong><br /><span className="small muted">Starts {new Date(t.plan.request.start_date!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div><Link className="btn sm solid" to={`/plan?trip=${t.id}`}>Open</Link></li>)}</ul>}</section>

      <section className="section"><div className="section-head"><h2>Saved itineraries</h2><Link className="btn sm" to="/saved">View all</Link></div>
        {trips === null ? <Skeleton height={100} /> : trips.length === 0 ? <EmptyState title="No saved trips yet"><Link className="btn primary" to="/plan">Plan a trip</Link></EmptyState> :
          <ul className="saved">{trips.slice(0, 3).map((t) => <li key={t.id} className="card"><div><strong>{t.title}</strong><br /><span className="small muted">Estimate {formatInr(t.plan.budget.total_inr)}</span></div><Link className="btn sm solid" to={`/plan?trip=${t.id}`}>Open</Link></li>)}</ul>}</section>

      <section className="section"><div className="section-head"><h2>Favourite destinations</h2><Link className="btn sm" to="/wishlist">View all</Link></div>
        {fav === null ? <Skeleton height={200} /> : fav.length === 0 ? <EmptyState title="No favourites yet"><p>Tap the heart on any destination to save it.</p><Link className="btn primary" to="/explore">Explore</Link></EmptyState> :
          <div className="grid">{fav.slice(0, 4).map((d) => <PlaceCard key={d.id} d={d} />)}</div>}</section>

      <section className="section"><h2>Recommended for you</h2><p className="small muted">Picked from your interests below. This is a simple rule, not a prediction.</p><div className="grid">{rec.map((d) => <PlaceCard key={d.id} d={d} />)}</div></section>

      <section className="section"><h2>Travel preferences</h2>
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); void savePrefs(); }}>
          <div className="field-row">
            <label>Home city<input list="cities3" value={prefs.home_city} onChange={(e) => setPrefs({ ...prefs, home_city: e.target.value })} maxLength={60} /><datalist id="cities3">{ORIGIN_CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label>Stay style<select value={prefs.budget_style} onChange={(e) => setPrefs({ ...prefs, budget_style: e.target.value as Preferences["budget_style"] })}><option value="budget">Budget</option><option value="standard">Standard</option><option value="comfort">Comfort</option></select></label>
            <label>Pace<select value={prefs.pace} onChange={(e) => setPrefs({ ...prefs, pace: e.target.value as Preferences["pace"] })}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option></select></label>
          </div>
          <fieldset><legend>Interests</legend><div className="chips">{TAGS.map((t) => <label key={t} className={`chip ${prefs.interests.includes(t) ? "on" : ""}`} style={{ flexDirection: "row", fontWeight: 500 }}><input type="checkbox" checked={prefs.interests.includes(t)} onChange={() => setPrefs({ ...prefs, interests: prefs.interests.includes(t) ? prefs.interests.filter((x) => x !== t) : [...prefs.interests, t].slice(0, 12) })} />{tagLabel(t)}</label>)}</div></fieldset>
          <div className="row"><button className="btn solid" type="submit">Save preferences</button>{saved && <span role="status" className="small ok">{saved}</span>}</div>
        </form></section>

      {recent.length > 0 && <section className="section"><h2>Recent searches</h2><div className="chips">{recent.map((r) => <Link key={r} className="chip" to={`/explore?q=${encodeURIComponent(r)}`}>{r}</Link>)}</div></section>}
    </div>
  );
}

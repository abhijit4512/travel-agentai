import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { useAuth } from "../services/auth";
import { formatInr } from "../services/text";
import type { TripRecord } from "../types";

export default function Saved() {
  useSeo({ title: "Saved trips" });
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [error, setError] = useState("");
  const load = () => { setTrips(null); api.trips().then(setTrips).catch((e: Error) => setError(e.message)); };
  useEffect(() => { load(); }, [user?.id]);
  async function remove(id: number) { try { await api.deleteTrip(id); setTrips((t) => t?.filter((x) => x.id !== id) ?? null); } catch (e) { setError((e as Error).message); } }
  return (
    <div className="container page">
      <div className="page-head"><h1>Saved trips</h1>
        <p className="muted small">{user ? `Saved to your account (${user.email}).` : <>Trips are saved for this browser only. <Link to="/login" state={{ from: "/saved" }}>Log in</Link> to keep them on your account.</>}</p></div>
      {error && <ErrorBox message={error} onRetry={() => { setError(""); load(); }} />}
      {trips === null && !error && <Skeleton height={120} />}
      {trips && trips.length === 0 && <EmptyState title="No saved trips yet"><p>Plan a trip and choose Save trip.</p><Link className="btn primary" to="/plan">Plan a trip</Link></EmptyState>}
      <ul className="saved">{trips?.map((t) => (
        <li key={t.id} className="card"><div><h3 style={{ margin: 0 }}>{t.title}</h3><p className="muted small" style={{ margin: 0 }}>{t.plan.request.days} days, estimate {formatInr(t.plan.budget.total_inr)}, saved {new Date(t.created_at).toLocaleDateString("en-IN")}</p></div>
          <div className="row"><Link className="btn sm solid" to={`/plan?trip=${t.id}`}>Open</Link><button className="btn sm ghost" onClick={() => void remove(t.id)} aria-label={`Delete ${t.title}`}>Delete</button></div></li>))}</ul>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { api } from "../services/api";
import { useAuth } from "../services/auth";
import { formatInr } from "../services/text";
import type { Plan, TripRecord } from "../types";

export function planLink(p: Plan): string {
  const r = p.request;
  const q = new URLSearchParams({ destination: p.destination.id, origin: r.origin_city, days: String(r.days),
    adults: String(r.adults), children: String(r.children), style: r.style, mode: r.transport_mode });
  if (r.budget_inr) q.set("budget", String(r.budget_inr));
  r.interests.forEach((i) => q.append("interest", i));
  (r.excluded ?? []).forEach((x) => q.append("ex", x));
  return `/plan?${q}`;
}

export default function Saved() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setTrips(null);
    api.trips().then(setTrips).catch((e: Error) => setError(e.message));
  };
  // Reload the list when you log in or out, because guest trips and account trips are separate.
  useEffect(() => { load(); }, [user?.id]);

  async function remove(id: number) {
    try { await api.deleteTrip(id); setTrips((t) => t?.filter((x) => x.id !== id) ?? null); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="page">
      <h1>Saved trips</h1>
      <p className="muted small">
        {user
          ? `Saved to your account (${user.email}).`
          : <>Trips are saved for this browser only. <Link to="/login" state={{ from: "/saved" }}>Log in</Link> to keep them on your account.</>}
      </p>
      {error && <ErrorBox message={error} onRetry={() => { setError(""); load(); }} />}
      {trips === null && !error && <Skeleton height={120} />}
      {trips && trips.length === 0 && <EmptyState title="No saved trips yet"><p>Plan a trip and choose Save trip.</p><Link className="btn" to="/plan">Plan a trip</Link></EmptyState>}
      <ul className="saved">
        {trips?.map((t) => (
          <li key={t.id} className="card">
            <div><h3>{t.title}</h3>
              <p className="muted small">{t.plan.request.days} days, estimate {formatInr(t.plan.budget.total_inr)}, saved {new Date(t.created_at).toLocaleDateString("en-IN")}</p></div>
            <div className="row"><Link className="btn" to={planLink(t.plan)}>Open</Link>
              <button className="btn ghost" onClick={() => void remove(t.id)} aria-label={`Delete ${t.title}`}>Delete</button></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, travelApi } from "../services/travelApi";
import { formatInr } from "../services/text";
import type { Plan } from "../types";

const CITIES = ["hyderabad", "bengaluru", "bangalore", "chennai", "mumbai", "pune", "delhi", "kolkata", "ahmedabad", "kochi", "visakhapatnam", "jaipur"];

/** "Getting there and staying" card on the trip plan: a car cost estimate plus links to the other travel pages. */
export default function TravelOptions({ plan }: { plan: Plan }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const origin = plan.request.origin_city;
  const d = plan.destination;
  useEffect(() => {
    if (!CITIES.includes(origin.trim().toLowerCase())) { setRows([]); return; }
    travelApi.estimate({ stops: [{ city: origin }, { place_id: d.id }], vehicle_ids: ["swift-petrol", "city-petrol", "creta-diesel"], fuel_city: origin, round_trip: true, days: plan.request.days })
      .then((r) => setRows(r.results)).catch(() => setRows([]));
  }, [origin, d.id, plan.request.days]);
  const q = `src=${encodeURIComponent(origin)}&dst=${encodeURIComponent(d.name)}`;
  return (
    <section className="card"><h3>Getting there and staying</h3>
      {rows === null ? <p className="small muted">Estimating car costs...</p> : rows.length > 0 ? (
        <><p className="small muted">Round trip by road from {origin}, with rental for {plan.request.days} days. Estimates only.</p>
          <ul className="small">{rows.map((r) => <li key={r.vehicle.id}>{r.vehicle.name}: about <b>{r.total_inr ? formatInr(r.total_inr) : "-"}</b> <span className="muted xs">({r.distance_km} km, fuel {r.fuel_cost_inr ? formatInr(r.fuel_cost_inr) : "-"})</span></li>)}</ul></>
      ) : <p className="small muted">Car costs are available for the major starting cities. Use the calculator and type your own distance.</p>}
      <div className="row"><Link className="btn sm" to={`/cars`}>Car calculator</Link><Link className="btn sm" to={`/hotels?place=${d.id}&name=${encodeURIComponent(d.name)}`}>Hotels</Link>
        <Link className="btn sm" to={`/train?${q}`}>Trains</Link><Link className="btn sm" to={`/bus?${q}`}>Buses</Link><Link className="btn sm" to={`/flights?${q}`}>Flights</Link></div>
      <p className="xs muted">Hotel, train, bus and flight prices are not shown because this app has no live provider for them. The pages above explain where to book.</p></section>
  );
}

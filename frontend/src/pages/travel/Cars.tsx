import { Car, Fuel, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NearbyList, PlacePicker } from "../../components/travel/Bits";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, travelApi } from "../../services/travelApi";
import { ORIGIN_CITIES, formatInr } from "../../services/text";

type StopState = { text: string; place: { id: string; name: string } | null };
const toStop = (s: StopState) => {
  const city = ORIGIN_CITIES.find((c) => c.toLowerCase() === s.text.trim().toLowerCase());
  if (s.place) return { place_id: s.place.id };
  if (city) return { city };
  throw new Error(`Pick "${s.text || "a place"}" from the suggestions, or type one of the listed cities.`);
};
const STATUS_TEXT: Record<string, string> = { live: "LIVE price from provider", cached: "Cached provider price", manual: "Manual price set by an admin", manual_reference: "NOT LIVE: approximate reference value", user_entered: "Price you entered", unavailable: "No price available" };

export default function Cars() {
  useSeo({ title: "Car rental and fuel cost calculator", description: "Compare cars, fuel needed and total road-trip cost for any destination in India." });
  const [cat, setCat] = useState("");
  const [data, setData] = useState<{ categories: Record<string, string>; vehicles: Row[]; note: string } | null>(null), [err, setErr] = useState("");
  const [stops, setStops] = useState<StopState[]>([{ text: "Hyderabad", place: null }, { text: "", place: null }]);
  const [picked, setPicked] = useState<string[]>(["swift-petrol", "city-petrol", "creta-diesel"]);
  const [round, setRound] = useState(true), [days, setDays] = useState(""), [fuelCity, setFuelCity] = useState("Hyderabad");
  const [distance, setDistance] = useState(""), [mileage, setMileage] = useState(""), [tolls, setTolls] = useState(""), [parking, setParking] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [res, setRes] = useState<Awaited<ReturnType<typeof travelApi.estimate>> | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [near, setNear] = useState<Row | null>(null), [nearKind, setNearKind] = useState("");

  useEffect(() => { setData(null); travelApi.vehicles(cat).then(setData).catch((e: Error) => setErr(e.message)); }, [cat]);
  const fuelsPicked = useMemo(() => [...new Set(picked.map((id) => data?.vehicles.find((v) => v.id === id)?.fuel_type).filter(Boolean))] as string[], [picked, data]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p));
  const setStop = (i: number, s: StopState) => setStops((cur) => cur.map((x, j) => (j === i ? s : x)));

  function body(): Row {
    const ov: Row = {}; Object.entries(prices).forEach(([k, v]) => { if (v && Number(v) > 0) ov[k] = Number(v); });
    return { stops: stops.filter((s) => s.text.trim()).map(toStop), vehicle_ids: picked, fuel_city: fuelCity, fuel_prices_override: ov, round_trip: round, days: days ? Number(days) : null,
      tolls_inr: Number(tolls) || 0, parking_inr: Number(parking) || 0, distance_override_km: distance ? Number(distance) : null, mileage_override: mileage ? Number(mileage) : null };
  }
  async function calc() {
    setMsg(""); setErr(""); setBusy(true); setNear(null);
    try { if (!picked.length) throw new Error("Choose at least one car."); setRes(await travelApi.estimate(body())); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!res) return;
    try { await travelApi.saveRoadTrip(`${stops[0].text} to ${stops[stops.length - 1].text}`, body(), { cheapest: res.cheapest_vehicle_id, cars: res.results.map((r) => ({ id: r.vehicle.id, total: r.total_inr })) }); setMsg("Road trip saved. Find it under My Travel."); }
    catch (e) { setMsg((e as Error).message); }
  }
  async function loadNear(kind: string) {
    const last = res?.stops[res.stops.length - 1]; if (!last) return;
    setNearKind(kind); setNear(null);
    try { setNear(await travelApi.nearby({ kind, lat: last.lat, lng: last.lng, radius_km: 10 })); } catch (e) { setMsg((e as Error).message); }
  }
  const dest = stops[stops.length - 1];

  return (
    <div className="container page">
      <div className="page-head"><p className="eyebrow">Road trips</p><h1>Car rental and fuel cost calculator</h1>
        <p className="muted">Fuel needed = distance ÷ mileage. Fuel cost = fuel needed × fuel price. Distances are estimates, rental prices are indicative and fuel prices are labelled live only when a live provider is configured.</p></div>

      <form className="card stack" onSubmit={(e) => { e.preventDefault(); void calc(); }}>
        <h2 style={{ fontSize: "1.3rem" }}>1. Your route</h2>
        {stops.map((s, i) => (
          <div key={i} className="row" style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
            <div style={{ flex: 1 }}><PlacePicker label={i === 0 ? "Starting point" : i === stops.length - 1 ? "Destination" : `Stop ${i}`} value={s.text} onPick={(p, t) => setStop(i, { text: t, place: p })} placeholder="City or tourist place" /></div>
            {stops.length > 2 && i > 0 && i < stops.length - 1 && <button type="button" className="btn sm ghost" onClick={() => setStops((c) => c.filter((_, j) => j !== i))}>Remove</button>}
          </div>))}
        <div className="row">
          {stops.length < 6 && <button type="button" className="btn sm" onClick={() => setStops((c) => [...c.slice(0, -1), { text: "", place: null }, c[c.length - 1]])}>Add a stop</button>}
          <label className="check"><input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} /> Round trip (return the same way)</label>
        </div>
        <h2 style={{ fontSize: "1.3rem" }}>2. Choose up to 4 cars to compare</h2>
        <div className="chips"><button type="button" className={`chip ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>All</button>
          {data && Object.entries(data.categories).map(([k, l]) => <button type="button" key={k} className={`chip ${cat === k ? "on" : ""}`} onClick={() => setCat(k)}>{l}</button>)}</div>
        {!data ? <Skeleton height={200} /> : <div className="vgrid">{data.vehicles.map((v) => (
          <button type="button" key={v.id} className={`vcard ${picked.includes(v.id) ? "on" : ""}`} aria-pressed={picked.includes(v.id)} onClick={() => toggle(v.id)}>
            <span className="vicon">{v.fuel_type === "electric" ? <Zap size={22} /> : <Car size={22} />}</span>
            <b>{v.name}</b><span className="muted xs">{data.categories[v.category]} · {v.model}</span>
            <span className="small"><Fuel size={13} /> {v.fuel_type === "electric" ? `${v.kwh_per_100km} kWh per 100 km` : `${v.mileage} ${v.fuel_type === "cng" ? "km/kg" : "km/l"}`} · <Users size={13} /> {v.seats} · {v.transmission}</span>
            <span className="small"><b>{formatInr(v.rent_per_day_inr)}</b> per day <span className="muted xs">(indicative)</span></span>
            <span className="xs muted">{v.features.join(", ")}</span></button>))}</div>}
        <p className="xs muted">No licensed car photos are included, so icons are shown. {data?.note}</p>

        <h2 style={{ fontSize: "1.3rem" }}>3. Adjust the numbers (optional)</h2>
        <div className="field-row">
          <label>Fuel price city<select value={fuelCity} onChange={(e) => setFuelCity(e.target.value)}>{["Default", ...ORIGIN_CITIES].map((c) => <option key={c}>{c}</option>)}</select></label>
          {fuelsPicked.map((f) => <label key={f}>My {f} price (₹ per {f === "cng" ? "kg" : f === "electric" ? "kWh" : "litre"})<input type="number" min="1" step="0.1" value={prices[f] ?? ""} onChange={(e) => setPrices({ ...prices, [f]: e.target.value })} placeholder="Use the reference value" /></label>)}
          <label>Mileage (km/l) if different<input type="number" min="1" step="0.1" value={mileage} onChange={(e) => setMileage(e.target.value)} /></label>
          <label>Distance in km (from Google Maps)<input type="number" min="1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Estimate from the map" /></label>
          <label>Rental days<input type="number" min="1" max="60" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Automatic" /></label>
          <label>Tolls (₹)<input type="number" min="0" value={tolls} onChange={(e) => setTolls(e.target.value)} /></label>
          <label>Parking (₹)<input type="number" min="0" value={parking} onChange={(e) => setParking(e.target.value)} /></label>
        </div>
        <p className="xs muted">Tolls and parking are not looked up. Enter them if you know them. Mileage and the distance entered apply to every car you picked.</p>
        {err && <ErrorBox message={err} />}
        <button className="btn primary" disabled={busy}>{busy ? "Calculating..." : "Calculate trip cost"}</button>
      </form>

      {res && (
        <section className="section">
          <div className="section-head"><h2>Cost estimate</h2><div className="row">{res.maps_link && <a className="btn sm" href={res.maps_link} target="_blank" rel="noreferrer">Open route in Google Maps</a>}<button className="btn sm solid" onClick={() => void save()}>Save this road trip</button></div></div>
          {msg && <p role="status" className="small ok">{msg}</p>}
          <div className="cmp-grid">{res.results.map((r) => (
            <article key={r.vehicle.id} className={`card cost ${res.cheapest_vehicle_id === r.vehicle.id && res.results.length > 1 ? "best" : ""}`}>
              {res.cheapest_vehicle_id === r.vehicle.id && res.results.length > 1 && <span className="status s-confirmed">Lowest total</span>}
              <h3>{r.vehicle.name} <span className="muted small">{r.vehicle.model}</span></h3>
              <dl className="kv"><dt>Total distance</dt><dd>{r.distance_km} km {r.round_trip ? "(round trip)" : "(one way)"}<br /><span className="muted xs">{r.distance_source === "your_input" ? "Distance you entered" : "Estimated from straight line"}</span></dd>
                <dt>Travel time</dt><dd>about {r.travel_time_hours} h of driving</dd>
                <dt>Fuel needed</dt><dd>{r.fuel_required} {r.fuel_unit}</dd>
                <dt>Fuel price</dt><dd>{r.fuel_price.price_inr == null ? "Not available. Enter your own." : `${formatInr(r.fuel_price.price_inr)} per ${r.fuel_price.unit}`}<br /><span className={`xs ${r.fuel_price.status === "live" ? "ok" : "muted"}`}>{STATUS_TEXT[r.fuel_price.status]}{r.fuel_price.updated_at ? `, updated ${new Date(r.fuel_price.updated_at).toLocaleDateString("en-IN")}` : ""}</span></dd>
                <dt>Fuel cost</dt><dd><b>{r.fuel_cost_inr == null ? "-" : formatInr(r.fuel_cost_inr)}</b></dd>
                <dt>Rental ({r.rental_days} day{r.rental_days > 1 ? "s" : ""})</dt><dd>{formatInr(r.rental_cost_inr)} <span className="muted xs">indicative</span></dd>
                <dt>Tolls and parking</dt><dd>{formatInr(r.tolls_inr + r.parking_inr)} <span className="muted xs">entered by you</span></dd></dl>
              <p className="total">Total estimate <b>{r.total_inr == null ? "-" : formatInr(r.total_inr)}</b></p>
            </article>))}</div>
          <ul className="small muted">{res.results[0].assumptions.map((a: string) => <li key={a}>{a}</li>)}</ul>
          <div className="card"><h3>Near {dest.text || "your destination"}</h3><div className="row"><button className="btn sm" onClick={() => void loadNear("fuel")}>Petrol pumps</button><button className="btn sm" onClick={() => void loadNear("ev_charging")}>EV charging stations</button></div>
            {nearKind && !near && <Skeleton height={80} />}<NearbyList data={near} /></div>
        </section>)}
      <p className="small muted" style={{ marginTop: "1.5rem" }}>Need hotels or other transport for this trip? <Link to="/hotels">Hotels</Link> · <Link to="/train">Trains</Link> · <Link to="/bus">Buses</Link> · <Link to="/flights">Flights</Link></p>
    </div>
  );
}

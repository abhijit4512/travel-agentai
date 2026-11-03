import { FormEvent, useEffect, useState } from "react";
import { DataTable, Status, when } from "../../components/admin/AdminUi";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, getAdminToken } from "../../services/adminApi";
import { formatInr } from "../../services/text";

async function areq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` } });
  if (!res.ok) { let m = `Request failed (${res.status}).`; try { m = (await res.json())?.error?.message ?? m; } catch { /* not JSON */ } throw new Error(m); }
  return res.json() as Promise<T>;
}
const TABS = [["vehicles", "Cars"], ["fuel", "Fuel prices"], ["integrations", "Integrations"], ["public", "Public content"]] as const;
const BLANK = { id: "", category: "hatchback", name: "", model: "", fuel_type: "petrol", mileage: "15", kwh_per_100km: "", seats: "5", transmission: "Manual", rent_per_day_inr: "2500", features: "Air conditioning", active: true };

export default function Catalog() {
  useSeo({ title: "Admin catalogue" });
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("vehicles"), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [veh, setVeh] = useState<Row[] | null>(null), [fuel, setFuel] = useState<Row | null>(null), [integ, setInteg] = useState<Row | null>(null), [pub, setPub] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>(BLANK), [fp, setFp] = useState<Row>({ city: "", fuel: "petrol", price_inr: "" });
  const load = () => {
    if (tab === "vehicles") areq<{ items: Row[] }>("/catalog/vehicles").then((r) => setVeh(r.items)).catch((e: Error) => setErr(e.message));
    if (tab === "fuel") areq<Row>("/catalog/fuel-prices").then(setFuel).catch((e: Error) => setErr(e.message));
    if (tab === "integrations") areq<Row>("/integrations").then(setInteg).catch((e: Error) => setErr(e.message));
    if (tab === "public") areq<Row>("/memories/public").then(setPub).catch((e: Error) => setErr(e.message));
  };
  useEffect(load, [tab]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function saveVehicle(e: FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      await areq("/catalog/vehicles", { method: "POST", body: JSON.stringify({ ...form, mileage: form.fuel_type === "electric" ? null : Number(form.mileage), kwh_per_100km: form.fuel_type === "electric" ? Number(form.kwh_per_100km) : null, seats: Number(form.seats), rent_per_day_inr: Number(form.rent_per_day_inr), features: String(form.features).split(",").map((s) => s.trim()).filter(Boolean) }) });
      setMsg("Vehicle saved."); setForm(BLANK); load();
    } catch (x) { setErr((x as Error).message); }
  }
  async function saveFuel(e: FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    try { await areq("/catalog/fuel-prices", { method: "PUT", body: JSON.stringify({ city: fp.city, fuel: fp.fuel, price_inr: Number(fp.price_inr) }) }); setMsg("Fuel price saved. It will show as 'manual', not live."); setFp({ city: "", fuel: "petrol", price_inr: "" }); load(); }
    catch (x) { setErr((x as Error).message); }
  }

  return (
    <div className="stack">
      <div className="admin-head"><div><h1>Catalogue and integrations</h1><p className="muted small">Cars, fuel prices, provider status and public content.</p></div></div>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setErr(""); setMsg(""); }}>{l}</button>)}</div>
      {err && <ErrorBox message={err} />}{msg && <p role="status" className="small ok">{msg}</p>}

      {tab === "vehicles" && <>
        <form className="card stack" onSubmit={saveVehicle}><h2>Add or edit a car</h2><p className="small muted">Use an existing id to update it. All figures are indicative.</p>
          <div className="field-row"><label>Id (letters, numbers, dashes)<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} pattern="[a-z0-9-]{2,40}" required /></label>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Model or variant<input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
            <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["hatchback", "sedan", "suv", "premium_suv", "luxury", "electric", "tempo_traveller"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Fuel<select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>{["petrol", "diesel", "cng", "electric"].map((c) => <option key={c}>{c}</option>)}</select></label>
            {form.fuel_type === "electric" ? <label>kWh per 100 km<input type="number" step="0.1" value={form.kwh_per_100km} onChange={(e) => setForm({ ...form, kwh_per_100km: e.target.value })} /></label> : <label>Mileage (km/l or km/kg)<input type="number" step="0.1" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></label>}
            <label>Seats<input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></label><label>Transmission<input value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} /></label>
            <label>Rent per day (₹, indicative)<input type="number" min={0} value={form.rent_per_day_inr} onChange={(e) => setForm({ ...form, rent_per_day_inr: e.target.value })} /></label></div>
          <label>Features (comma separated)<input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Show to customers</label><button className="btn solid">Save car</button></form>
        {!veh ? <Skeleton height={200} /> : <DataTable rows={veh} onRow={(v) => setForm({ ...v, features: v.features.join(", "), mileage: v.mileage ?? "", kwh_per_100km: v.kwh_per_100km ?? "", active: !!v.active })}
          cols={[{ key: "name", label: "Car" }, { key: "category", label: "Category" }, { key: "fuel_type", label: "Fuel" }, { key: "mileage", label: "Mileage", render: (v) => (v.fuel_type === "electric" ? `${v.kwh_per_100km} kWh/100km` : v.mileage) }, { key: "seats", label: "Seats" }, { key: "rent_per_day_inr", label: "Rent/day", render: (v) => formatInr(v.rent_per_day_inr) }, { key: "active", label: "Shown", render: (v) => <Status value={v.active ? "active" : "deactivated"} /> }]} />}
        <p className="xs muted">Click a row to load it into the form.</p></>}

      {tab === "fuel" && <>
        <p className="notice warn small">{fuel?.provider_configured ? "A live provider is configured. Live prices override these values when the provider responds." : "No live fuel price provider is configured. Customers see these manual values, clearly labelled as not live."}</p>
        <form className="card stack" onSubmit={saveFuel}><h2>Set a price</h2><div className="field-row">
          <label>City (lowercase, or default)<input value={fp.city} onChange={(e) => setFp({ ...fp, city: e.target.value })} required minLength={2} /></label>
          <label>Fuel<select value={fp.fuel} onChange={(e) => setFp({ ...fp, fuel: e.target.value })}>{["petrol", "diesel", "cng", "electric"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Price (₹ per litre, kg or kWh)<input type="number" step="0.01" min="0.01" value={fp.price_inr} onChange={(e) => setFp({ ...fp, price_inr: e.target.value })} required /></label></div><button className="btn solid">Save price</button></form>
        {!fuel ? <Skeleton height={160} /> : <DataTable rows={fuel.items.map((r: Row, i: number) => ({ ...r, id: i }))} cols={[{ key: "city", label: "City" }, { key: "fuel", label: "Fuel" }, { key: "price_inr", label: "Price", render: (r) => `${formatInr(r.price_inr)} per ${r.unit}` }, { key: "status", label: "Label", render: (r) => <Status value={r.status} /> }, { key: "updated_at", label: "Last set", render: (r) => when(r.updated_at) }]} />}</>}

      {tab === "integrations" && (!integ ? <Skeleton height={200} /> : <DataTable rows={Object.entries(integ.items as Record<string, Row>).map(([k, v], i) => ({ id: i, name: k.replace(/_/g, " "), ...v }))} cols={[{ key: "name", label: "Integration" }, { key: "status", label: "Status", render: (r) => <Status value={r.status} /> }, { key: "detail", label: "Notes" }]} />)}

      {tab === "public" && (!pub ? <Skeleton height={160} /> : <><p className="small muted">{pub.note}</p><DataTable rows={pub.items} emptyText="No public albums."
        cols={[{ key: "title", label: "Album" }, { key: "owner_name", label: "Owner" }, { key: "location_name", label: "Place" }, { key: "files", label: "Files" }, { key: "updated_at", label: "Updated", render: (r) => when(r.updated_at) },
          { key: "x", label: "", render: (r) => <button className="btn sm live" onClick={() => { if (confirm("Make this album private again?")) void areq(`/memories/${r.id}/unpublish`, { method: "POST" }).then(load).catch((e: Error) => setErr(e.message)); }}>Unpublish</button> }]} /></>)}
    </div>
  );
}

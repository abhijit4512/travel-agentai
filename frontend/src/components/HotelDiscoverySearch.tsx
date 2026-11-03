import { useEffect, useMemo, useState } from "react";
import { autocompleteDestination, searchHotels, type HotelSearchResult, type PlacePrediction } from "../services/hotelDiscovery";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export default function HotelDiscoverySearch() {
  const [destination, setDestination] = useState("Hyderabad");
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 2));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [radiusKm, setRadiusKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [selectedDestination, setSelectedDestination] = useState("Hyderabad");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (destination.trim().length < 2) {
        setPredictions([]);
        return;
      }
      try {
        const next = await autocompleteDestination(destination);
        setPredictions(next);
      } catch {
        setPredictions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [destination]);

  const hotelCount = useMemo(() => results.length, [results]);

  async function handleSearch(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await searchHotels({
        destination: selectedDestination || destination,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        rooms,
        radius_km: radiusKm,
      });
      setResults(response.hotels ?? []);
    } catch (exc) {
      setError((exc as Error).message || "Unable to fetch hotel results.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 30 }}>Hotel discovery and booking</h2>
        <p style={{ margin: "8px 0 0", color: "#4b5563" }}>
          Search by destination, city, locality, landmark or current map location. This module can call Google Places and Amadeus when the relevant keys are configured.
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div style={{ position: "relative", gridColumn: "span 2" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Destination</label>
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="e.g. Hitech City, Hyderabad"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }}
            />
            {predictions.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, maxHeight: 220, overflowY: "auto", zIndex: 20 }}>
                {predictions.map((item) => (
                  <button
                    key={item.place_id || item.id || item.description}
                    type="button"
                    onClick={() => {
                      setDestination(item.description);
                      setSelectedDestination(item.description);
                      setPredictions([]);
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer" }}
                  >
                    {item.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Check-in</label>
            <input type="date" value={checkIn} min={todayISO()} onChange={(event) => setCheckIn(event.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Check-out</label>
            <input type="date" value={checkOut} min={checkIn || todayISO()} onChange={(event) => setCheckOut(event.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Adults</label>
            <input type="number" min={1} max={10} value={adults} onChange={(event) => setAdults(Math.max(1, Number(event.target.value) || 1))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Children</label>
            <input type="number" min={0} max={8} value={children} onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Rooms</label>
            <input type="number" min={1} max={6} value={rooms} onChange={(event) => setRooms(Math.max(1, Number(event.target.value) || 1))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Radius</label>
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 }}>
              {[1, 3, 5, 10, 20].map((item) => <option key={item} value={item}>{item} km</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
          <button type="submit" disabled={loading} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "12px 22px", borderRadius: 10, cursor: loading ? "wait" : "pointer", fontWeight: 700 }}>
            {loading ? "Searching..." : "Search hotels"}
          </button>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            {hotelCount} result{hotelCount === 1 ? "" : "s"}
          </span>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: 18, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 24 }}>
        {results.map((hotel) => (
          <div key={`${hotel.provider}-${hotel.place_id || hotel.name}`} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ height: 170, background: "linear-gradient(135deg, #dbeafe, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e3a8a", fontSize: 24, fontWeight: 700 }}>
              {hotel.photo_urls && hotel.photo_urls.length > 0 ? (
                <img src={hotel.photo_urls[0]} alt={hotel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                hotel.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 20 }}>{hotel.name}</h3>
                  <div style={{ color: "#4b5563", fontSize: 13 }}>{hotel.address}</div>
                </div>
                {typeof hotel.rating === "number" && (
                  <div style={{ background: "#fff7ed", color: "#c2410c", fontWeight: 700, borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>
                    ★ {hotel.rating.toFixed(1)}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {hotel.distance_km !== undefined && <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>Distance: {hotel.distance_km.toFixed(1)} km</span>}
                {hotel.star_rating !== undefined && hotel.star_rating !== null && <span style={{ background: "#f5f3ff", color: "#6d28d9", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>{hotel.star_rating}★</span>}
                {hotel.free_wifi && <span style={{ background: "#ecfdf5", color: "#047857", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>Free Wi‑Fi</span>}
                {hotel.breakfast_included && <span style={{ background: "#fff7ed", color: "#b45309", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>Breakfast</span>}
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Price / night</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>
                    {hotel.price_per_night != null ? `₹${Math.round(hotel.price_per_night).toLocaleString("en-IN")}` : "TBD"}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280" }}>
                  {hotel.available ? "Available" : "Supplier check required"}
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "#4b5563" }}>
                {hotel.cancellation_policy || "Cancellation details depend on the supplier and must be confirmed before payment."}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button type="button" style={{ flex: 1, background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }} onClick={() => window.open(hotel.booking_redirect_url || "https://www.google.com/travel/hotels", "_blank", "noopener,noreferrer")}>
                  {hotel.bookable ? "Book now" : "Request supplier quote"}
                </button>
                <button type="button" style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + hotel.address)}`, "_blank", "noopener,noreferrer")}>
                  Map
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

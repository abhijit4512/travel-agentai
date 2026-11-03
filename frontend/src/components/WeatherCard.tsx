import type { Weather } from "../types";
import { Skeleton } from "./ui";

export default function WeatherCard({ weather }: { weather: Weather | null }) {
  return (
    <section className="card">
      <h2 style={{ fontSize: "1.4rem" }}>Weather outlook</h2>
      {!weather && <Skeleton height={80} />}
      {weather && weather.status !== "ok" && <p className="muted">{weather.message ?? "Weather is not available."}</p>}
      {weather?.status === "ok" && weather.forecast && (
        <>
          <ul className="weather">{weather.forecast.map((f) => (
            <li key={f.date}><span>{new Date(f.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</span>
              <span>{Math.round(f.min_c)}° to {Math.round(f.max_c)}°C</span><span>{f.rain_chance_percent ?? 0}% rain</span></li>))}</ul>
          <p className="xs muted">Live data from {weather.source}, retrieved {new Date(weather.retrieved_at!).toLocaleTimeString("en-IN")}. It covers the next 7 days, not necessarily your travel dates.</p>
        </>
      )}
    </section>
  );
}

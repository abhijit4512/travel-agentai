import type { Day } from "../types";

const KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;

/** Embedded route needs a Maps Embed key. Without one we show plain Google Maps links (free). */
export default function MapSection({ days, destName }: { days: Day[]; destName: string }) {
  const stops = days.flatMap((d) => d.slots).filter((s) => s.lat !== null && s.lng !== null);
  const coord = (s: { lat: number | null; lng: number | null }) => `${s.lat},${s.lng}`;
  let embed: string | null = null;
  if (KEY && stops.length >= 2) {
    const mid = stops.slice(1, -1).slice(0, 8).map(coord).join("|");
    embed = `https://www.google.com/maps/embed/v1/directions?key=${KEY}&origin=${coord(stops[0])}&destination=${coord(stops[stops.length - 1])}${mid ? `&waypoints=${mid}` : ""}&mode=driving`;
  } else if (KEY && stops.length === 1) embed = `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${coord(stops[0])}`;
  const dir = stops.length >= 2 ? `https://www.google.com/maps/dir/?api=1&origin=${coord(stops[0])}&destination=${coord(stops[stops.length - 1])}${stops.length > 2 ? `&waypoints=${stops.slice(1, -1).slice(0, 8).map(coord).join("%7C")}` : ""}` : null;
  return (
    <section className="card" aria-labelledby="map-h">
      <h2 id="map-h" style={{ fontSize: "1.4rem" }}>Map of stops in {destName}</h2>
      {embed ? <iframe title={`Route map for ${destName}`} className="map" src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        : <p className="muted small">Add VITE_GOOGLE_MAPS_EMBED_KEY in frontend/.env to show an embedded route. The links below open Google Maps.</p>}
      {dir && <p><a className="btn sm" href={dir} target="_blank" rel="noreferrer">Open route in Google Maps</a></p>}
      <ol className="stops">{stops.map((s, i) => <li key={i}><a href={`https://www.google.com/maps/search/?api=1&query=${coord(s)}`} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ol>
    </section>
  );
}

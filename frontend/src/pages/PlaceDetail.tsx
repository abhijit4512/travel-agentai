import { CalendarDays, Clock, MapPin, MessageCircle, PlusCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DestinationImage from "../components/DestinationImage";
import Gallery from "../components/Gallery";
import PlaceCard from "../components/PlaceCard";
import WeatherCard from "../components/WeatherCard";
import WishlistButton from "../components/WishlistButton";
import { ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { formatInr } from "../services/text";
import { tagLabel } from "../services/tags";
import type { PlaceDetail as Detail, Weather } from "../types";

const TABS = [["overview", "Overview"], ["gallery", "Photos"], ["visit", "Plan your visit"], ["nearby", "Nearby"], ["faq", "FAQ"]];

export default function PlaceDetail() {
  const { state = "", slug = "" } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setD(null); setErr(""); setWeather(null); window.scrollTo(0, 0);
    api.place(state, slug).then((x) => { setD(x); api.weather(x.id).then(setWeather).catch(() => setWeather({ status: "unavailable", message: "Weather could not be loaded." })); }).catch((e: Error) => setErr(e.message));
  }, [state, slug]);

  useSeo({
    title: d ? `${d.name}, ${d.state} travel guide` : "Destination", description: d ? `${d.overview} Best time: ${d.best_season}.` : undefined,
    jsonLd: d ? { "@context": "https://schema.org", "@type": "TouristAttraction", name: d.name, description: d.overview, geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
      address: { "@type": "PostalAddress", addressRegion: d.state, addressCountry: "IN" } } : undefined,
  });

  if (err) return <div className="container page"><ErrorBox message={err} /><p><Link className="btn" to="/explore">Back to Explore</Link></p></div>;
  if (!d) return <div className="container page"><Skeleton height={380} /><Skeleton height={200} /></div>;
  const b = d.budget_per_person_per_day_inr;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`;
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };

  return (
    <>
      <section className="dhero">
        <DestinationImage id={d.id} name={d.name} eager className="fill" />
        <div className="container dhero-copy">
          <p className="small" style={{ color: "#dbe9e2" }}><Link to="/states" style={{ color: "inherit" }}>States</Link> / <Link to={`/states/${d.state_slug}`} style={{ color: "inherit" }}>{d.state}</Link></p>
          <h1>{d.name}</h1>
          <p style={{ color: "#e8f1ec", maxWidth: "60ch" }}>{d.description}</p>
          <div className="row">
            <Link className="btn primary" to={`/plan?destination=${d.id}&days=3`}><PlusCircle size={18} /> Add to itinerary</Link>
            <Link className="btn light" to="/chat" state={{ prefill: `Tell me about visiting ${d.name} in ${d.state}: best time, how many days, and what to see.` }}><MessageCircle size={18} /> Ask AI about this place</Link>
            <WishlistButton id={d.id} name={d.name} className="icon-btn" />
            <button className="icon-btn" onClick={share} aria-label="Copy link to this page"><Share2 size={18} /></button>{copied && <span className="small" role="status">Link copied</span>}
          </div>
        </div>
      </section>
      <nav className="subnav" aria-label="On this page"><div className="container"><div className="tabs">{TABS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div></div></nav>

      <div className="container">
        <section id="overview" className="section">
          <div className="two-col"><div className="stack">
            <div><h2>Overview</h2><p>{d.overview}</p><ul className="chips">{(d.tags ?? d.interests).map((t) => <li key={t} className="chip">{tagLabel(t)}</li>)}</ul></div>
            <div><h3>Reasons to visit</h3><ul>{d.reasons_to_visit.map((r) => <li key={r}>{r}</li>)}</ul></div>
          </div>
          <aside className="facts">
            <div className="fact"><b><CalendarDays size={12} /> Best months</b>{d.best_months_text}</div>
            <div className="fact"><b><Clock size={12} /> Suggested stay</b>{d.suggested_duration}</div>
            <div className="fact"><b>Budget guide</b>{formatInr(b.low)} to {formatInr(b.high)} per person per day<br /><span className="xs muted">Illustrative, excludes travel to the place</span></div>
            <div className="fact"><b><MapPin size={12} /> Location</b><a href={gmaps} target="_blank" rel="noreferrer">Open in Google Maps</a></div>
          </aside></div>
        </section>
        <section id="gallery" className="section"><h2>Photos</h2><Gallery id={d.id} name={d.name} /></section>
        <section id="visit" className="section">
          <div className="two-col"><div><h2>Plan your visit</h2>
            <h3>Safety and practical guidance</h3><ul>{d.guidance.map((g) => <li key={g}>{g}</li>)}</ul>
                        <p className="notice warn small">This is general guidance by category, not verified facts about this specific site. Opening hours, entry rules, permits and prices must be confirmed from official sources.</p>
            <section className="card" aria-labelledby="official-h">
              <h3 id="official-h">Check official information</h3>
              <p className="small muted">Opening hours, entry fees, permits and bookings change. Confirm them here before you travel:</p>
              <ul>
                {d.official_links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer noopener">{l.label}</a>
                    {l.kind === "search" && <span className="muted xs"> (opens a web search)</span>}
                  </li>
                ))}
              </ul>
            </section>
            <h3>Getting there and getting around</h3><p>Use the map link above and check the nearest airport or railway station on official transport sites. Live schedules and fares are not shown here.</p></div>
            <WeatherCard weather={weather} /></div>
        </section>
        {d.nearby.length > 0 && <section id="nearby" className="section"><h2>Nearby attractions</h2><p className="small muted">Distances are straight-line estimates, not road distances.</p><div className="grid">{d.nearby.slice(0, 6).map((n) => <PlaceCard key={n.id} d={n} />)}</div></section>}
        <section id="faq" className="section"><h2>Frequently asked questions</h2>{d.faqs.map((f) => <details key={f.q} className="acc"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          <p className="small muted" style={{ marginTop: "1rem" }}>Source: {d.source}. {d.last_reviewed} Found a mistake? <Link to={`/contact?place=${d.id}`}>Report it</Link>.</p></section>
        {d.similar.length > 0 && <section className="section"><h2>Similar destinations</h2><div className="grid">{d.similar.map((n) => <PlaceCard key={n.id} d={n} />)}</div></section>}
      </div>
    </>
  );
}

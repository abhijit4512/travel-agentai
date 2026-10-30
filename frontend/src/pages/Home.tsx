import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DestinationImage from "../components/DestinationImage";
import Rail from "../components/Rail";
import TripSearch from "../components/TripSearch";
import { SectionHead } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { MONTHS } from "../services/text";
import { CATEGORY_TILES, TAG_META } from "../services/tags";
import type { Collection } from "../types";
import CollectionCard from "../components/CollectionCard";

const HERO = [["munnar", "Munnar, Kerala"], ["taj-mahal", "Taj Mahal, Agra"], ["jaipur", "Jaipur, Rajasthan"], ["goa", "Goa"], ["meghalaya", "Meghalaya"], ["leh", "Leh, Ladakh"]];
const ITINERARIES = [
  { id: "munnar", days: 5, title: "Kerala hills and tea", blurb: "Tea estates, waterfalls and misty viewpoints." },
  { id: "hampi", days: 3, title: "Hampi heritage weekend", blurb: "Temples and boulder landscapes at an easy pace." },
  { id: "goa", days: 4, title: "Goa beaches and old churches", blurb: "Sea, seafood and Portuguese heritage." },
  { id: "jim-corbett", days: 3, title: "Corbett forest escape", blurb: "A short wildlife break in the Himalayan foothills." },
  { id: "varanasi", days: 3, title: "Varanasi ghats and Sarnath", blurb: "Ganga aarti, old lanes and Buddhist heritage." },
];
const PROMPTS = ["Plan a Char Dham pilgrimage", "Suggest less crowded hill stations for December", "Find waterfalls near Bengaluru", "Plan a forest and wildlife trip for my family"];

export default function Home() {
  useSeo({ title: "Yatra AI | Discover the incredible India, your way", jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "Yatra AI", description: "AI travel planner for India" } });
  const [slide, setSlide] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const month = new Date().getMonth() + 1;
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => { if (reduce) return; const t = window.setInterval(() => setSlide((s) => (s + 1) % HERO.length), 7000); return () => window.clearInterval(t); }, [reduce]);
  useEffect(() => { api.collections().then(setCollections).catch(() => setCollections([])); }, []);

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <div className="hero-slides" aria-hidden="true">
          {HERO.map(([id, name], i) => (
            <div key={id} className={`hero-slide ${i === slide ? "on" : ""}`}>{(i === slide || i === (slide + 1) % HERO.length) && <DestinationImage id={id} name={name} eager={i === 0} />}</div>
          ))}
        </div>
        <div className="container hero-copy">
          <h1>Discover the Incredible India, Your Way.</h1>
          <p className="lead">Explore breathtaking destinations, hidden gems, sacred places, and unforgettable journeys with your personal AI travel companion.</p>
          <div className="row"><Link className="btn primary" to="/explore">Explore India <ArrowRight size={18} /></Link><Link className="btn light" to="/chat"><Sparkles size={18} /> Plan with AI</Link></div>
          <TripSearch />
        </div>
        <div className="hero-dots">{HERO.map(([id, name], i) => <button key={id} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Show ${name}`} />)}</div>
      </section>

      <Rail eyebrow="Start here" title="Popular destinations in India" blurb="Places travellers love, from the Himalaya to the backwaters." query={{ featured: true }} to="/explore" variant="mosaic" />

      <section className="section"><div className="container">
        <SectionHead title="Explore by travel category" blurb="Temples to tiger reserves: pick what moves you." />
        <div className="tiles">{CATEGORY_TILES.map((t) => { const Icon = TAG_META[t].icon; return <Link key={t} className="tile" to={`/explore?tag=${t}`}><Icon size={26} />{TAG_META[t].label}</Link>; })}</div>
      </div></section>

      <Rail eyebrow="Spiritual India" title="Top temples and pilgrimage destinations" blurb="Check the official site for darshan rules and timings before you go." query={{ tag: "temple" }} to="/explore?tag=temple" />
      <Rail eyebrow="Coast and sea" title="Beaches and islands" query={{ tag: "beach" }} to="/explore?tag=beach" />
      <Rail eyebrow="Cool escapes" title="Hill stations and mountain escapes" query={{ tag: "hills" }} to="/explore?tag=hills" />
      <Rail eyebrow="Wild India" title="Forests and wildlife sanctuaries" blurb="Safaris follow forest department rules, and sightings are never guaranteed." query={{ tag: "wildlife" }} to="/explore?tag=wildlife" />
      <Rail eyebrow="Timeless" title="Historical monuments and UNESCO heritage" query={{ tag: "heritage" }} to="/explore?tag=heritage" />

      <section className="section"><div className="container">
        <div className="band">
          <div><p className="eyebrow" style={{ color: "#f0a85a" }}>AI-recommended</p><h2>Not sure where to go? Just ask.</h2>
            <p>Describe the trip in your own words, by typing or speaking. The AI planner uses the same destination data you see on this site.</p>
            <Link className="btn primary" to="/chat"><Sparkles size={18} /> Open the AI planner</Link></div>
          <div className="chips">{PROMPTS.map((p) => <Link key={p} className="chip" to="/chat" state={{ prefill: p }}>{p}</Link>)}</div>
        </div>
      </div></section>

      <Rail eyebrow="Off the beaten path" title="Hidden gems of India" query={{ tag: "offbeat" }} to="/explore?tag=offbeat" />
      <Rail eyebrow="Short breaks" title="Weekend getaways" query={{ tag: "weekend" }} to="/weekend" />
      <Rail eyebrow="Together" title="Romantic and honeymoon destinations" query={{ tag: "honeymoon" }} to="/explore?tag=honeymoon" />
      <Rail eyebrow="All ages" title="Family-friendly destinations" query={{ tag: "family" }} to="/explore?tag=family" />
      <Rail eyebrow="Adrenaline" title="Adventure experiences" query={{ tag: "adventure" }} to="/explore?tag=adventure" />
      <Rail eyebrow="This month" title={`Best for travel in ${MONTHS[month - 1]}`} blurb="Based on general seasonal guidance in the seed data. Always check current weather and road conditions." query={{ month }} to={`/seasons?month=${month}`} />
      <Rail eyebrow="Living culture" title="Festivals and cultural experiences" note="Festival dates change every year. Check official tourism sources for this year's dates." query={{ tag: "culture" }} to="/explore?tag=culture" />

      <section className="section"><div className="container">
        <SectionHead title="Budget-friendly trips" blurb="Start from what you want to spend. Estimates are illustrative." />
        <div className="tiles">{[["10000", "Under ₹10,000"], ["25000", "Up to ₹25,000"], ["60000", "Up to ₹60,000"]].map(([b, l]) => <Link key={b} className="tile" to={`/plan?budget=${b}`}>{l}<span className="small muted">Plan within this budget</span></Link>)}</div>
      </div></section>

      <section className="section"><div className="container">
        <SectionHead eyebrow="Ready to go" title="Featured itineraries" blurb="Starting points you can edit, reorder and save." />
        <div className="grid">{ITINERARIES.map((it) => (
          <Link key={it.id} to={`/plan?destination=${it.id}&days=${it.days}`} className="pcard overlay" style={{ textDecoration: "none" }} aria-label={`${it.title}, ${it.days} days`}>
            <DestinationImage id={it.id} name={it.title} />
            <div className="pcard-body"><h3>{it.title}</h3><p className="meta">{it.days} days · {it.blurb}</p></div>
          </Link>))}</div>
      </div></section>

      <section className="section"><div className="container">
        <SectionHead eyebrow="Inspiration" title="Collections and travel guides" to="/collections" />
        <div className="grid">{collections.slice(0, 6).map((c) => <CollectionCard key={c.slug} c={c} />)}</div>
      </div></section>
    </>
  );
}

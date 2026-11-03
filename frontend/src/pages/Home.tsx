
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DestinationCard from "../components/DestinationCard";
import { Skeleton } from "../components/ui";
import { useSpeechRecognition } from "../hooks/useSpeech";
import { api } from "../services/api";
import type { Destination } from "../types";

const CATEGORIES = [
  {
    tag: "beach",
    label: "Beaches",
    description: "Coastal escapes, golden sands and quiet shores.",
    icon: "🌊",
    count: "Coastal escapes",
    className: "interest-beach",
  },
  {
    tag: "mountains",
    label: "Mountains",
    description: "Misty hill stations, scenic trails and cool air.",
    icon: "⛰️",
    count: "Highland hideaways",
    className: "interest-mountains",
  },
  {
    tag: "heritage",
    label: "Heritage",
    description: "Forts, palaces, ancient cities and timeless stories.",
    icon: "🏛️",
    count: "Stories of India",
    className: "interest-heritage",
  },
  {
    tag: "wildlife",
    label: "Wildlife",
    description: "Discover forests, sanctuaries and India's wild side.",
    icon: "🐘",
    count: "Into the wild",
    className: "interest-wildlife",
  },
  {
    tag: "spiritual",
    label: "Spiritual",
    description: "Sacred temples, peaceful retreats and pilgrimages.",
    icon: "🪷",
    count: "Soulful journeys",
    className: "interest-spiritual",
  },
  {
    tag: "adventure",
    label: "Adventure",
    description: "Thrilling trails, outdoor escapes and new experiences.",
    icon: "🧭",
    count: "Find your thrill",
    className: "interest-adventure",
  },
  {
    tag: "food",
    label: "Food tourism",
    description: "Regional flavours, local favourites and food trails.",
    icon: "🍲",
    count: "Taste the regions",
    className: "interest-food",
  },
];

const WEEKEND = ["lonavala", "coorg", "hyderabad", "araku-valley"];

const PREFS = [
  "nature",
  "waterfalls",
  "hills",
  "heritage",
  "beach",
  "food",
  "adventure",
  "spiritual",
  "less-crowded",
];

export default function Home() {
  const nav = useNavigate();

  const [all, setAll] = useState<Destination[] | null>(null);
  const [text, setText] = useState("");

  const [form, setForm] = useState({
    origin: "Hyderabad",
    destination: "munnar",
    start: "",
    end: "",
    adults: 2,
    budget: "25000",
  });

  const [prefs, setPrefs] = useState<string[]>(["nature"]);

  const onVoice = useCallback((t: string) => setText(t), []);
  const voice = useSpeechRecognition("en-IN", onVoice);

  useEffect(() => {
    api.allDestinations()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const days =
    form.start && form.end
      ? Math.min(
          14,
          Math.max(
            1,
            Math.round(
              (+new Date(form.end) - +new Date(form.start)) / 864e5
            ) + 1
          )
        )
      : 4;

  function askAi(e: FormEvent) {
    e.preventDefault();

    if (text.trim()) {
      nav("/chat", {
        state: { prefill: text.trim() },
      });
    }
  }

  function plan(e: FormEvent) {
    e.preventDefault();

    const q = new URLSearchParams({
      destination: form.destination,
      origin: form.origin,
      days: String(days),
      adults: String(form.adults),
      budget: form.budget,
    });

    prefs.forEach((p) => q.append("interest", p));

    nav(`/plan?${q}`);
  }

  const togglePref = (p: string) => {
    setPrefs((cur) =>
      cur.includes(p)
        ? cur.filter((x) => x !== p)
        : [...cur, p]
    );
  };

  return (
    <>
      {/* ==========================================
          HERO SECTION
      ========================================== */}

      <section
        className="hero yatra-hero"
        aria-labelledby="yatra-hero-title"
      >
        <div className="hero-bg yatra-hero-bg">
          <img
            src="/images/yatra-hero.jpg"
            alt="Golden-hour landscape of Hampi, Karnataka, with rocky hills and a traveler overlooking the valley"
          />
        </div>

        <div className="hero-copy yatra-hero-copy">
          <div className="yatra-hero-content">

            <p className="yatra-eyebrow">
              DISCOVER THE INCREDIBLE
            </p>

            <h1 id="yatra-hero-title">
              Your AI travel
              <br className="desktop-break" />
              companion for
              <span> incredible India</span>
            </h1>

            <p className="yatra-hero-description">
              Tell it where you are starting, what you love and
              what you can spend. Get a day-by-day plan with a
              budget in rupees, spoken aloud if you like.
            </p>

            <form
              onSubmit={askAi}
              className="ask yatra-search"
              role="search"
            >
              <label htmlFor="nl" className="sr">
                Describe your trip
              </label>

              <span
                className="yatra-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                id="nl"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="5 days from Hyderabad to Kerala for two, Rs 25,000, waterfalls and local food"
              />

              <div className="yatra-actions">

                <button
                  type="button"
                  className={`btn yatra-speak ${
                    voice.listening ? "live" : ""
                  }`}
                  onClick={
                    voice.listening
                      ? voice.stop
                      : voice.start
                  }
                  aria-pressed={voice.listening}
                  aria-label={
                    voice.listening
                      ? "Stop listening"
                      : "Speak your trip request"
                  }
                >
                  <span aria-hidden="true">🎙</span>
                  {voice.listening ? "Listening..." : "Speak"}
                </button>

                <button
                  className="btn primary yatra-ask"
                  type="submit"
                >
                  <span aria-hidden="true">✦</span>
                  Ask AI
                </button>

              </div>
            </form>

            {voice.error && (
              <p className="notice warn" role="status">
                {voice.error}
              </p>
            )}

            <div
              className="yatra-features"
              aria-label="YatraAI features"
            >
              <span>
                <i aria-hidden="true">▣</i>
                Personalized itineraries
              </span>

              <span>
                <i aria-hidden="true">₹</i>
                Budget planning
              </span>

              <span>
                <i aria-hidden="true">⌖</i>
                India-wide coverage
              </span>

              <span>
                <i aria-hidden="true">✧</i>
                AI powered
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          PLAN WITH DETAILS SECTION
      ========================================== */}

      <section className="page">

        <section
          className="trip-planner-section"
          aria-labelledby="trip-planner-title"
        >
          <div className="trip-planner-inner">

            <div className="trip-planner-heading">

              <span className="trip-planner-kicker">
                YOUR JOURNEY STARTS HERE
              </span>

              <h2 id="trip-planner-title">
                Plan with <em>details</em>
              </h2>

              <p>
                Share a few details and let YatraAI create
                a trip that feels made for you.
              </p>

            </div>

            <form
              className="card plan-form trip-planner-form"
              onSubmit={plan}
            >

              {/* Starting city */}

              <label>
                Starting city

                <input
                  value={form.origin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      origin: e.target.value,
                    })
                  }
                  required
                  minLength={2}
                  placeholder="Enter starting city"
                />
              </label>

              {/* Destination */}

              <label>
                Destination

                <select
                  value={form.destination}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      destination: e.target.value,
                    })
                  }
                  required
                >
                  {(all ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}, {d.state}
                    </option>
                  ))}
                </select>
              </label>

              {/* Start date */}

              <label>
                Start date

                <input
                  type="date"
                  value={form.start}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      start: e.target.value,
                      end:
                        form.end && e.target.value > form.end
                          ? ""
                          : form.end,
                    })
                  }
                />
              </label>

              {/* End date */}

              <label>
                End date

                <input
                  type="date"
                  value={form.end}
                  min={form.start || undefined}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      end: e.target.value,
                    })
                  }
                />
              </label>

              {/* Travellers */}

              <label>
                Travellers

                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.adults}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      adults: Math.max(
                        1,
                        Math.min(20, Number(e.target.value) || 1)
                      ),
                    })
                  }
                />
              </label>

              {/* Budget */}

              <label>
                Total budget

                <select
                  value={form.budget}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      budget: e.target.value,
                    })
                  }
                >
                  {[
                    "10000",
                    "15000",
                    "25000",
                    "40000",
                    "60000",
                    "100000",
                  ].map((b) => (
                    <option key={b} value={b}>
                      Up to ₹
                      {Number(b).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </label>

              {/* Preferences */}

              <fieldset>
                <legend>Preferences</legend>

                <div className="chips">
                  {PREFS.map((p) => (
                    <label
                      key={p}
                      className={`chip-toggle ${
                        prefs.includes(p) ? "on" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={prefs.includes(p)}
                        onChange={() => togglePref(p)}
                      />

                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Submit */}

              <button
                className="btn primary trip-submit"
                type="submit"
              >
                <span>✦</span>

                Plan my trip (
                {days} {days === 1 ? "day" : "days"}
                )

                <span aria-hidden="true">→</span>
              </button>

            </form>
          </div>
        </section>

        {/* ==========================================
            POPULAR DESTINATIONS
        ========================================== */}

        <section
  className="popular-destinations-section"
  aria-labelledby="popular-destinations-title"
>
  <div className="popular-destinations-inner">

    <div className="popular-destinations-heading">
      <span>EXPLORE INCREDIBLE INDIA</span>

      <h2 id="popular-destinations-title">
        Popular <em>destinations</em>
      </h2>

      <p>
        Discover India's most beautiful places and find
        your next unforgettable journey.
      </p>
    </div>

    <div className="grid">
      {all === null
        ? [1, 2, 3].map((i) => (
            <Skeleton key={i} height={320} />
          ))
        : all.slice(0, 6).map((d) => (
            <DestinationCard key={d.id} d={d} />
          ))}
    </div>

  </div>
</section>
        {/* ==========================================
            WEEKEND TRIPS
        ========================================== */}

        <section
  className="weekend-trips-section"
  aria-labelledby="weekend-trips-title"
>
  <div className="weekend-trips-inner">

    <div className="weekend-trips-heading">
      <span>YOUR NEXT ESCAPE</span>

      <h2 id="weekend-trips-title">
        Weekend <em>getaways</em>
      </h2>

      <p>
        Short on time? Discover beautiful destinations
        perfect for a refreshing weekend away.
      </p>
    </div>

    <div className="grid">
      {(all ?? [])
        .filter((d) => WEEKEND.includes(d.id))
        .map((d) => (
          <DestinationCard key={d.id} d={d} />
        ))}
    </div>

  </div>
</section>
        {/* ==========================================
            BROWSE BY INTEREST
        ========================================== */}

        <section className="browse-interest" aria-labelledby="browse-interest-title">
          <div className="browse-interest-heading">
            <div>
              <span className="browse-interest-kicker">FIND YOUR KIND OF INDIA</span>
              <h2 id="browse-interest-title">
                Browse by <em>interest</em>
              </h2>
              <p>From slow coastal mornings to unforgettable mountain adventures, choose what moves you.</p>
            </div>
            <span className="browse-interest-note" aria-hidden="true">
              <span>✦</span> Curated for every traveller
            </span>
          </div>

          <div className="interest-card-grid">
            {CATEGORIES.map((category, index) => (
              <Link
                key={category.tag}
                to={`/explore?interest=${encodeURIComponent(category.tag)}`}
                className={`interest-card ${category.className}`}
                aria-label={`Explore ${category.label}: ${category.description}`}
              >
                <span className="interest-card-glow" aria-hidden="true" />
                <span className="interest-card-top">
                  <span className="interest-card-count">{category.count}</span>
                  <span className="interest-card-arrow" aria-hidden="true">↗</span>
                </span>
                <span className="interest-card-icon" aria-hidden="true">{category.icon}</span>
                <span className="interest-card-copy">
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

      </section>
    </>
  );
}

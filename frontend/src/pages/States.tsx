
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import type { StateInfo } from "../types";
import DestinationImage from "../components/DestinationImage";

type FeaturedPlace = {
  place: string;
  imageTags: string;
  lock: number;
};

// Featured attractions for each Indian state and union territory.
const FEATURED: Record<string, FeaturedPlace> = {
  "Andhra Pradesh": { place: "Tirumala Tirupati", imageTags: "tirupati,temple,india", lock: 101 },
  "Arunachal Pradesh": { place: "Tawang Monastery", imageTags: "tawang,monastery,arunachal", lock: 102 },
  Assam: { place: "Kaziranga National Park", imageTags: "kaziranga,rhinoceros,assam", lock: 103 },
  Bihar: { place: "Mahabodhi Temple", imageTags: "mahabodhi,bodhgaya,temple", lock: 104 },
  Chhattisgarh: { place: "Chitrakote Falls", imageTags: "chitrakote,waterfall,india", lock: 105 },
  Goa: { place: "Baga Beach", imageTags: "goa,baga,beach", lock: 106 },
  Gujarat: { place: "Statue of Unity", imageTags: "statueofunity,gujarat", lock: 107 },
  Haryana: { place: "Kurukshetra", imageTags: "kurukshetra,temple,india", lock: 108 },
  "Himachal Pradesh": { place: "Shimla", imageTags: "shimla,himalaya,mountains", lock: 109 },
  Jharkhand: { place: "Netarhat", imageTags: "netarhat,jharkhand,hills", lock: 110 },
  Karnataka: { place: "Hampi", imageTags: "hampi,karnataka,temple", lock: 111 },
  Kerala: { place: "Alleppey Backwaters", imageTags: "alleppey,kerala,backwaters", lock: 112 },
  "Madhya Pradesh": { place: "Khajuraho Temples", imageTags: "khajuraho,temple,india", lock: 113 },
  Maharashtra: { place: "Ellora Caves", imageTags: "Ellora Caves,india", lock: 114 },
  Manipur: { place: "Loktak Lake", imageTags: "loktak,lake,manipur", lock: 115 },
  Meghalaya: { place: "Living Root Bridges", imageTags: "livingrootbridge,meghalaya", lock: 116 },
  Mizoram: { place: "Reiek Tlang", imageTags: "reiek,mizoram,mountains", lock: 117 },
  Nagaland: { place: "Kohima War Cemetery", imageTags: "kohima,nagaland", lock: 118 },
  Odisha: { place: "Konark Sun Temple", imageTags: "konark,suntemple,odisha", lock: 119 },
  Punjab: { place: "Golden Temple", imageTags: "goldentemple,amritsar", lock: 120 },
  Rajasthan: { place: "Amer Fort", imageTags: "amerfort,jaipur,rajasthan", lock: 121 },
  Sikkim: { place: "Tsomgo Lake", imageTags: "tsomgolake,sikkim", lock: 122 },
  "Tamil Nadu": { place: "Meenakshi Temple", imageTags: "meenakshitemple,madurai", lock: 123 },
  Telangana: { place: "Golconda Fort", imageTags: "golcondafort,hyderabad", lock: 124 },
  Tripura: { place: "Ujjayanta Palace", imageTags: "ujjayantapalace,tripura", lock: 125 },
  "Uttar Pradesh": { place: "Taj Mahal", imageTags: "tajmahal,agra", lock: 126 },
  Uttarakhand: { place: "Kedarnath Temple", imageTags: "kedarnath,uttarakhand", lock: 127 },
  "West Bengal": { place: "Victoria Memorial", imageTags: "victoriamemorial,kolkata", lock: 128 },

  "Andaman and Nicobar Islands": { place: "Radhanagar Beach", imageTags: "radhanagarbeach,andaman", lock: 129 },
  Chandigarh: { place: "Rock Garden", imageTags: "rockgarden,chandigarh", lock: 130 },
  "Dadra and Nagar Haveli and Daman and Diu": { place: "Diu Beach", imageTags: "diu,beach,india", lock: 131 },
  Delhi: { place: "India Gate", imageTags: "indiagate,newdelhi", lock: 132 },
  "Jammu and Kashmir": { place: "Dal Lake", imageTags: "dallake,srinagar,kashmir", lock: 133 },
  Ladakh: { place: "Pangong Lake", imageTags: "pangonglake,ladakh", lock: 134 },
  Lakshadweep: { place: "Agatti Island", imageTags: "agattiisland,lakshadweep,beach", lock: 135 },
  Puducherry: { place: "Promenade Beach", imageTags: "promenadebeach,puducherry", lock: 136 },
};

function StateCard({ state }: { state: StateInfo }) {
  const featured = FEATURED[state.name] ?? {
    place: `Explore ${state.name}`,
    imageTags: `${state.name.toLowerCase().replace(/\s+/g, ",")},india,travel`,
    lock: 199,
  };

  return (
    <Link
      className="statecard state-feature-card"
      to={`/states/${state.slug}`}
      aria-label={`Explore ${state.name}, featuring ${featured.place}`}
    >
      <div className="statecard-photo">
  <DestinationImage
    id={`state-feature-${state.slug}`}
    name={featured.place}
    className="statecard-destination-image"
  />
</div>

      <div className="statecard-content">
        <strong>{state.name}</strong>
        <span className="statecard-landmark">{featured.place}</span>
        <span className="statecard-count">
          {state.count} destinations
        </span>
      </div>

      <ArrowRight className="statecard-arrow" size={19} />
    </Link>
  );
}

export default function States() {
  useSeo({ title: "Explore India by state and union territory" });

  const [states, setStates] = useState<StateInfo[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.states()
      .then(setStates)
      .catch((e: Error) => setErr(e.message));
  }, []);

  const stateItems = states?.filter((s) => s.type === "state") ?? [];
  const unionTerritories = states?.filter((s) => s.type === "ut") ?? [];

  return (
    <main className="container page states-page">

      <section className="states-hero">
        <div className="states-hero-content">
          <span className="states-eyebrow">DISCOVER INDIA</span>

          <h1>
            Every state and <em>union territory</em>
          </h1>

          <p>
            Pick a place to discover its iconic temples, forests,
            beaches, hills and unforgettable heritage.
          </p>
        </div>
      </section>

      {err && <ErrorBox message={err} />}

      {!states && !err && (
        <div className="states-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} height={90} />
          ))}
        </div>
      )}

      {states && (
        <>
          <section className="states-section">
            <div className="states-section-heading">
              <div>
                <span className="states-flag">🇮🇳</span>
                <h2>{stateItems.length} states</h2>
              </div>
              <p>Explore the iconic attractions of every state</p>
            </div>

            <div className="states-grid">
              {stateItems.map((s) => (
                <StateCard key={s.slug} state={s} />
              ))}
            </div>
          </section>

          <section className="states-section states-ut-section">
            <div className="states-section-heading">
              <div>
                <span className="states-flag">🇮🇳</span>
                <h2>{unionTerritories.length} union territories</h2>
              </div>
              <p>Discover India's beautiful union territories</p>
            </div>

            <div className="states-grid">
              {unionTerritories.map((s) => (
                <StateCard key={s.slug} state={s} />
              ))}
            </div>
          </section>
        </>
      )}

    </main>
  );
}

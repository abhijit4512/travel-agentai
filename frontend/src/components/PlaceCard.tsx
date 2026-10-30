import { Link } from "react-router-dom";
import { formatInr } from "../services/text";
import { placeLink, tagLabel } from "../services/tags";
import type { Destination } from "../types";
import DestinationImage from "./DestinationImage";
import WishlistButton from "./WishlistButton";

/** One destination card. `variant` changes the layout so sections do not all look identical. */
export default function PlaceCard({ d, variant = "default" }: { d: Destination; variant?: "default" | "big" | "overlay" }) {
  const b = d.budget_per_person_per_day_inr;
  const tags = d.tags ?? d.interests;
  return (
    <article className={`pcard ${variant === "default" ? "" : variant}`}>
      <WishlistButton id={d.id} name={d.name} />
      <DestinationImage id={d.id} name={d.name} />
      <div className="pcard-body">
        <h3><Link to={placeLink(d)}>{d.name}</Link></h3>
        <p className="meta">{d.state}{d.distance_km ? ` · about ${d.distance_km} km (straight line)` : ""}</p>
        {variant !== "overlay" && <p className="small muted">{d.description}</p>}
        {variant === "default" && <ul className="chips" aria-label="Categories">{tags.slice(0, 3).map((t) => <li key={t} className="chip">{tagLabel(t)}</li>)}</ul>}
        {variant !== "overlay" && <p className="price">From about {formatInr(b.low)} per person per day <span className="muted xs">(illustrative)</span></p>}
      </div>
    </article>
  );
}

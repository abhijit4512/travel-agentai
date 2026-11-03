import { Link } from "react-router-dom";
import { formatInr } from "../services/text";
import type { Destination } from "../types";
import DestinationImage from "./DestinationImage";

export default function DestinationCard({ d }: { d: Destination }) {
  const b = d.budget_per_person_per_day_inr;
  return (
    <article className="card dest-card">
      <DestinationImage id={d.id} name={d.name} />
      <div className="card-body">
        <h3>{d.name}</h3>
        <p className="muted">{d.state}</p>
        <p>{d.description}</p>
        <ul className="chips" aria-label="Suited for">{d.interests.slice(0, 4).map((i) => <li key={i}>{i}</li>)}</ul>
        <p className="muted small">
          Stay and food about {formatInr(b.low)} to {formatInr(b.high)} per person per day (illustrative). Best: {d.best_season}.
        </p>
        <Link className="btn" to={`/plan?destination=${d.id}`}>Plan this trip</Link>
      </div>
    </article>
  );
}

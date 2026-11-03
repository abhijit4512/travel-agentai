import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { Destination } from "../types";
import DestinationImage from "./DestinationImage";

/** Small destination card shown inside chat replies. Image comes from the photo service, not from the AI text. */
export default function MiniDestination({ id }: { id: string }) {
  const [d, setD] = useState<Destination | null>(null);
  useEffect(() => { api.allDestinations().then((all) => setD(all.find((x) => x.id === id) ?? null)).catch(() => setD(null)); }, [id]);
  if (!d) return null;
  return (
    <Link to={`/plan?destination=${d.id}`} className="mini card" aria-label={`Plan a trip to ${d.name}`}>
      <DestinationImage id={d.id} name={d.name} />
      <div className="card-body"><strong>{d.name}</strong><span className="muted small">{d.state}</span></div>
    </Link>
  );
}

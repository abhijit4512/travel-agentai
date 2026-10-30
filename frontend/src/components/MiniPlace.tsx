import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { placeLink } from "../services/tags";
import type { Destination } from "../types";
import DestinationImage from "./DestinationImage";

/** Small destination card shown inside chat replies. The photo comes from the image service, not from the AI text. */
export default function MiniPlace({ id }: { id: string }) {
  const [d, setD] = useState<Destination | null>(null);
  useEffect(() => { api.placeById(id).then(setD).catch(() => setD(null)); }, [id]);
  if (!d) return null;
  return (
    <Link to={placeLink(d)} className="mini card" aria-label={`Open ${d.name}`}>
      <DestinationImage id={d.id} name={d.name} />
      <div className="mb"><strong>{d.name}</strong><span className="muted xs">{d.state}</span></div>
    </Link>
  );
}

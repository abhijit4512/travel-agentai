
import { Link } from "react-router-dom";
import type { Collection } from "../types";
import DestinationImage from "./DestinationImage";

/**
 * Collection card with the image of its featured destination.
 * Uses the collection cover ID and destination name for photo lookup.
 */
export default function CollectionCard({ c }: { c: Collection }) {
  const imageName = c.blurb?.trim() || c.title;

  return (
    <Link to={`/collections/${c.slug}`} className="coll">
      {c.cover && (
        <DestinationImage
          id={c.cover}
          name={imageName}
          className="coll-img"
        />
      )}

      <div className="coll-text">
        <h3>{c.title}</h3>
        <p>{c.blurb}</p>
      </div>
    </Link>
  );
}

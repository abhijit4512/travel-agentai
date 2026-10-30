import { Link } from "react-router-dom";
import type { Collection } from "../types";
import DestinationImage from "./DestinationImage";

/** A collection tile with a real photo behind the text. Falls back to the colored gradient if no photo is found. */
export default function CollectionCard({ c }: { c: Collection }) {
  return (
    <Link to={`/collections/${c.slug}`} className="coll">
      {c.cover && <DestinationImage id={c.cover} name={c.title} className="coll-img" />}
      <div className="coll-text">
        <h3>{c.title}</h3>
        <p>{c.blurb}</p>
      </div>
    </Link>
  );
}
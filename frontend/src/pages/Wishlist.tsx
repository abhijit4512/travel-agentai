import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import { useWishlist } from "../services/wishlist";
import type { Destination } from "../types";

export default function Wishlist() {
  useSeo({ title: "Your wishlist" });
  const { ids } = useWishlist();
  const [items, setItems] = useState<Destination[] | null>(null);
  useEffect(() => { api.wishlist().then((r) => setItems(r.items)).catch(() => setItems([])); }, [ids.size]);
  return (
    <div className="container page"><div className="page-head"><h1>Wishlist</h1><p className="muted">Places you saved. {ids.size > 1 && <Link to={`/compare?ids=${[...ids].slice(0, 3).join(",")}`}>Compare your first three</Link>}</p></div>
      {!items ? <Skeleton height={300} /> : items.length === 0 ? <EmptyState title="Nothing saved yet"><p>Tap the heart on any destination.</p><Link className="btn primary" to="/explore">Explore India</Link></EmptyState> :
        <div className="grid">{items.map((d) => <PlaceCard key={d.id} d={d} />)}</div>}</div>
  );
}

import { Heart } from "lucide-react";
import { useWishlist } from "../services/wishlist";

export default function WishlistButton({ id, name, className = "icon-btn heart" }: { id: string; name: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const on = has(id);
  return (
    <button className={className} aria-pressed={on} aria-label={on ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(id); }}>
      <Heart size={20} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

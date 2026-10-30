import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

interface WishValue { ids: Set<string>; toggle: (id: string) => Promise<void>; has: (id: string) => boolean }
const Ctx = createContext<WishValue | null>(null);

/** Favourite destinations. Works for guests (per browser) and for logged-in accounts. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => { api.wishlist().then((r) => setIds(new Set(r.ids))).catch(() => setIds(new Set())); }, [user?.id]);

  const toggle = useCallback(async (id: string) => {
    const had = ids.has(id);
    setIds((cur) => { const n = new Set(cur); had ? n.delete(id) : n.add(id); return n; });       // optimistic update
    try { had ? await api.wishlistRemove(id) : await api.wishlistAdd(id); }
    catch { setIds((cur) => { const n = new Set(cur); had ? n.add(id) : n.delete(id); return n; }); }  // undo on failure
  }, [ids]);
  return <Ctx.Provider value={{ ids, toggle, has: (id) => ids.has(id) }}>{children}</Ctx.Provider>;
}
export function useWishlist(): WishValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist must be used inside WishlistProvider");
  return c;
}

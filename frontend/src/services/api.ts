import type {
  AuthResponse, ChatResponse, Collection, Destination, Paged, PhotosResponse, Plan, PlaceDetail, Preferences,
  StateInfo, TagInfo, TripRecord, User, Weather,
} from "../types";

const SESSION_KEY = "yatra_session_id";
const TOKEN_KEY = "yatra_token";

/** A random guest id stored in this browser. It separates one visitor's data from another's when not logged in. */
export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return "guest" + Math.random().toString(36).slice(2, 12); }
}
export function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json", "X-Session-Id": getSessionId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}) for ${path}.`;
    try { const body = await res.json(); message = body?.error?.message ?? message; } catch { /* not JSON */ }
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      setToken(null);                                   // expired or invalid token: log out locally
      window.dispatchEvent(new Event("yatra-logout"));
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface PlanParams {
  destination_id: string; days: number; adults: number; children: number; origin_city: string;
  budget_inr: number | null; style: string; transport_mode: string; interests: string[]; excluded_activities: string[];
  pace?: string; start_date?: string | null; accessibility_needs?: string; special_requirements?: string;
}
export interface PlaceQuery { q?: string; state?: string; tag?: string; month?: number | null; ids?: string[]; featured?: boolean; sort?: string; page?: number; page_size?: number }

function qs(o: Record<string, unknown>): string {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v)); });
  return p.toString();
}

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key) as Promise<T>;
}

export const api = {
  health: () => request<{ agent_mode: string; photos_provider: string }>("/health"),
  places: (q: PlaceQuery = {}) => request<Paged<Destination>>(`/places?${qs({ ...q, ids: q.ids?.join(",") })}`),
  placesCached: (q: PlaceQuery) => cached(`places:${JSON.stringify(q)}`, () => api.places(q)),
  place: (stateSlug: string, slug: string) => request<PlaceDetail>(`/places/${stateSlug}/${slug}`),
  placeById: (id: string) => cached(`place:${id}`, () => api.places({ ids: [id], page_size: 1 }).then((r) => r.items[0] ?? null)),
  suggest: (q: string) => request<{ suggestions: { id: string; name: string; state: string; state_slug: string; slug: string }[] }>(`/places/suggest?${qs({ q })}`),
  states: () => cached("states", () => request<{ states: StateInfo[] }>("/states").then((r) => r.states)),
  tags: () => cached("tags", () => request<{ tags: TagInfo[] }>("/tags").then((r) => r.tags)),
  weekend: (origin: string, maxKm: number, tag = "") => request<{ items: Destination[]; note: string }>(`/weekend?${qs({ origin, max_km: maxKm, tag })}`),
  collections: () => cached("collections", () => request<{ collections: Collection[] }>("/collections").then((r) => r.collections)),
  collection: (slug: string, page = 1) => request<Paged<Destination> & { collection: Collection }>(`/collections/${slug}?page=${page}`),
  photos: (id: string, limit = 1) => cached(`photos:${id}:${limit}`, () => request<PhotosResponse>(`/destinations/${id}/photos?limit=${limit}`)),
  weather: (id: string, days = 7) => request<Weather>(`/destinations/${id}/weather?days=${days}`),
  chat: (message: string, language: string) =>
    request<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ message, language, session_id: getSessionId() }) }),
  plan: (p: PlanParams) => request<Plan>("/trips/plan", { method: "POST", body: JSON.stringify(p) }),
  budget: (b: Record<string, unknown>) => request<Plan["budget"]>("/budget/estimate", { method: "POST", body: JSON.stringify(b) }),
  saveTrip: (title: string, plan: Plan) => request<TripRecord>("/trips", { method: "POST", body: JSON.stringify({ title, plan }) }),
  trips: () => request<TripRecord[]>("/trips"),
  trip: (id: number) => request<TripRecord>(`/trips/${id}`),
  deleteTrip: (id: number) => request<void>(`/trips/${id}`, { method: "DELETE" }),
  shareTrip: (id: number) => request<{ token: string; path: string }>(`/trips/${id}/share`, { method: "POST" }),
  unshareTrip: (id: number) => request<void>(`/trips/${id}/share`, { method: "DELETE" }),
  shared: (token: string) => request<{ title: string; created_at: string; plan: Plan }>(`/share/${token}`),
  wishlist: () => request<{ ids: string[]; items: Destination[] }>("/wishlist"),
  wishlistAdd: (place_id: string) => request<unknown>("/wishlist", { method: "POST", body: JSON.stringify({ place_id }) }),
  wishlistRemove: (id: string) => request<void>(`/wishlist/${id}`, { method: "DELETE" }),
  preferences: () => request<Preferences>("/me/preferences"),
  savePreferences: (p: Preferences) => request<Preferences>("/me/preferences", { method: "PUT", body: JSON.stringify(p) }),
  feedback: (b: { kind: string; message: string; place_id?: string; email?: string }) =>
    request<unknown>("/feedback", { method: "POST", body: JSON.stringify(b) }),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<User>("/auth/me"),
};

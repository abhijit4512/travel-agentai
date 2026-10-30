export interface Destination {
  id: string; slug?: string; state_slug?: string; name: string; state: string; description: string;
  interests: string[]; tags?: string[]; best_season: string; best_months?: number[]; lat: number; lng: number;
  featured?: boolean; source?: string; distance_km?: number;
  budget_per_person_per_day_inr: { low: number; high: number; quality: string };
}
export interface Paged<T> { items: T[]; total: number; page: number; page_size: number; pages: number }
export interface PlaceDetail extends Destination {
  overview: string; reasons_to_visit: string[]; best_months_text: string; suggested_duration: string;
  guidance: string[]; faqs: { q: string; a: string }[]; nearby: Destination[]; similar: Destination[]; last_reviewed: string;
  official_links: { label: string; url: string; kind: "official" | "search" }[];
}
export interface StateInfo { name: string; slug: string; type: "state" | "ut"; count: number }
export interface TagInfo { id: string; label: string; count: number }
export interface Collection { slug: string; title: string; blurb: string; cover?: string }
export interface Photo {
  url: string; alt: string; attribution: string; attribution_uri: string; provider: string;
  license?: string; license_uri?: string;
}
export interface PhotosResponse { status: string; photos: Photo[]; message?: string }
export interface Slot {
  slot: string; title: string; kind: "attraction" | "food" | "free"; duration_hours: number; fee_inr: number;
  lat: number | null; lng: number | null; notes: string; transport_from_previous: string; attraction?: boolean;
}
export interface Day { day: number; title: string; slots: Slot[] }
export interface Budget {
  currency: string; days: number; nights: number; rooms: number; style: string;
  items: Record<string, number>; total_inr: number; per_person_inr: number;
  data_quality: string; notes: string[]; requested_budget_inr: number | null;
  within_budget: boolean | null; suggestions: string[];
}
export interface PlanRequest {
  origin_city: string; days: number; adults: number; children: number; budget_inr: number | null;
  style: "budget" | "standard" | "comfort"; transport_mode: "train" | "bus" | "flight";
  interests: string[]; excluded: string[]; pace?: "relaxed" | "balanced" | "packed"; start_date?: string | null;
  accessibility_needs?: string; special_requirements?: string;
}
export interface Plan {
  destination: Destination; itinerary: { days: Day[]; tips: string[]; data_quality: string };
  budget: Budget; alternatives: Destination[]; tips: string[]; food: string[];
  stay?: { typical_room_per_night_inr: number; rooms: number; note: string };
  request: PlanRequest; generated_at: string;
}
export interface ChatResponse {
  reply: string; session_id: string; mode: "adk" | "demo"; destination_ids: string[];
  follow_ups: string[]; notice: string | null;
}
export interface TripRecord { id: number; title: string; created_at: string; plan: Plan }
export interface Weather {
  status: string; message?: string; source?: string; retrieved_at?: string;
  forecast?: { date: string; max_c: number; min_c: number; rain_chance_percent: number | null }[];
}
export interface User { id: number; name: string; email: string }
export interface AuthResponse { token: string; user: User }
export interface Preferences { home_city: string; interests: string[]; budget_style: "budget" | "standard" | "comfort"; pace: "relaxed" | "balanced" | "packed" }

export type HotelSearchRequest = {
  destination: string;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  rooms?: number;
  radius_km?: number;
  min_price?: number;
  max_price?: number;
  star_rating?: number;
  guest_rating?: number;
  free_wifi?: boolean;
  breakfast_included?: boolean;
  free_cancellation?: boolean;
  distance_km_max?: number;
};

export type HotelSearchResult = {
  provider: string;
  place_id?: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  rating?: number;
  review_count?: number;
  star_rating?: number | null;
  price_per_night?: number | null;
  total_stay_price?: number | null;
  currency?: string;
  amenities: string[];
  breakfast_included?: boolean;
  free_wifi?: boolean;
  free_cancellation?: boolean;
  bookable: boolean;
  available: boolean;
  photo_urls?: string[];
  cancellation_policy?: string;
  booking_redirect_url?: string;
};

export type HotelSearchResponse = {
  destination: {
    name: string;
    formatted_address?: string;
    latitude?: number;
    longitude?: number;
  };
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  hotels: HotelSearchResult[];
  provider_status: {
    google_places: boolean;
    amadeus: boolean;
  };
  disclaimer: string;
};

export type PlacePrediction = {
  description: string;
  place_id?: string;
  id?: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

export async function autocompleteDestination(input: string): Promise<PlacePrediction[]> {
  const value = input.trim();
  if (!value || value.length < 2) return [];
  const response = await fetch(`/api/hotel-discovery/autocomplete?input_text=${encodeURIComponent(value)}`);
  if (!response.ok) return [];
  const json = await response.json();
  return Array.isArray(json.predictions) ? json.predictions : [];
}

export async function searchHotels(request: HotelSearchRequest): Promise<HotelSearchResponse> {
  const response = await fetch("/api/hotel-discovery/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Hotel search failed." }));
    throw new Error(payload?.detail || "Hotel search failed.");
  }
  return response.json();
}

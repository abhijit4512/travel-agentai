from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field, model_validator


GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")
AMADEUS_ENV = (os.getenv("AMADEUS_ENV") or "test").lower()
AMADEUS_BASE_URL = "https://api.amadeus.com" if AMADEUS_ENV == "production" else "https://test.api.amadeus.com"


class HotelSearchRequest(BaseModel):
    destination: str = Field(..., min_length=2, max_length=200)
    check_in: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    check_out: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    adults: int = Field(2, ge=1, le=10)
    children: int = Field(0, ge=0, le=8)
    rooms: int = Field(1, ge=1, le=6)
    radius_km: int = Field(5, ge=1, le=20)
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    star_rating: int | None = Field(default=None, ge=1, le=5)
    guest_rating: float | None = Field(default=None, ge=0.0, le=5.0)
    free_wifi: bool = False
    breakfast_included: bool = False
    free_cancellation: bool = False
    distance_km_max: float | None = Field(default=None, ge=0.1, le=100)

    @model_validator(mode="after")
    def validate_dates(self) -> "HotelSearchRequest":
        try:
            check_in_date = datetime.strptime(self.check_in, "%Y-%m-%d").date()
            check_out_date = datetime.strptime(self.check_out, "%Y-%m-%d").date()
        except ValueError as exc:  # pragma: no cover - pydantic handles formatting first
            raise ValueError("Dates must use YYYY-MM-DD format.") from exc

        if check_in_date < date.today():
            raise ValueError("Check-in date cannot be in the past.")
        if check_out_date <= check_in_date:
            raise ValueError("Check-out date must be after check-in.")
        if self.max_price is not None and self.min_price is not None and self.max_price < self.min_price:
            raise ValueError("Maximum price must be greater than or equal to the minimum price.")
        return self


class GooglePlacesSupplier:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or GOOGLE_PLACES_API_KEY

    def _get(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("GOOGLE_PLACES_API_KEY is not configured.")
        params = {**params, "key": self.api_key}
        response = httpx.get(url, params=params, timeout=15.0)
        response.raise_for_status()
        data = response.json()
        if data.get("status") not in {"OK", "ZERO_RESULTS"}:
            raise RuntimeError(data.get("error_message") or data.get("status") or "Google Places request failed.")
        return data

    def autocomplete(self, input_text: str) -> list[dict[str, Any]]:
        if not input_text or len(input_text.strip()) < 2:
            return []
        data = self._get(
            "https://maps.googleapis.com/maps/api/place/autocomplete/json",
            {"input": input_text, "types": "(cities)", "language": "en"},
        )
        return data.get("predictions", [])

    def resolve_destination(self, destination: str) -> dict[str, Any]:
        text_data = self._get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            {"query": destination, "type": "locality|lodging|tourist_attraction", "language": "en"},
        )
        if not text_data.get("results"):
            raise RuntimeError(f"No Google Places match found for '{destination}'.")
        first = text_data["results"][0]
        geometry = first.get("geometry", {})
        location = geometry.get("location", {})
        return {
            "name": first.get("name") or destination,
            "formatted_address": first.get("formatted_address"),
            "place_id": first.get("place_id"),
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "country": first.get("formatted_address", ""),
        }

    def nearby_hotels(self, latitude: float, longitude: float, radius_km: int = 5, keyword: str | None = None) -> list[dict[str, Any]]:
        radius_metres = max(500, min(20000, radius_km * 1000))
        data = self._get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            {"location": f"{latitude},{longitude}", "radius": radius_metres, "type": "lodging", "keyword": keyword or "hotel", "language": "en"},
        )
        return data.get("results", [])

    def place_details(self, place_id: str) -> dict[str, Any]:
        data = self._get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            {"place_id": place_id, "fields": "name,formatted_address,geometry,formatted_phone_number,website,rating,user_ratings_total,types,photos,opening_hours,editorial_summary"},
        )
        return data.get("result", {})

    @staticmethod
    def photo_url(reference: str, max_width: int = 400) -> str | None:
        if not reference:
            return None
        if not GOOGLE_PLACES_API_KEY:
            return None
        return (
            f"https://maps.googleapis.com/maps/api/place/photo"
            f"?maxwidth={max_width}&photoreference={reference}&key={GOOGLE_PLACES_API_KEY}"
        )


class AmadeusSupplier:
    def __init__(self, client_id: str | None = None, client_secret: str | None = None, base_url: str | None = None):
        self.client_id = client_id or AMADEUS_CLIENT_ID
        self.client_secret = client_secret or AMADEUS_CLIENT_SECRET
        self.base_url = base_url or AMADEUS_BASE_URL

    def _token(self) -> str:
        if not self.client_id or not self.client_secret:
            raise RuntimeError("AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are not configured.")
        response = httpx.post(
            f"{self.base_url}/v1/security/oauth2/token",
            data={"grant_type": "client_credentials", "client_id": self.client_id, "client_secret": self.client_secret},
            timeout=15.0,
        )
        response.raise_for_status()
        payload = response.json()
        token = payload.get("access_token")
        if not token:
            raise RuntimeError("Amadeus access token not issued.")
        return token

    def _get(self, path: str, params: dict[str, Any], token: str | None = None) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {token or self._token()}"}
        response = httpx.get(f"{self.base_url}{path}", params=params, headers=headers, timeout=20.0)
        response.raise_for_status()
        return response.json()

    def search_hotels(self, city_code: str, radius_km: int = 20) -> list[dict[str, Any]]:
        try:
            data = self._get(
                "/v1/reference-data/locations/hotels/by-city",
                {"cityCode": city_code, "radius": radius_km, "radiusUnit": "KM", "hotelSource": "ALL"},
            )
        except httpx.HTTPStatusError:
            return []
        return data.get("data", [])

    def hotel_offers(self, hotel_ids: list[str], request: HotelSearchRequest) -> list[dict[str, Any]]:
        if not hotel_ids:
            return []
        data = self._get(
            "/v3/shopping/hotel-offers",
            {
                "hotelIds": ",".join(hotel_ids[:10]),
                "adults": request.adults,
                "checkInDate": request.check_in,
                "checkOutDate": request.check_out,
                "roomQuantity": request.rooms,
                "currency": "INR",
                "bestRateOnly": True,
            },
        )
        return data.get("data", [])

    def booking_redirect(self, hotel_id: str, request: HotelSearchRequest) -> str:
        return (
            f"https://www.google.com/travel/hotels/search?"
            f"q={hotel_id}&checkin={request.check_in}&checkout={request.check_out}&adults={request.adults}"
        )


class HotelDiscoveryService:
    def __init__(self):
        self.google = GooglePlacesSupplier()
        self.amadeus = AmadeusSupplier()

    def _as_float(self, value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _distance_km(self, latitude: float, longitude: float, dest_latitude: float, dest_longitude: float) -> float:
        if latitude is None or longitude is None or dest_latitude is None or dest_longitude is None:
            return 0.0
        d_lat = (latitude - dest_latitude) * 111.32
        d_lng = (longitude - dest_longitude) * 111.32 * 0.8
        return round((d_lat**2 + d_lng**2) ** 0.5, 2)

    def _normalize_google_hotel(self, hotel: dict[str, Any], destination: dict[str, Any]) -> dict[str, Any]:
        geometry = hotel.get("geometry", {}).get("location", {})
        latitude = self._as_float(geometry.get("lat"))
        longitude = self._as_float(geometry.get("lng"))
        dist = self._distance_km(latitude, longitude, destination.get("latitude"), destination.get("longitude")) if latitude is not None and destination.get("latitude") is not None else 0.0
        photo_urls = [
            GooglePlacesSupplier.photo_url(photo.get("photo_reference"), 800)
            for photo in hotel.get("photos", [])[:3]
            if photo.get("photo_reference")
        ]
        return {
            "provider": "google_places",
            "place_id": hotel.get("place_id"),
            "name": hotel.get("name"),
            "address": hotel.get("vicinity") or hotel.get("formatted_address") or "Address unavailable",
            "latitude": latitude,
            "longitude": longitude,
            "distance_km": dist,
            "rating": self._as_float(hotel.get("rating")),
            "review_count": hotel.get("user_ratings_total"),
            "star_rating": None,
            "price_per_night": None,
            "total_stay_price": None,
            "currency": "INR",
            "amenities": hotel.get("types", [])[:8],
            "breakfast_included": False,
            "free_wifi": "wifi" in " ".join((hotel.get("types") or [])).lower(),
            "free_cancellation": False,
            "bookable": False,
            "available": False,
            "photo_urls": photo_urls,
            "cancellation_policy": "Supplier confirmation required before booking.",
            "supplier_details_url": "",
            "booking_redirect_url": "",
            "destination": destination.get("name"),
        }

    def _normalize_amadeus_hotel(self, hotel: dict[str, Any], request: HotelSearchRequest) -> dict[str, Any]:
        offer = hotel.get("offers", [{}])[0] if isinstance(hotel.get("offers"), list) and hotel.get("offers") else {}
        return {
            "provider": "amadeus",
            "place_id": hotel.get("hotel", {}).get("hotelId") or hotel.get("hotelId"),
            "name": hotel.get("hotel", {}).get("name") or hotel.get("name"),
            "address": hotel.get("hotel", {}).get("address", {}).get("lines", [None])[0] or "Address unavailable",
            "latitude": self._as_float(hotel.get("hotel", {}).get("latitude")),
            "longitude": self._as_float(hotel.get("hotel", {}).get("longitude")),
            "distance_km": 0.0,
            "rating": self._as_float(hotel.get("hotel", {}).get("rating")),
            "review_count": hotel.get("hotel", {}).get("ratingCount"),
            "star_rating": hotel.get("hotel", {}).get("rating"),
            "price_per_night": self._as_float(offer.get("price", {}).get("total")) if offer else None,
            "total_stay_price": self._as_float(offer.get("price", {}).get("total")) if offer else None,
            "currency": offer.get("price", {}).get("currency") or "INR",
            "amenities": [item.get("description", item.get("name", "")) for item in hotel.get("hotel", {}).get("amenities", [])[:10] if isinstance(item, dict)],
            "breakfast_included": any("breakfast" in str(item).lower() for item in hotel.get("hotel", {}).get("amenities", [])),
            "free_wifi": any("wifi" in str(item).lower() for item in hotel.get("hotel", {}).get("amenities", [])),
            "free_cancellation": bool(offer.get("cancellationTerms")),
            "bookable": bool(offer),
            "available": bool(offer),
            "photo_urls": [
                photo.get("url")
                for photo in hotel.get("hotel", {}).get("media", [])[:3]
                if isinstance(photo, dict) and photo.get("url")
            ],
            "cancellation_policy": offer.get("cancellationTerms", [{}])[0].get("description") if isinstance(offer.get("cancellationTerms"), list) and offer.get("cancellationTerms") else "Check supplier terms before booking.",
            "supplier_details_url": "",
            "booking_redirect_url": self.amadeus.booking_redirect(hotel.get("hotel", {}).get("hotelId") or hotel.get("hotelId") or "", request),
            "destination": request.destination,
        }

    def _filter_result(self, result: dict[str, Any], request: HotelSearchRequest) -> bool:
        if request.min_price is not None and result.get("price_per_night") is not None and result["price_per_night"] < request.min_price:
            return False
        if request.max_price is not None and result.get("price_per_night") is not None and result["price_per_night"] > request.max_price:
            return False
        if request.star_rating is not None and result.get("star_rating") is not None and int(result["star_rating"]) < request.star_rating:
            return False
        if request.guest_rating is not None and result.get("rating") is not None and result["rating"] < request.guest_rating:
            return False
        if request.distance_km_max is not None and result.get("distance_km") is not None and result["distance_km"] > request.distance_km_max:
            return False
        if request.free_wifi and not result.get("free_wifi"):
            return False
        if request.breakfast_included and not result.get("breakfast_included"):
            return False
        if request.free_cancellation and not result.get("free_cancellation"):
            return False
        return True

    def discover(self, request: HotelSearchRequest) -> dict[str, Any]:
        destination = self.google.resolve_destination(request.destination)
        nearby = self.google.nearby_hotels(float(destination["latitude"]), float(destination["longitude"]), request.radius_km, "hotel")
        hotels = [self._normalize_google_hotel(item, destination) for item in nearby[:12]]

        try:
            if AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET:
                city = (request.destination or "").strip().split(",")[-1].strip().split()[-1].strip()
                hotel_ids = [item.get("hotelId") for item in self.amadeus.search_hotels(city[:3].upper() or "HYD", request.radius_km) if item.get("hotelId")]
                if hotel_ids:
                    fetched_offers = self.amadeus.hotel_offers(hotel_ids, request)
                    for offer in fetched_offers[:10]:
                        hotels.append(self._normalize_amadeus_hotel(offer, request))
        except Exception:  # intentionally non-fatal, provider can be unavailable
            pass

        unique: dict[str, dict[str, Any]] = {}
        for hotel in hotels:
            key = hotel.get("place_id") or hotel.get("name") or hotel.get("address")
            if key:
                unique.setdefault(str(key), hotel)
        filtered = [hotel for hotel in unique.values() if self._filter_result(hotel, request)]
        filtered.sort(key=lambda item: (item.get("price_per_night") is None, item.get("price_per_night") or 9999999, -float(item.get("rating") or 0), item.get("distance_km") or 9999))

        return {
            "destination": {
                "name": destination.get("name"),
                "formatted_address": destination.get("formatted_address"),
                "latitude": destination.get("latitude"),
                "longitude": destination.get("longitude"),
            },
            "check_in": request.check_in,
            "check_out": request.check_out,
            "adults": request.adults,
            "children": request.children,
            "rooms": request.rooms,
            "hotels": filtered,
            "provider_status": {
                "google_places": bool(GOOGLE_PLACES_API_KEY),
                "amadeus": bool(AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET),
            },
            "disclaimer": "Google Places and Amadeus provide discovery and offer data only. Booking confirmation is never guaranteed until the supplier confirms it.",
        }


def discover_hotels(request: HotelSearchRequest) -> dict[str, Any]:
    return HotelDiscoveryService().discover(request)


def autocomplete_destination(input_text: str) -> list[dict[str, Any]]:
    try:
        return GooglePlacesSupplier().autocomplete(input_text)
    except Exception:
        return []

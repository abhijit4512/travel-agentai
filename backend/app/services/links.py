"""
External booking and information links. These open OTHER websites. We do not book anything and cannot see what you book there.
Link formats can change; the labels say what each link opens.
"""
from __future__ import annotations

from urllib.parse import quote, quote_plus


def hotel_links(place: str, check_in: str = "", check_out: str = "", adults: int = 2, rooms: int = 1) -> list[dict[str, str]]:
    q = quote_plus(place)
    booking = f"https://www.booking.com/searchresults.html?ss={q}&group_adults={adults}&no_rooms={rooms}&selected_currency=INR"
    if check_in and check_out:
        booking += f"&checkin={check_in}&checkout={check_out}"
    return [
        {"label": "Search hotels on Booking.com", "url": booking, "kind": "external"},
        {"label": "Hotels on Google Maps", "url": f"https://www.google.com/maps/search/?api=1&query={quote_plus('hotels in ' + place)}", "kind": "external"},
        {"label": "Search the web for hotels", "url": f"https://www.google.com/search?q={quote_plus('hotels in ' + place)}", "kind": "search"},
    ]


def bus_links(src: str, dst: str, date: str = "") -> list[dict[str, str]]:
    return [
        {"label": "redBus (bus ticket site)", "url": "https://www.redbus.in/", "kind": "external"},
        {"label": f"Search the web: bus {src} to {dst}", "url": f"https://www.google.com/search?q={quote_plus(f'bus tickets {src} to {dst} {date}'.strip())}", "kind": "search"},
        {"label": "State transport corporations vary by state. Search for yours.", "url": f"https://www.google.com/search?q={quote_plus(src + ' state road transport corporation online booking')}", "kind": "search"},
    ]


def train_links(src: str, dst: str, date: str = "") -> list[dict[str, str]]:
    return [
        {"label": "IRCTC (official ticket booking)", "url": "https://www.irctc.co.in/", "kind": "official"},
        {"label": "Indian Railways NTES (running status, schedules)", "url": "https://enquiry.indianrail.gov.in/ntes/", "kind": "official"},
        {"label": f"Search the web: trains {src} to {dst}", "url": f"https://www.google.com/search?q={quote_plus(f'trains from {src} to {dst} {date}'.strip())}", "kind": "search"},
    ]


def flight_links(src: str, dst: str, date: str = "", return_date: str = "") -> list[dict[str, str]]:
    text = f"Flights from {src} to {dst}" + (f" on {date}" if date else "") + (f" returning {return_date}" if return_date else "")
    return [
        {"label": "Google Flights search", "url": f"https://www.google.com/travel/flights?q={quote(text)}", "kind": "external"},
        {"label": "Search the web for flights", "url": f"https://www.google.com/search?q={quote_plus(text)}", "kind": "search"},
    ]


def build(kind: str, **p: str) -> list[dict[str, str]]:
    src, dst, date = p.get("src", ""), p.get("dst", ""), p.get("date", "")
    if kind == "hotel":
        return hotel_links(p.get("place", ""), p.get("check_in", ""), p.get("check_out", ""), int(p.get("adults") or 2), int(p.get("rooms") or 1))
    if kind == "bus":
        return bus_links(src, dst, date)
    if kind == "train":
        return train_links(src, dst, date)
    if kind == "flight":
        return flight_links(src, dst, date, p.get("return_date", ""))
    raise ValueError("kind must be hotel, bus, train or flight.")

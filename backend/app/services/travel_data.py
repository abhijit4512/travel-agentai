"""
Seed data for the car calculator.

HONEST STATUS: every number here is INDICATIVE, entered by hand. Mileage is a typical real-world figure (your car may differ),
rental prices are rough ranges (they vary by city, season, driver and kilometre limits), and fuel prices are APPROXIMATE REFERENCE
values that are NOT live. The app labels all of them that way. Admins can edit them.
"""
from __future__ import annotations

CATEGORIES = {
    "hatchback": "Hatchback", "sedan": "Sedan", "suv": "SUV", "premium_suv": "Premium SUV",
    "luxury": "Luxury car", "electric": "Electric vehicle", "tempo_traveller": "Tempo Traveller",
}
_FEATURES = {
    "hatchback": ["Air conditioning", "Music system", "Easy to park"], "sedan": ["Air conditioning", "Large boot", "Comfortable highway ride"],
    "suv": ["Air conditioning", "Higher ground clearance", "Spacious cabin"], "premium_suv": ["Air conditioning", "Seats 6 or 7 on most models", "Good for hills and long trips"],
    "luxury": ["Air conditioning", "Premium interior", "Usually rented with a driver"], "electric": ["Air conditioning", "Low running cost", "Needs charging stops"],
    "tempo_traveller": ["Air conditioning", "Group travel", "Usually rented with a driver"],
}
# id, category, name, model, fuel, mileage (km/l, km/kg for CNG), kWh per 100 km (EV), seats, transmission, rent/day INR
_V = [
    ("swift-petrol", "hatchback", "Maruti Suzuki Swift", "Petrol", "petrol", 18, None, 5, "Manual / AMT", 2200),
    ("i10-petrol", "hatchback", "Hyundai Grand i10 Nios", "Petrol", "petrol", 17, None, 5, "Manual / AMT", 2200),
    ("wagonr-cng", "hatchback", "Maruti Suzuki WagonR", "CNG", "cng", 28, None, 5, "Manual", 2000),
    ("dzire-petrol", "sedan", "Maruti Suzuki Dzire", "Petrol", "petrol", 19, None, 5, "Manual / AMT", 2800),
    ("city-petrol", "sedan", "Honda City", "Petrol", "petrol", 15, None, 5, "Manual / CVT", 3200),
    ("verna-diesel", "sedan", "Hyundai Verna", "Diesel", "diesel", 20, None, 5, "Manual", 3300),
    ("brezza-petrol", "suv", "Maruti Suzuki Brezza", "Petrol", "petrol", 16, None, 5, "Manual / Automatic", 3500),
    ("creta-diesel", "suv", "Hyundai Creta", "Diesel", "diesel", 16, None, 5, "Manual / Automatic", 4000),
    ("xuv700-diesel", "suv", "Mahindra XUV700", "Diesel", "diesel", 14, None, 7, "Manual / Automatic", 4800),
    ("innova-diesel", "premium_suv", "Toyota Innova Crysta", "Diesel", "diesel", 12, None, 7, "Manual / Automatic", 5500),
    ("fortuner-diesel", "premium_suv", "Toyota Fortuner", "Diesel", "diesel", 10, None, 7, "Manual / Automatic", 8000),
    ("eclass-petrol", "luxury", "Mercedes-Benz E-Class", "Petrol", "petrol", 11, None, 5, "Automatic", 15000),
    ("5series-diesel", "luxury", "BMW 5 Series", "Diesel", "diesel", 14, None, 5, "Automatic", 14000),
    ("tiago-ev", "electric", "Tata Tiago EV", "Electric", "electric", None, 12, 5, "Automatic", 3000),
    ("nexon-ev", "electric", "Tata Nexon EV", "Electric", "electric", None, 14, 5, "Automatic", 3800),
    ("tempo-traveller", "tempo_traveller", "Force Tempo Traveller", "Diesel", "diesel", 9, None, 12, "Manual", 6500),
]
VEHICLES = [dict(id=v[0], category=v[1], name=v[2], model=v[3], fuel_type=v[4], mileage=v[5], kwh_per_100km=v[6], seats=v[7],
                 transmission=v[8], rent_per_day_inr=v[9], features=_FEATURES[v[1]],
                 note="Indicative figures. Real mileage and rental price vary; confirm with the rental company.") for v in _V]

# Approximate REFERENCE prices (INR per litre, per kg for CNG, per kWh for electric). Not live. Set by hand; update before relying on them.
REFERENCE_DATE = "2024-04-01T00:00:00+00:00"
_PETROL = {"delhi": 94.7, "mumbai": 103.4, "kolkata": 105.0, "chennai": 100.8, "bengaluru": 102.9, "hyderabad": 107.4,
           "ahmedabad": 94.5, "pune": 104.0, "jaipur": 104.7, "lucknow": 94.7, "kochi": 107.5}
_DIESEL = {"delhi": 87.6, "mumbai": 89.9, "kolkata": 91.8, "chennai": 92.4, "bengaluru": 88.9, "hyderabad": 95.7,
           "ahmedabad": 90.2, "pune": 90.5, "jaipur": 90.2, "lucknow": 87.8, "kochi": 96.4}
FUEL_PRICES = ([(c, "petrol", p) for c, p in _PETROL.items()] + [(c, "diesel", p) for c, p in _DIESEL.items()]
               + [("delhi", "cng", 76.5), ("mumbai", "cng", 75.0), ("default", "petrol", 100.0), ("default", "diesel", 91.0),
                  ("default", "cng", 80.0), ("default", "electric", 20.0)])

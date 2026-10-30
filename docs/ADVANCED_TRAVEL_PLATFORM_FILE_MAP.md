# Advanced Travel Platform File Map

This file is a reference map for the new plugin-style modules that should be added to the Travel Agent India project without changing the current application files.

## Backend file map

### Core services
- backend/app/services/travel_rentals.py
- backend/app/services/fuel_pricing.py
- backend/app/services/hotel_booking.py
- backend/app/services/bus_booking.py
- backend/app/services/train_booking.py
- backend/app/services/flight_booking.py
- backend/app/services/travel_memories.py
- backend/app/services/trip_planner_ai.py
- backend/app/services/admin_analytics.py
- backend/app/services/payments.py
- backend/app/services/notifications.py
- backend/app/services/providers.py

### Provider integrations
- backend/app/services/providers/google_maps_provider.py
- backend/app/services/providers/google_places_provider.py
- backend/app/services/providers/fuel_provider.py
- backend/app/services/providers/hotel_provider.py
- backend/app/services/providers/bus_provider.py
- backend/app/services/providers/rail_provider.py
- backend/app/services/providers/flight_provider.py
- backend/app/services/providers/storage_provider.py
- backend/app/services/providers/payment_provider.py
- backend/app/services/providers/ai_provider.py

### API routes
- backend/app/api/routes/cars.py
- backend/app/api/routes/hotels.py
- backend/app/api/routes/buses.py
- backend/app/api/routes/trains.py
- backend/app/api/routes/flights.py
- backend/app/api/routes/memories.py
- backend/app/api/routes/trips.py
- backend/app/api/routes/payments.py
- backend/app/api/routes/admin.py
- backend/app/api/routes/analytics.py
- backend/app/api/routes/dashboard.py

### Models / schema files
- backend/app/models/car_rental.py
- backend/app/models/fuel_price.py
- backend/app/models/hotel.py
- backend/app/models/hotel_booking.py
- backend/app/models/bus_booking.py
- backend/app/models/train_booking.py
- backend/app/models/flight_booking.py
- backend/app/models/trip_plan.py
- backend/app/models/travel_memory.py
- backend/app/models/admin_audit.py
- backend/app/models/payments.py
- backend/app/models/notifications.py

## Frontend file map

### Pages
- frontend/src/pages/CarRentals.tsx
- frontend/src/pages/FuelCalculator.tsx
- frontend/src/pages/Hotels.tsx
- frontend/src/pages/HotelDetail.tsx
- frontend/src/pages/BusBooking.tsx
- frontend/src/pages/TrainBooking.tsx
- frontend/src/pages/FlightBooking.tsx
- frontend/src/pages/TripPlanner.tsx
- frontend/src/pages/MyMemories.tsx
- frontend/src/pages/UserDashboard.tsx
- frontend/src/pages/AdminDashboard.tsx
- frontend/src/pages/AdminLogin.tsx
- frontend/src/pages/AdminUsers.tsx
- frontend/src/pages/AdminBookings.tsx
- frontend/src/pages/AdminTrips.tsx
- frontend/src/pages/AdminAnalytics.tsx
- frontend/src/pages/NotificationsCenter.tsx
- frontend/src/pages/Payments.tsx
- frontend/src/pages/ProfileSettings.tsx

### Shared components
- frontend/src/components/travel/CarCard.tsx
- frontend/src/components/travel/FuelCalculatorCard.tsx
- frontend/src/components/travel/HotelCard.tsx
- frontend/src/components/travel/BookingFilters.tsx
- frontend/src/components/travel/TripSummary.tsx
- frontend/src/components/travel/MemoryGallery.tsx
- frontend/src/components/travel/RouteMap.tsx
- frontend/src/components/dashboard/StatsCard.tsx
- frontend/src/components/admin/AdminSidebar.tsx
- frontend/src/components/admin/AnalyticsCharts.tsx
- frontend/src/components/admin/UserTable.tsx
- frontend/src/components/admin/BookingTable.tsx
- frontend/src/components/ui/EmptyState.tsx
- frontend/src/components/ui/LoadingSkeleton.tsx
- frontend/src/components/ui/StatusBadge.tsx

### Styling
- frontend/src/styles/travel-brand.css
- frontend/src/components/layout/TravelHeader.tsx
- frontend/src/components/layout/TravelFooter.tsx

## Safe integration strategy

1. Add new feature files first.
2. Keep existing routes untouched.
3. Add new pages behind feature flags or new route groups when needed.
4. Integrate providers behind adapter interfaces.
5. Add admin protection to the backend before exposing admin pages.
6. Confirm that live pricing and booking flows are provider-backed and not fake.

## Completion criteria

The upgrade is complete only when all of the following are true:
- existing app behavior remains intact
- new modules are isolated and testable
- providers are configurable through environment variables
- admin-only routes are protected by server-side role checks
- billing, booking, and memory privacy rules are enforced consistently
- responsive UI has no broken layout in desktop, tablet, and mobile modes

This file exists as a blueprint only. Actual implementation should happen in a later, controlled phase without modifying the current project files.

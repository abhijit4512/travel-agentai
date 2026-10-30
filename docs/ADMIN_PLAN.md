# Admin and content management: plan (not built yet)

The data model is ready. The protected admin screens are not built, to avoid touching your login system.

## What already exists
- `places` table with `published` and `featured` columns (unpublished rows never appear in search).
- `feedback` table: reports of incorrect information (`status` column starts as `new`).
- `python -m app.tools.import_places file.csv` bulk-adds destinations without any frontend change.

## Steps to add an admin area safely
1. Add `role TEXT NOT NULL DEFAULT 'user'` to `users` (new migration; keep existing rows as `user`). Promote yourself with one SQL update.
2. Add a backend dependency `require_admin` that reuses `get_current_user` and checks `role == 'admin'`. Never trust the frontend.
3. Add routes under `/api/admin/*`: list/edit places (summary, tags, season, featured, published), list feedback and change `status`.
4. Add a `/admin` page in React guarded by `ProtectedRoute` plus a role check, but rely on step 2 for real security.
5. Photos: store an optional `image_override_url` and attribution per place, reviewed by an admin, to replace the automatic Wikimedia lookup when it picks a poor photo.
6. Source tracking: add `source_url` and `last_verified_at` columns and show them on the destination page.

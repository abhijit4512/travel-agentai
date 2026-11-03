"""
Give (or remove) admin rights from an existing account. This is the ONLY way to create an admin, so nobody can sign up as one.

    python -m app.tools.make_admin you@example.com
    python -m app.tools.make_admin you@example.com --remove

The person must already have a normal account (sign up on the website first).
"""
from __future__ import annotations

import sys

from ..database.db import connect, init_db
from ..database.extras import init_extras


def main(argv: list[str]) -> int:
    if not argv or argv[0].startswith("-"):
        print(__doc__); return 1
    email, remove = argv[0].strip().lower(), "--remove" in argv
    init_db(); init_extras()
    with connect() as c:
        row = c.execute("SELECT id, role FROM users WHERE email=?", (email,)).fetchone()
        if row is None:
            print(f"No account found for {email}. Sign up on the website first."); return 1
        c.execute("UPDATE users SET role=?, is_active=1 WHERE id=?", ("user" if remove else "admin", row["id"]))
    print(f"{email} is now {'a normal user' if remove else 'an admin'}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

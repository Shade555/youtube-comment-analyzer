"""One-off migration: legacy SQLite data -> Supabase Postgres.

Your old analyses live in ``backend/app.db`` under the ``users`` table.
Supabase owns *identity*, so the account itself must be recreated there (sign up
once in the app) - this script then re-points the old rows at the new Supabase
profile, matching the two by email.

Usage
-----
    # 1. Sign up / log in once with the same email in the app (creates the
    #    Supabase user + the mirrored `profiles` row).
    # 2. Point DATABASE_URL at Supabase and run:
    DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
        venv/bin/python -m backend.scripts.migrate_sqlite_to_supabase --email you@example.com

Add ``--dry-run`` first to see what would be copied. Row ids are reused, so the
script is safe to re-run: anything already migrated is reported as skipped.

Duplicate emails
----------------
``public.profiles`` has a unique index on ``email``, and an account created by an
older version of this app can already own the address Supabase Auth has just
handed out (or the same person may simply have two addresses). Either way the
mirrored profile cannot be written, so no analysis can be saved. ``--merge-from``
absorbs the old profile into the live one:

    venv/bin/python -m backend.scripts.migrate_sqlite_to_supabase \
        --email you@example.com --merge-from old-address@example.com --dry-run

``--email`` is the profile that survives (the one your Supabase user id points
at), ``--merge-from`` the email of the duplicate row to absorb. The duplicate's
analyses are re-pointed at the survivor *before* the row is removed, so the
``on delete cascade`` foreign key cannot take them with it. With
``--merge-from`` the legacy SQLite account becomes optional: the merge still runs
when there is nothing left to copy.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from typing import Any, Optional

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy.exc import OperationalError

try:  # noqa: E402 - imported after the sys.path fix above on purpose
    from backend import models  # noqa: E402
    from backend.database import SessionLocal, engine  # noqa: E402
except ModuleNotFoundError as exc:  # pragma: no cover - setup guidance
    raise SystemExit(
        f"Cannot import the backend package ({exc}).\n"
        "Run this module from the project root, not from backend/:\n"
        "    cd <project root>\n"
        "    venv/bin/python -m backend.scripts.migrate_sqlite_to_supabase --help\n"
        f"(Looked for Python modules starting at {PROJECT_ROOT}.)"
    ) from exc

DEFAULT_SQLITE = os.path.join(PROJECT_ROOT, "backend", "app.db")


def _parse_dt(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _parse_json(value: Any, fallback: Any) -> Any:
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback


def _load_legacy(sqlite_path: str, email: str) -> dict:
    """Read the legacy account plus its rows straight out of SQLite."""
    if not os.path.exists(sqlite_path):
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    con = sqlite3.connect(sqlite_path)
    con.row_factory = sqlite3.Row
    try:
        tables = {
            row[0]
            for row in con.execute("select name from sqlite_master where type='table'")
        }
        # `users` is the pre-Supabase table name; `profiles` the newer one.
        user_table = "users" if "users" in tables else "profiles"
        rows = con.execute(
            f"select id, email, created_at from {user_table} where lower(email) = ?",
            (email.strip().lower(),),
        ).fetchall()
        if not rows:
            raise SystemExit(f"No legacy account with email {email!r} in {sqlite_path}")

        legacy_user_id = rows[0]["id"]
        data = {"user": dict(rows[0]), "analyses": []}
        for key, table in (("analyses", "analyses"),):
            if table in tables:
                data[key] = [
                    dict(r)
                    for r in con.execute(
                        f"select * from {table} where user_id = ?", (legacy_user_id,)
                    )
                ]
        return data
    finally:
        con.close()


def _copy_analyses(db, target_id: str, rows: list, dry_run: bool) -> tuple[int, int]:
    copied = skipped = 0
    for row in rows:
        if db.get(models.Analysis, row["id"]):
            skipped += 1
            continue
        copied += 1
        if dry_run:
            continue
        db.add(
            models.Analysis(
                id=row["id"],
                user_id=target_id,
                video_id=row["video_id"],
                video_url=row.get("video_url"),
                video_title=row.get("video_title"),
                thumbnail_url=row.get("thumbnail_url"),
                total_comments=row.get("total_comments") or 0,
                analyzed_comments=row.get("analyzed_comments") or 0,
                emotion_distribution=_parse_json(row.get("emotion_distribution"), {}),
                model_usage=_parse_json(row.get("model_usage"), {}),
                comments=_parse_json(row.get("comments"), []),
                sarcasm_rate=row.get("sarcasm_rate") or 0.0,
                status=row.get("status") or "completed",
                created_at=_parse_dt(row.get("created_at")),
            )
        )
    return copied, skipped


def _merge_duplicate_profile(
    db, duplicate_email: str, target, dry_run: bool
) -> tuple[int, bool]:
    """Re-point a duplicate profile's analyses at ``target`` and drop the duplicate.

    Needed when the same address is already owned by a row created by the old
    local-auth flow: the unique ``profiles.email`` index (or a stale id) would
    otherwise block the mirrored profile and every analysis insert behind it.
    """
    duplicate = (
        db.query(models.Profile).filter(models.Profile.email == duplicate_email).first()
    )
    if duplicate is None:
        print(f"  ! no profile row with email {duplicate_email!r} - nothing to merge")
        return 0, False
    if duplicate.id == target.id:
        print("  ! --merge-from points at the target profile - nothing to merge")
        return 0, False

    moved = (
        db.query(models.Analysis).filter(models.Analysis.user_id == duplicate.id).all()
    )
    print(
        f"  merging profile {duplicate.id} -> {target.id}: "
        f"{len(moved)} analyses re-pointed"
    )
    if dry_run:
        return len(moved), True

    for row in moved:
        row.user_id = target.id
    # Flush the moves first so the delete cannot trip the foreign key.
    db.flush()
    db.delete(duplicate)
    return len(moved), True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Copy legacy SQLite analyses into Supabase Postgres.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--email", required=True, help="Account email to migrate")
    parser.add_argument(
        "--sqlite", default=DEFAULT_SQLITE, help=f"Legacy DB (default: {DEFAULT_SQLITE})"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Report what would be copied, then exit"
    )
    parser.add_argument(
        "--merge-from",
        metavar="EMAIL",
        help=(
            "Merge a duplicate profile row that already owns another account's "
            "email: its analyses are re-pointed at --email's profile, then the "
            "duplicate row is removed. Fixes 23505 profiles_email_key errors."
        ),
    )
    args = parser.parse_args()

    if engine.dialect.name != "postgresql":
        print(
            "ERROR: DATABASE_URL does not point at Postgres/Supabase, so there is "
            "nowhere to migrate to.\n"
            '       Re-run with DATABASE_URL="postgresql://postgres.<ref>:<pw>@'
            '...pooler.supabase.com:6543/postgres".'
        )
        return 2

    email = args.email.strip().lower()

    # The legacy SQLite account is optional when the only goal is a merge.
    legacy = None
    try:
        legacy = _load_legacy(args.sqlite, email)
    except SystemExit as exc:
        if not args.merge_from:
            print(str(exc))
            return 2
        print(f"  ! {exc}")
        print("  ! continuing with --merge-from only (no rows to copy)")
    if legacy is not None:
        print(f"Legacy account in {args.sqlite}: {legacy['user']['id']} ({email})")
        print(f"  analyses={len(legacy['analyses'])}")

    with SessionLocal() as db:
        try:
            target = (
                db.query(models.Profile).filter(models.Profile.email == email).first()
            )
        except OperationalError as exc:
            print(
                f"\nERROR: could not connect to Supabase Postgres.\n"
                f"       {getattr(exc, 'orig', exc)}\n"
                f"       Check SUPABASE_DB_URL/DATABASE_URL and that DATABASE_URL "
                f"points at the pooler host."
            )
            return 2
        if target is None:
            print(
                f"\nERROR: no Supabase profile found for {email!r}.\n"
                "       Log in once with this email through the app first - that "
                "creates the mirrored `profiles` row.\n"
                "       (If you are seeing 'already linked to a legacy profile', "
                "this script is the fix: run it once without --dry-run.)"
            )
            return 2

        print(f"Target Supabase profile: {target.id}\n")

        if args.merge_from:
            _merge_duplicate_profile(
                db, args.merge_from.strip().lower(), target, args.dry_run
            )

        for name, rows, copier in (
            ("analyses", (legacy or {}).get("analyses", []), _copy_analyses),
        ):
            copied, skipped = copier(db, target.id, rows, args.dry_run)
            print(f"  {name}: copied={copied} skipped={skipped}")

        if args.dry_run:
            db.rollback()
            print("\nDRY RUN - nothing was written. Re-run without --dry-run.")
            return 0

        db.commit()
        print("\nDone. Your analyses are now on Supabase.")
        print(
            "The old SQLite account still exists locally; the Supabase login "
            "replaces it from now on."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
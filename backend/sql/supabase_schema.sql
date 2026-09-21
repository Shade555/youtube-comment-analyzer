-- ===========================================================================
-- Supabase schema - Hindi YouTube Comment Analyzer
--
-- Paste this into Supabase -> SQL Editor to create the tables, their indexes
-- and the Row Level Security policies the app relies on. Every statement is
-- idempotent, so re-running the file is safe.
--
-- `profiles.id` mirrors `auth.users.id`: Supabase owns identity and credentials
-- (email/password *and* Google OAuth), and the app only keeps one profile row so
-- analyses can hang off it. The FastAPI backend also runs
-- `Base.metadata.create_all()` on startup, but only this file sets up RLS.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id              varchar primary key,
    email           varchar not null,
    -- Only populated by the offline local-auth fallback. In Supabase mode
    -- passwords live in the `auth` schema and this stays null.
    hashed_password varchar,
    full_name       varchar,
    avatar_url      varchar,
    created_at      timestamp without time zone default (now() at time zone 'utc')
);

create table if not exists public.analyses (
    id                   varchar primary key,
    user_id              varchar not null references public.profiles (id) on delete cascade,
    video_id             varchar not null,
    video_url            varchar,
    video_title          varchar,
    thumbnail_url        varchar,
    total_comments       integer,
    analyzed_comments    integer,
    emotion_distribution json,
    model_usage          json,
    comments             json,
    sarcasm_rate         double precision,
    status               varchar,
    created_at           timestamp without time zone default (now() at time zone 'utc')
);

-- ---------------------------------------------------------------------------
-- Indexes (mirror the SQLAlchemy model definitions)
--
-- `ix_profiles_email` is UNIQUE: one account per address. A row created by the
-- old local-auth flow can therefore already own an address, which is why the
-- backend answers 409 ("already linked to a legacy profile") and the duplicate
-- has to be merged with `python -m backend.scripts.migrate_sqlite_to_supabase`.
-- ---------------------------------------------------------------------------
create unique index if not exists ix_profiles_email      on public.profiles (email);
create        index if not exists ix_profiles_created_at on public.profiles (created_at);
create        index if not exists ix_analyses_user_id    on public.analyses (user_id);
create        index if not exists ix_analyses_video_id   on public.analyses (video_id);
create        index if not exists ix_analyses_created_at on public.analyses (created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The frontend reads and writes these tables straight from the browser with the
-- publishable (anon) key, so these policies are what scope every request to the
-- signed-in user's own rows via auth.uid(). Without them Supabase refuses the
-- request and the app reports "row-level security" errors.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
    for all
    using (auth.uid()::text = id)
    with check (auth.uid()::text = id);

drop policy if exists "own analyses" on public.analyses;
create policy "own analyses" on public.analyses
    for all
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- Tables created in the SQL editor already inherit Supabase's default grants,
-- but a table created by another role (for example by SQLAlchemy against the
-- Postgres connection string) may not. These statements are harmless when the
-- grants are already in place, and without them PostgREST answers 42501 before
-- RLS is ever consulted.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.analyses to authenticated;

-- ---------------------------------------------------------------------------
-- Adopting a profile that predates Supabase Auth
--
-- If an account row already owns your email but is not a Supabase user (the
-- classic case: a profile migrated from the old SQLite database, recognisable by
-- its hashed_password), then signing in with that email or with Google fails with
-- error 23505 ("duplicate key value violates unique constraint ix_profiles_email")
-- and analyses cannot be saved, because the JWT's user id has no matching row.
--
-- This function hands that account over to the signed-in Supabase user: it moves
-- the analyses across, keeps the local password hash and display name, and drops
-- the stale row. It refuses to touch a profile that belongs to a real Supabase
-- account, and it only ever operates on the caller's own email.
--
-- The app calls it automatically when the profile upsert hits 23505
-- (src/services/supabaseData.ts), and it can be run by hand:
--   select public.claim_legacy_profile('you@example.com');
-- ---------------------------------------------------------------------------
create or replace function public.claim_legacy_profile(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid        varchar := nullif(auth.uid()::text, '');
    v_email      varchar := lower(trim(coalesce(p_email, '')));
    v_legacy_id  varchar;
begin
    if v_uid is null then
        raise exception 'claim_legacy_profile must be called by a signed-in user';
    end if;
    if v_email = '' then
        raise exception 'an email address is required';
    end if;
    if not exists (select 1 from auth.users where id::text = v_uid) then
        raise exception 'the caller is not a Supabase Auth user';
    end if;

    select id into v_legacy_id
      from public.profiles
     where lower(email) = v_email
       and id <> v_uid
     order by created_at
     limit 1;

    if v_legacy_id is null then
        raise exception 'no profile other than your own owns %', v_email;
    end if;

    -- Never steal a row that still belongs to a live Supabase account.
    if exists (select 1 from auth.users where id::text = v_legacy_id) then
        raise exception 'the profile for % already belongs to a Supabase account', v_email;
    end if;

    -- Free up the email address before inserting the caller's own row.
    update public.profiles
       set email = v_legacy_id || '@legacy.invalid'
     where id = v_legacy_id;

    insert into public.profiles (id, email, hashed_password, full_name, avatar_url, created_at)
    select v_uid, v_email, p.hashed_password, p.full_name, p.avatar_url, p.created_at
      from public.profiles p
     where p.id = v_legacy_id
    on conflict (id) do update
       set email           = excluded.email,
           hashed_password = coalesce(public.profiles.hashed_password, excluded.hashed_password),
           full_name       = coalesce(public.profiles.full_name, excluded.full_name),
           avatar_url      = coalesce(public.profiles.avatar_url, excluded.avatar_url);

    update public.analyses
       set user_id = v_uid
     where user_id = v_legacy_id;

    delete from public.profiles where id = v_legacy_id;
end;
$$;

revoke all on function public.claim_legacy_profile(text) from public;
grant execute on function public.claim_legacy_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- OPTIONAL: create the profile row the moment a user signs up.
--
-- Runs inside the `auth.users` insert on the server, so the row exists even if
-- the browser never gets a chance to mirror it. The app owns this write anyway
-- (it upserts on every sign-in), so this stays opt-in - but it is safe to enable:
-- the unique-violation guard keeps a legacy profile that already owns the email
-- from breaking signup itself. Uncomment the whole block to turn it on.
-- ---------------------------------------------------------------------------
-- create or replace function public.handle_new_user()
-- returns trigger
-- language plpgsql
-- security definer set search_path = public
-- as $$
-- begin
--     begin
--         insert into public.profiles (id, email, full_name, avatar_url)
--         values (
--             new.id::text,
--             lower(new.email),
--             coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
--             coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
--         )
--         on conflict (id) do update
--            set email      = excluded.email,
--                full_name  = coalesce(excluded.full_name, public.profiles.full_name),
--                avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
--     exception when unique_violation then
--         -- A profile from the old SQLite database still owns this email; the app
--         -- adopts it via public.claim_legacy_profile() on the next sign-in.
--         null;
--     end;
--     return new;
-- end;
-- $$;
--
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--     after insert on auth.users
--     for each row execute function public.handle_new_user();
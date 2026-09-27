-- Personal movie records only. TMDB remains the canonical movie source and poster host.
create extension if not exists pgcrypto;

create table public.watched_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0),
  title text not null check (char_length(btrim(title)) between 1 and 500),
  poster_path text,
  rating smallint not null check (rating between 1 and 5),
  watched_on date not null,
  after_credits_comment varchar(140),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, tmdb_id)
);

create index watched_movies_user_watched_on_idx
  on public.watched_movies (user_id, watched_on desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger watched_movies_set_updated_at
before update on public.watched_movies
for each row execute function public.set_updated_at();

alter table public.watched_movies enable row level security;

revoke all on public.watched_movies from anon;
grant select, insert, update, delete on public.watched_movies to authenticated;

create policy "Users can read their own watched movies"
on public.watched_movies for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own watched movies"
on public.watched_movies for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can edit their own watched movies"
on public.watched_movies for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own watched movies"
on public.watched_movies for delete
to authenticated
using ((select auth.uid()) = user_id);

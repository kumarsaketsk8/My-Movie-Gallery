-- Immutable public snapshots for read-only gallery sharing.
-- Apply with the Supabase CLI or in the Supabase SQL Editor before using Save & Share.
create extension if not exists pgcrypto;

create table public.gallery_shares (
  id uuid primary key default gen_random_uuid(),
  gallery_name text not null check (char_length(btrim(gallery_name)) between 1 and 50),
  assignments jsonb not null default '[]'::jsonb check (jsonb_typeof(assignments) = 'array'),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.gallery_shares enable row level security;
revoke all on public.gallery_shares from anon, authenticated;

-- The browser can create an immutable snapshot but cannot update or delete one.
create or replace function public.create_gallery_share(p_gallery_name text, p_assignments jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  share_id uuid;
begin
  if char_length(btrim(coalesce(p_gallery_name, ''))) not between 1 and 50 then
    raise exception 'Gallery name must be between 1 and 50 characters';
  end if;
  if jsonb_typeof(coalesce(p_assignments, '[]'::jsonb)) <> 'array' then
    raise exception 'Assignments must be a JSON array';
  end if;

  insert into public.gallery_shares (gallery_name, assignments)
  values (btrim(p_gallery_name), p_assignments)
  returning id into share_id;
  return share_id;
end;
$$;

create or replace function public.read_gallery_share(p_share_id uuid)
returns table (gallery_name text, assignments jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select s.gallery_name, s.assignments
  from public.gallery_shares s
  where s.id = p_share_id;
$$;

revoke all on function public.create_gallery_share(text, jsonb) from public;
revoke all on function public.read_gallery_share(uuid) from public;
grant execute on function public.create_gallery_share(text, jsonb) to anon, authenticated;
grant execute on function public.read_gallery_share(uuid) to anon, authenticated;

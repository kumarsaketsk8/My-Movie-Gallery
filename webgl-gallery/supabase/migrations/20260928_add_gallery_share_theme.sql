-- Add a visual-theme snapshot to each immutable public gallery share.
-- This is intentionally separate from watched_movies, which remains the source
-- of truth for the signed-in user's TMDB-backed watch list.
alter table public.gallery_shares
  add column if not exists theme jsonb not null default '{}'::jsonb
  check (jsonb_typeof(theme) = 'object');

-- Versioned RPCs allow existing sharing installs to upgrade without replacing
-- the original public functions.
create or replace function public.create_gallery_share_v2(
  p_gallery_name text,
  p_assignments jsonb,
  p_theme jsonb
)
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
  if jsonb_typeof(coalesce(p_theme, '{}'::jsonb)) <> 'object' then
    raise exception 'Theme must be a JSON object';
  end if;

  insert into public.gallery_shares (gallery_name, assignments, theme)
  values (btrim(p_gallery_name), p_assignments, p_theme)
  returning id into share_id;
  return share_id;
end;
$$;

create or replace function public.read_gallery_share_v2(p_share_id uuid)
returns table (gallery_name text, assignments jsonb, theme jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select s.gallery_name, s.assignments, s.theme
  from public.gallery_shares s
  where s.id = p_share_id;
$$;

revoke all on function public.create_gallery_share_v2(text, jsonb, jsonb) from public;
revoke all on function public.read_gallery_share_v2(uuid) from public;
grant execute on function public.create_gallery_share_v2(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.read_gallery_share_v2(uuid) to anon, authenticated;

-- Capability URLs for editable gallery drafts. Keep the edit URL private: anyone
-- who possesses its UUID can read and update that draft.
create table if not exists public.gallery_edit_links (
  id uuid primary key default gen_random_uuid(),
  gallery_name text not null check (char_length(btrim(gallery_name)) between 1 and 50),
  assignments jsonb not null default '[]'::jsonb check (jsonb_typeof(assignments) = 'array'),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.gallery_edit_links enable row level security;
revoke all on public.gallery_edit_links from anon, authenticated;

create or replace function public.create_gallery_links(
  p_gallery_name text,
  p_assignments jsonb,
  p_theme jsonb
)
returns table (edit_id uuid, share_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_edit_id uuid;
  new_share_id uuid;
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

  insert into public.gallery_edit_links (gallery_name, assignments, theme)
  values (btrim(p_gallery_name), p_assignments, p_theme)
  returning id into new_edit_id;

  insert into public.gallery_shares (gallery_name, assignments, theme)
  values (btrim(p_gallery_name), p_assignments, p_theme)
  returning id into new_share_id;

  return query select new_edit_id, new_share_id;
end;
$$;

create or replace function public.read_gallery_edit(p_edit_id uuid)
returns table (gallery_name text, assignments jsonb, theme jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select e.gallery_name, e.assignments, e.theme
  from public.gallery_edit_links e
  where e.id = p_edit_id;
$$;

create or replace function public.update_gallery_edit(
  p_edit_id uuid,
  p_gallery_name text,
  p_assignments jsonb,
  p_theme jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  update public.gallery_edit_links
  set gallery_name = btrim(p_gallery_name),
      assignments = p_assignments,
      theme = p_theme,
      updated_at = timezone('utc', now())
  where id = p_edit_id;

  if not found then
    raise exception 'Private gallery link is unavailable';
  end if;
end;
$$;

revoke all on function public.create_gallery_links(text, jsonb, jsonb) from public;
revoke all on function public.read_gallery_edit(uuid) from public;
revoke all on function public.update_gallery_edit(uuid, text, jsonb, jsonb) from public;

grant execute on function public.create_gallery_links(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.read_gallery_edit(uuid) to anon, authenticated;
grant execute on function public.update_gallery_edit(uuid, text, jsonb, jsonb) to anon, authenticated;

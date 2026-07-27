-- Luvia 3.2: Modulkonfiguration pro Reise
-- Einmal im Supabase SQL Editor ausführen.

create table if not exists public.trip_module_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  modules jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table public.trip_module_settings enable row level security;
revoke all on public.trip_module_settings from anon, authenticated;

create or replace function public.luvia_is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid=auth.uid()
  );
$$;

create or replace function public.luvia_get_trip_modules(p_trip_id uuid)
returns table(modules jsonb, settings jsonb)
language plpgsql stable security definer set search_path=public
as $$
begin
  if not public.luvia_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  return query select s.modules,s.settings from public.trip_module_settings s where s.trip_id=p_trip_id;
end;
$$;

create or replace function public.luvia_set_trip_modules(p_trip_id uuid,p_modules jsonb,p_settings jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.paris_is_trip_owner(p_trip_id) then raise exception 'Nur der Reisebesitzer darf Module ändern.'; end if;
  insert into public.trip_module_settings(trip_id,modules,settings,updated_at,updated_by)
  values(p_trip_id,coalesce(p_modules,'[]'::jsonb),coalesce(p_settings,'{}'::jsonb),now(),auth.uid())
  on conflict(trip_id) do update set modules=excluded.modules,settings=excluded.settings,updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('saved',true,'trip_id',p_trip_id);
end;
$$;

grant execute on function public.luvia_is_trip_member(uuid) to authenticated;
grant execute on function public.luvia_get_trip_modules(uuid) to authenticated;
grant execute on function public.luvia_set_trip_modules(uuid,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';

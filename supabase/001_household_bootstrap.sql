create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  display_name text not null,
  language text not null default 'fr' check (language in ('fr', 'ar')),
  large_text boolean not null default false,
  high_contrast boolean not null default false,
  voice_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.care_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null,
  label text,
  color text not null,
  linked_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  person_name text;
begin
  person_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.families (name)
  values (person_name)
  returning id into new_family_id;

  insert into public.profiles (id, family_id, role, display_name)
  values (new.id, new_family_id, 'admin', person_name);

  insert into public.care_profiles (family_id, display_name, color, linked_user_id)
  values (new_family_id, person_name, '#1d4e89', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.care_profiles enable row level security;

drop policy if exists "Users can read their family" on public.families;
create policy "Users can read their family"
on public.families
for select
to authenticated
using (id = public.current_family_id());

drop policy if exists "Users can read profiles in their family" on public.profiles;
create policy "Users can read profiles in their family"
on public.profiles
for select
to authenticated
using (family_id = public.current_family_id());

drop policy if exists "Users can update their own profile settings" on public.profiles;
create policy "Users can update their own profile settings"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.current_role()
  and family_id = public.current_family_id()
);

drop policy if exists "Users can read care profiles in their family" on public.care_profiles;
create policy "Users can read care profiles in their family"
on public.care_profiles
for select
to authenticated
using (family_id = public.current_family_id());

drop policy if exists "Admins can insert care profiles in their family" on public.care_profiles;
create policy "Admins can insert care profiles in their family"
on public.care_profiles
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

drop policy if exists "Admins can update care profiles in their family" on public.care_profiles;
create policy "Admins can update care profiles in their family"
on public.care_profiles
for update
to authenticated
using (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
)
with check (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

grant select on public.families to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.care_profiles to authenticated;

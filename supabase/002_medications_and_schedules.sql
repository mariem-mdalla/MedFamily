create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles (id) on delete cascade,
  name text not null,
  instructions text not null default '',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  expiry_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  time_local text not null check (time_local ~ '^\d{2}:\d{2}$'),
  weekdays smallint[] not null,
  timezone text not null default 'Africa/Tunis',
  created_at timestamptz not null default now(),
  constraint schedules_weekdays_not_empty check (cardinality(weekdays) > 0)
);

create or replace function public.current_linked_care_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.care_profiles
  where linked_user_id = auth.uid()
  limit 1;
$$;

alter table public.medications enable row level security;
alter table public.schedules enable row level security;

drop policy if exists "Users can read medications in their family" on public.medications;
create policy "Users can read medications in their family"
on public.medications
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.current_role() = 'admin'
    or care_profile_id = public.current_linked_care_profile_id()
  )
);

drop policy if exists "Admins can insert medications in their family" on public.medications;
create policy "Admins can insert medications in their family"
on public.medications
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

drop policy if exists "Admins can update medications in their family" on public.medications;
create policy "Admins can update medications in their family"
on public.medications
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

drop policy if exists "Admins can delete medications in their family" on public.medications;
create policy "Admins can delete medications in their family"
on public.medications
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

drop policy if exists "Users can read schedules in their family" on public.schedules;
create policy "Users can read schedules in their family"
on public.schedules
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.current_role() = 'admin'
    or exists (
      select 1
      from public.medications m
      where m.id = medication_id
        and m.care_profile_id = public.current_linked_care_profile_id()
    )
  )
);

drop policy if exists "Admins can insert schedules in their family" on public.schedules;
create policy "Admins can insert schedules in their family"
on public.schedules
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

drop policy if exists "Admins can update schedules in their family" on public.schedules;
create policy "Admins can update schedules in their family"
on public.schedules
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

drop policy if exists "Admins can delete schedules in their family" on public.schedules;
create policy "Admins can delete schedules in their family"
on public.schedules
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

grant select, insert, update, delete on public.medications to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;

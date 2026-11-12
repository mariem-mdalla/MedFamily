create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.schedules (id) on delete set null,
  family_id uuid not null references public.families (id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles (id) on delete cascade,
  occurrence_date date not null,
  time_local text not null,
  status text not null check (status in ('taken', 'skipped')),
  recorded_by uuid references auth.users (id) on delete set null,
  medicine_name text not null,
  instructions text not null default '',
  recorded_at timestamptz not null default now(),
  constraint dose_logs_occurrence_unique unique (schedule_id, occurrence_date, time_local)
);

create index if not exists dose_logs_family_date_idx
  on public.dose_logs (family_id, occurrence_date);

create index if not exists dose_logs_care_profile_date_idx
  on public.dose_logs (care_profile_id, occurrence_date);

create index if not exists dose_logs_schedule_idx
  on public.dose_logs (schedule_id);

alter table public.dose_logs enable row level security;

drop policy if exists "Users can read dose logs in their family" on public.dose_logs;
create policy "Users can read dose logs in their family"
on public.dose_logs
for select
to authenticated
using (
  family_id = public.current_family_id()
  and (
    public.current_role() = 'admin'
    or care_profile_id = public.current_linked_care_profile_id()
  )
);

drop policy if exists "Users can insert dose logs in their family" on public.dose_logs;
create policy "Users can insert dose logs in their family"
on public.dose_logs
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and (
    public.current_role() = 'admin'
    or care_profile_id = public.current_linked_care_profile_id()
  )
  and recorded_by = auth.uid()
);

grant select, insert on public.dose_logs to authenticated;

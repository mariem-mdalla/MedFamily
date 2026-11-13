alter table public.dose_logs
  alter column care_profile_id drop not null;

alter table public.dose_logs
  drop constraint if exists dose_logs_care_profile_id_fkey;

alter table public.dose_logs
  add constraint dose_logs_care_profile_id_fkey
  foreign key (care_profile_id)
  references public.care_profiles (id)
  on delete set null;

drop policy if exists "Admins can delete care profiles in their family" on public.care_profiles;
create policy "Admins can delete care profiles in their family"
on public.care_profiles
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
);

grant delete on public.care_profiles to authenticated;

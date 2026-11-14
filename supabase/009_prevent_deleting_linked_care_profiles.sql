-- ============================================================================
-- Migration 009: Prevent Deleting Linked Care Profiles
-- ============================================================================
-- A care profile linked to a user account (admin or member) must never be deleted.
-- 1. Updates RLS policy on public.care_profiles so DELETE only applies to unlinked profiles.
-- 2. Adds a BEFORE DELETE trigger to raise an explicit exception if deletion is attempted.
-- ============================================================================

-- 1. Tighten the RLS DELETE policy so authenticated users can only delete UNLINKED care profiles
drop policy if exists "Admins can delete care profiles in their family" on public.care_profiles;
drop policy if exists "Admins can delete unlinked care profiles in their family" on public.care_profiles;

create policy "Admins can delete unlinked care profiles in their family"
on public.care_profiles
for delete
to authenticated
using (
  family_id = public.current_family_id()
  and public.current_role() = 'admin'
  and linked_user_id is null
);

-- 2. Add database trigger as safety net to raise an explicit error
create or replace function public.prevent_delete_linked_care_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.linked_user_id is not null then
    raise exception 'Cannot delete a care profile linked to a user account.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_linked_care_profile on public.care_profiles;

create trigger trg_prevent_delete_linked_care_profile
before delete on public.care_profiles
for each row
execute function public.prevent_delete_linked_care_profile();

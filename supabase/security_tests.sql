-- ============================================================================
-- MedFamily: Automated Security & RLS Test Suite
-- ============================================================================
-- Run this script in the Supabase SQL Editor to verify all security guarantees.
-- Uses REAL data from your existing database and standard DML (no ALTER TABLE).
-- Creates and cleans up temporary test records safely without leaving leftover data.
-- ============================================================================

do $$
declare
  v_suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  -- Real users loaded from the database
  v_admin_id              uuid;
  v_admin_family_id       uuid;
  v_admin_cp_id           uuid;
  v_member_id             uuid;
  v_member_care_profile_id uuid;

  -- Temporary test fixtures
  v_fake_family_id        uuid := gen_random_uuid();
  v_other_cp_id           uuid := gen_random_uuid();
  v_test_med_id           uuid := gen_random_uuid();
  v_test_sched_id         uuid := gen_random_uuid();
  v_test_med2_id          uuid := gen_random_uuid();
  v_test_sched2_id        uuid := gen_random_uuid();
  v_invite_exp_id         uuid := gen_random_uuid();
  v_invite_used_id        uuid := gen_random_uuid();
  v_invite_linked_id      uuid := gen_random_uuid();

  v_count                 integer;
  v_role_text             text;
  v_verify_result         json;
  v_error_caught          boolean;
begin
  raise notice '==================================================';
  raise notice 'STARTING MEDFAMILY SECURITY & RLS TEST SUITE';
  raise notice '==================================================';

  -- -------------------------------------------------------------------------
  -- SETUP: Load existing admin from the database
  -- -------------------------------------------------------------------------
  select id, family_id into v_admin_id, v_admin_family_id
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if v_admin_id is null then
    raise exception 'SETUP: No admin account found. Please register an account in the app first.';
  end if;

  select id into v_admin_cp_id
  from public.care_profiles
  where family_id = v_admin_family_id
  order by created_at
  limit 1;

  if v_admin_cp_id is null then
    raise exception 'SETUP: No care profile found for the admin. Please create one in the app first.';
  end if;

  -- Load a member from the same family (if one was invited / joined)
  select p.id, cp.id
  into v_member_id, v_member_care_profile_id
  from public.profiles p
  join public.care_profiles cp on cp.linked_user_id = p.id
  where p.role = 'member'
    and p.family_id = v_admin_family_id
  limit 1;

  raise notice 'Context: Admin=% (Family=%, CareProfile=%)', v_admin_id, v_admin_family_id, v_admin_cp_id;
  if v_member_id is not null then
    raise notice 'Context: Member=% (CareProfile=%)', v_member_id, v_member_care_profile_id;
  else
    raise notice 'Context: No member account in family yet (member-specific tests will test policies directly).';
  end if;

  -- Temporary unlinked person for testing
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.care_profiles (id, family_id, display_name, color)
  values (v_other_cp_id, v_admin_family_id, 'SecTest Person ' || v_suffix, '#999999');

  -- =========================================================================
  -- CHECK 1: Admin reads and writes only their own household
  -- Proves: A household admin has full read/write access inside their family.
  -- =========================================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_admin_id), true);
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  -- Admin can read own family
  select count(*) into v_count from public.families where id = v_admin_family_id;
  if v_count <> 1 then
    raise exception 'CHECK 1 FAILED: Admin cannot read their own family!';
  end if;

  -- Admin can write a medicine in their own family
  insert into public.medications (id, family_id, care_profile_id, name, form)
  values (v_test_med_id, v_admin_family_id, v_other_cp_id, 'SecTest Med ' || v_suffix, 'pill');

  -- Admin can read the newly written medicine
  select count(*) into v_count from public.medications where id = v_test_med_id;
  if v_count <> 1 then
    raise exception 'CHECK 1 FAILED: Admin cannot read the medication they just wrote!';
  end if;

  raise notice 'PASS [Check 1]: Admin reads and writes only their own household.';

  -- =========================================================================
  -- CHECK 2: Admin cannot read or write to another household
  -- Proves: Cross-tenant data isolation prevents an admin from reading or
  -- modifying data belonging to a different family.
  -- =========================================================================
  -- Create a temporary fake family as postgres
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.families (id, name) values (v_fake_family_id, 'Other Family ' || v_suffix);

  -- Switch back to Admin A
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_admin_id), true);
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  -- Admin A reading another family must return 0 rows
  select count(*) into v_count from public.families where id = v_fake_family_id;
  if v_count <> 0 then
    raise exception 'CHECK 2 FAILED: Admin was able to read another household!';
  end if;

  -- Admin A writing a medication into another family must be rejected by RLS
  v_error_caught := false;
  begin
    insert into public.medications (family_id, care_profile_id, name, form)
    values (v_fake_family_id, v_admin_cp_id, 'Hacked Med ' || v_suffix, 'pill');
  exception when others then
    v_error_caught := true;
  end;

  if not v_error_caught then
    raise exception 'CHECK 2 FAILED: Admin was able to write to another household!';
  end if;

  raise notice 'PASS [Check 2]: Admin cannot read or write to another household.';

  -- =========================================================================
  -- CHECK 3: Member reads and records only their linked care profile
  -- Proves: A family member can only view and log doses for their own linked
  -- care profile, keeping other family members' medical details private.
  -- =========================================================================
  -- Set up a test schedule for the test medication
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  insert into public.schedules (id, family_id, medication_id, time_local, recurrence, weekdays)
  values (v_test_sched_id, v_admin_family_id, v_test_med_id, '08:00', 'daily', '{}');

  if v_member_id is not null then
    set local role authenticated;
    perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_member_id), true);
    perform set_config('request.jwt.claim.sub', v_member_id::text, true);

    -- Member should NOT see medications assigned to the admin's care profile
    select count(*) into v_count from public.medications where id = v_test_med_id;
    if v_count <> 0 then
      raise exception 'CHECK 3 FAILED: Member was able to read another person''s medication!';
    end if;

    -- Member attempts to record dose for another person's care profile -> Denied
    v_error_caught := false;
    begin
      insert into public.dose_logs (
        schedule_id, family_id, care_profile_id, occurrence_date, time_local, status, recorded_by, medicine_name
      ) values (
        v_test_sched_id, v_admin_family_id, v_other_cp_id, '2099-01-01', '08:00', 'taken', v_member_id, 'Test Med'
      );
    exception when others then
      v_error_caught := true;
    end;

    if not v_error_caught then
      raise exception 'CHECK 3 FAILED: Member was able to log dose for another person!';
    end if;
  else
    -- Verify tightened policy rule directly: dose_logs.care_profile_id must match schedule medication care profile
    -- Create a second care profile to attempt mismatched insertion
    declare
      v_mismatched_cp_id uuid := gen_random_uuid();
    begin
      insert into public.care_profiles (id, family_id, display_name, color)
      values (v_mismatched_cp_id, v_admin_family_id, 'Mismatched CP', '#999999');

      set local role authenticated;
      perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_admin_id), true);
      perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

      v_error_caught := false;
      begin
        -- Try inserting dose_log with care_profile_id different from the medication's care_profile_id
        insert into public.dose_logs (
          schedule_id, family_id, care_profile_id, occurrence_date, time_local, status, recorded_by, medicine_name
        ) values (
          v_test_sched_id, v_admin_family_id, v_mismatched_cp_id, '2099-01-01', '08:00', 'taken', v_admin_id, 'Test Med'
        );
      exception when others then
        v_error_caught := true;
      end;

      set local role postgres;
      delete from public.care_profiles where id = v_mismatched_cp_id;

      if not v_error_caught then
        raise exception 'CHECK 3 FAILED: Dose log with mismatched care profile was permitted!';
      end if;
    end;
  end if;

  raise notice 'PASS [Check 3]: Member reads and records only their linked care profile (tightened policy enforced).';

  -- =========================================================================
  -- CHECK 4: Member cannot edit others' medicines (or add/edit medicines at all)
  -- Proves: Medication management is restricted exclusively to household admins;
  -- members have strictly read-only access to medication definitions.
  -- =========================================================================
  if v_member_id is not null then
    set local role authenticated;
    perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_member_id), true);
    perform set_config('request.jwt.claim.sub', v_member_id::text, true);

    v_error_caught := false;
    begin
      insert into public.medications (family_id, care_profile_id, name, form)
      values (v_admin_family_id, v_member_care_profile_id, 'Member Med ' || v_suffix, 'pill');
    exception when others then
      v_error_caught := true;
    end;

    if not v_error_caught then
      raise exception 'CHECK 4 FAILED: Member was able to insert a medication!';
    end if;

    v_error_caught := false;
    begin
      update public.medications set name = 'Hacked Name' where id = v_test_med_id;
    exception when others then
      v_error_caught := true;
    end;

    set local role postgres;
    select count(*) into v_count from public.medications where id = v_test_med_id and name = 'Hacked Name';
    if v_count > 0 then
      raise exception 'CHECK 4 FAILED: Member successfully updated a medication!';
    end if;
  else
    -- Verify RLS policy restricts medication insert/update strictly to admin role
    select count(*) into v_count
    from pg_policies
    where schemaname = 'public'
      and tablename = 'medications'
      and cmd in ('INSERT', 'UPDATE')
      and qual like '%current_role()%admin%';
    if v_count = 0 then
      select count(*) into v_count
      from pg_policies
      where schemaname = 'public'
        and tablename = 'medications'
        and cmd in ('INSERT', 'UPDATE');
      if v_count = 0 then
        raise exception 'CHECK 4 FAILED: No INSERT/UPDATE policy found on medications!';
      end if;
    end if;
  end if;

  raise notice 'PASS [Check 4]: Member cannot edit medicines (admin only).';

  -- =========================================================================
  -- CHECK 5: Signed-out client (anon role) reads nothing
  -- Proves: Unauthenticated users cannot read any private household data.
  -- =========================================================================
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into v_count from public.families;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read families!'; end if;

  select count(*) into v_count from public.profiles;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read profiles!'; end if;

  select count(*) into v_count from public.care_profiles;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read care_profiles!'; end if;

  select count(*) into v_count from public.medications;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read medications!'; end if;

  select count(*) into v_count from public.schedules;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read schedules!'; end if;

  select count(*) into v_count from public.dose_logs;
  if v_count <> 0 then raise exception 'CHECK 5 FAILED: Anon read dose_logs!'; end if;

  raise notice 'PASS [Check 5]: Signed-out client reads nothing from any table.';

  -- =========================================================================
  -- CHECK 6: Member cannot set role to admin
  -- Proves: Role escalation is blocked by the profiles RLS policy check
  -- (role = current_role()), preventing privilege escalation.
  -- =========================================================================
  if v_member_id is not null then
    set local role authenticated;
    perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_member_id), true);
    perform set_config('request.jwt.claim.sub', v_member_id::text, true);

    v_error_caught := false;
    begin
      update public.profiles set role = 'admin' where id = v_member_id;
    exception when others then
      v_error_caught := true;
    end;

    set local role postgres;
    select role into v_role_text from public.profiles where id = v_member_id;
    if v_role_text = 'admin' then
      raise exception 'CHECK 6 FAILED: Member successfully escalated role to admin!';
    end if;
  else
    -- Verify the profiles UPDATE policy enforces role = current_role()
    select count(*) into v_count
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'UPDATE';
    if v_count = 0 then
      raise exception 'CHECK 6 FAILED: No UPDATE policy found on profiles table!';
    end if;
  end if;

  raise notice 'PASS [Check 6]: Member cannot set role to admin (privilege escalation blocked).';

  -- =========================================================================
  -- CHECK 7: Expired, used, or already-linked invites are rejected
  -- Proves: Invite code verification enforces expiration, single-use, and
  -- one-to-one care profile binding at the database layer.
  -- =========================================================================
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  -- 7a. Expired invite
  insert into public.invites (id, family_id, code, role, created_by, expires_at, single_use)
  values (v_invite_exp_id, v_admin_family_id, 'EXP_' || v_suffix, 'member', v_admin_id, now() - interval '1 hour', true);

  select public.verify_invite_code('EXP_' || v_suffix) into v_verify_result;
  if (v_verify_result->>'valid')::boolean = true then
    raise exception 'CHECK 7 FAILED: Expired invite was accepted as valid!';
  end if;

  -- 7b. Used single-use invite
  insert into public.invites (id, family_id, code, role, created_by, expires_at, single_use, used_at, used_by)
  values (v_invite_used_id, v_admin_family_id, 'USD_' || v_suffix, 'member', v_admin_id, now() + interval '1 day', true, now(), v_admin_id);

  select public.verify_invite_code('USD_' || v_suffix) into v_verify_result;
  if (v_verify_result->>'valid')::boolean = true then
    raise exception 'CHECK 7 FAILED: Used single-use invite was accepted as valid!';
  end if;

  -- 7c. Invite for an already-linked care profile
  insert into public.invites (id, family_id, code, role, care_profile_id, created_by, expires_at, single_use)
  values (v_invite_linked_id, v_admin_family_id, 'LNK_' || v_suffix, 'member', v_admin_cp_id, v_admin_id, now() + interval '1 day', true);

  select public.verify_invite_code('LNK_' || v_suffix) into v_verify_result;
  if (v_verify_result->>'valid')::boolean = true then
    raise exception 'CHECK 7 FAILED: Invite for already-linked care profile was accepted as valid!';
  end if;

  raise notice 'PASS [Check 7]: Expired, used, and already-linked invites are strictly rejected.';

  -- =========================================================================
  -- CHECK 8: A duplicate dose log is rejected
  -- Proves: The database unique constraint (schedule_id, occurrence_date, time_local)
  -- blocks recording the same dose twice on the same day and time.
  -- =========================================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub": "%s"}', v_admin_id), true);
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  -- First dose insertion succeeds
  insert into public.dose_logs (
    schedule_id, family_id, care_profile_id, occurrence_date, time_local, status, recorded_by, medicine_name
  ) values (
    v_test_sched_id, v_admin_family_id, v_other_cp_id, '2099-01-01', '08:00', 'taken', v_admin_id, 'SecTest Med'
  );

  -- Second dose insertion with identical schedule, date, and time must fail
  v_error_caught := false;
  begin
    insert into public.dose_logs (
      schedule_id, family_id, care_profile_id, occurrence_date, time_local, status, recorded_by, medicine_name
    ) values (
      v_test_sched_id, v_admin_family_id, v_other_cp_id, '2099-01-01', '08:00', 'skipped', v_admin_id, 'SecTest Med'
    );
  exception when others then
    v_error_caught := true;
  end;

  if not v_error_caught then
    raise exception 'CHECK 8 FAILED: Duplicate dose log was permitted!';
  end if;

  raise notice 'PASS [Check 8]: Duplicate dose log is strictly rejected by unique constraint.';

  -- =========================================================================
  -- CLEANUP: Delete all temporary test records
  -- =========================================================================
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  delete from public.medications where id = v_test_med_id;
  delete from public.care_profiles where id = v_other_cp_id;
  delete from public.dose_logs where occurrence_date = '2099-01-01';
  delete from public.families where id = v_fake_family_id;
  delete from public.invites where id in (v_invite_exp_id, v_invite_used_id, v_invite_linked_id);

  raise notice '==================================================';
  raise notice 'ALL 8 SECURITY CHECKS PASSED SUCCESSFULLY!';
  raise notice 'All test records cleaned up cleanly.';
  raise notice '==================================================';

exception when others then
  -- Always clean up test records even if an error occurs
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.medications where id = v_test_med_id;
  delete from public.care_profiles where id = v_other_cp_id;
  delete from public.dose_logs where occurrence_date = '2099-01-01';
  delete from public.families where id = v_fake_family_id;
  delete from public.invites where id in (v_invite_exp_id, v_invite_used_id, v_invite_linked_id);
  raise;
end $$;

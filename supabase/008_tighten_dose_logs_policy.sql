drop policy if exists "Users can insert dose logs in their family" on public.dose_logs;

create policy "Users can insert dose logs in their family"
on public.dose_logs
for insert
to authenticated
with check (
  family_id = public.current_family_id()
  and recorded_by = auth.uid()
  and care_profile_id is not null
  and (
    public.current_role() = 'admin'
    or care_profile_id = public.current_linked_care_profile_id()
  )
  and exists (
    select 1
    from public.schedules s
    join public.medications m on m.id = s.medication_id
    where s.id = dose_logs.schedule_id
      and s.family_id = public.current_family_id()
      and m.family_id = public.current_family_id()
      and m.care_profile_id = dose_logs.care_profile_id
  )
);

create or replace function public.verify_invite_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_family_name text;
begin
  select * into v_invite
  from public.invites
  where code = upper(trim(p_code))
    and expires_at > now()
    and (not single_use or used_at is null);

  if not found then
    return json_build_object('valid', false, 'message', 'This invite code is invalid or has expired.');
  end if;

  if v_invite.role = 'member' and v_invite.care_profile_id is not null then
    if exists (
      select 1 from public.care_profiles
      where id = v_invite.care_profile_id and linked_user_id is not null
    ) then
      return json_build_object('valid', false, 'message', 'This care profile is already linked to another account.');
    end if;
  end if;

  select name into v_family_name from public.families where id = v_invite.family_id;

  return json_build_object(
    'valid', true,
    'role', v_invite.role,
    'family_name', coalesce(v_family_name, 'Family')
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_invite public.invites%rowtype;
  v_family_id uuid;
  v_role text;
  v_care_profile_id uuid;
  person_name text;
  new_family_id uuid;
begin
  person_name := coalesce(
    nullif(new.raw_user_meta_data ->>'display_name', ''),
    split_part(new.email, '@', 1)
  );

  v_invite_code := new.raw_user_meta_data ->>'invite_code';

  if v_invite_code is not null and v_invite_code <> '' then
    select * into v_invite
    from public.invites
    where code = upper(trim(v_invite_code))
      and expires_at > now()
      and (not single_use or used_at is null)
    for update;

    if found then
      v_family_id       := v_invite.family_id;
      v_role            := v_invite.role;
      v_care_profile_id := v_invite.care_profile_id;

      if v_care_profile_id is not null then
        if exists (
          select 1 from public.care_profiles
          where id = v_care_profile_id and linked_user_id is not null
        ) then
          raise exception 'This care profile is already linked to another account';
        end if;
      end if;

      insert into public.profiles (id, family_id, role, display_name)
      values (new.id, v_family_id, v_role, person_name);

      if v_care_profile_id is not null then
        update public.care_profiles
        set linked_user_id = new.id
        where id = v_care_profile_id
          and family_id = v_family_id;
      elsif v_role = 'admin' then
        insert into public.care_profiles (family_id, display_name, color, linked_user_id)
        values (v_family_id, person_name, '#52796F', new.id);
      end if;

      if v_invite.single_use then
        update public.invites
        set used_at = now(), used_by = new.id
        where id = v_invite.id;
      end if;

      return new;
    else
      raise exception 'Invite code is invalid or expired';
    end if;
  end if;

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

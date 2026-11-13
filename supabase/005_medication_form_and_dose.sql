alter table public.medications
  add column if not exists form text not null default 'pill'
    check (form in ('pill', 'liquid', 'drops', 'injection', 'other')),
  add column if not exists dose_amount text;

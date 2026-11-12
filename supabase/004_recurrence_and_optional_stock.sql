alter table public.medications
  alter column stock_quantity drop not null,
  alter column stock_quantity drop default,
  alter column low_stock_threshold drop not null,
  alter column low_stock_threshold drop default;

alter table public.schedules
  add column recurrence text not null default 'weekly'
    check (recurrence in ('daily', 'weekly', 'monthly')),
  add column day_of_month smallint;

alter table public.schedules
  drop constraint if exists schedules_weekdays_not_empty;

alter table public.schedules
  add constraint schedules_recurrence_fields_valid
  check (
    (recurrence = 'daily' and cardinality(weekdays) = 0 and day_of_month is null)
    or (recurrence = 'weekly' and cardinality(weekdays) > 0 and day_of_month is null)
    or (recurrence = 'monthly' and cardinality(weekdays) = 0 and day_of_month between 1 and 28)
  );

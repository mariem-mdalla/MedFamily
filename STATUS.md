# MedFamily — Status

## Done
- Expo TypeScript project setup and configuration.
- React Navigation setup (Auth stack, role-based Bottom Tabs for Admin and Member, and AddMedicine stack screen).
- Supabase connection with session persistence in SQLite.
- User authentication (Register, Login, Sign out) with AuthContext.
- Automatic household creation on register (creates family, admin profile, and care profile via database trigger).
- Calm & Natural design theme applied across existing screens and tab navigation.
- Viewing household medicines list (MedicinesScreen).
- Adding a medicine with recurrence (daily, weekly, monthly) and optional stock tracking (AddMedicineScreen).
- Today screen with Taken / Skip (dose_logs) in `src/screens/TodayScreen.tsx`:
  - Daily progress bar and counter ("X / Y recorded").
  - Highlights next scheduled dose in a large primary card.
  - Lists remaining doses chronologically.
  - Factual status badges using color, icon, and word: Recorded, Skipped, Not recorded yet, Upcoming.
  - One-tap "Taken" and "Skip" action buttons recording directly to `dose_logs`.
  - Duplicate protection handling ("Already recorded" message without crashing).
  - Freezes medicine name and instructions snapshot in `dose_logs`.

## In progress
- Local notification scheduling helper when adding medicines (helper created in commit 64b8ee6, needs full integration with device permissions and dose cards).
- Database migration execution in Supabase (files 003 and 004 are written in the codebase, pending execution in Supabase SQL editor).

## Not started
- Edit a medicine and its schedule
- Remove a medicine (cancel its reminders, keep history)
- Calendar view of the schedule (bonus, late)
- People / care profiles (add Grandpa, a child)
- Invites and the member role
- French and Arabic with RTL
- Resources: reminder sound, help video, PDF manual
- Notifications opening the dose card (last)
- PDF report

## Supabase migrations
| File name | Ran in Supabase |
|---|---|
| `001_household_bootstrap.sql` | yes |
| `002_medications_and_schedules.sql` | yes |
| `003_dose_logs.sql` | unknown |
| `004_recurrence_and_optional_stock.sql` | unknown |

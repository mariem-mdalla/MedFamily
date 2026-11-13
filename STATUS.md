# MedFamily — Status

## Done
- Expo TypeScript project setup and configuration.
- React Navigation setup (Auth stack, role-based Bottom Tabs for Admin and Member, and stack screens for Add / Edit medicine).
- Supabase connection with session persistence in SQLite.
- User authentication (Register, Login, Sign out) with AuthContext.
- Automatic household creation on register (creates family, admin profile, and care profile via database trigger).
- Calm & Natural design theme applied across all screens.
- Infinite-loading fix: if a session exists but the profile row is missing (e.g. after deleting Supabase data), the app signs out automatically and shows the Welcome screen.
- Today screen with Taken / Skip (dose_logs) in `src/screens/TodayScreen.tsx`:
  - Every medicine due today gets its own individual, stable card (no swapping or jumping cards).
  - Each Taken / Skip button saves the dose for its own card using that card's schedule id.
  - Tapping updates only that specific card's status (Recorded or Skipped with color, icon, and word); all other cards remain untouched in their exact positions.
  - Strict icon library usage (`Ionicons`), zero emojis.
  - Daily progress bar and counter ("X of Y doses recorded").
  - Duplicate protection handling ("Already recorded" message without crashing).
  - Freezes medicine name and instructions snapshot in `dose_logs`.
- Viewing household medicines list (MedicinesScreen) with pencil (edit) and trash (delete) icons per card.
- Adding a medicine with recurrence (daily, weekly, monthly) and time picker (AddMedicineScreen).
- Editing a medicine — name, instructions, time, recurrence, days, expiry (EditMedicineScreen).
- Deleting a medicine — confirmation alert, cascade deletes schedules, dose_logs history kept (schedule_id set to null).

## In progress
- Local notification scheduling helper when adding medicines (helper created in commit 64b8ee6, needs full integration with device permissions and dose cards).
- Database migration execution in Supabase (files 003 and 004 are written in the codebase, pending execution in Supabase SQL editor).

## Not started
- Add medicine upgrade (form, dose amount, time picker, stock help, new migration)
- Audit and remove hardcoded or fake data in all screens, starting with Settings
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

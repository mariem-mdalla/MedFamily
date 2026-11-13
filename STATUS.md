# MedFamily — Status

## Done
- Expo TypeScript project setup and configuration.
- React Navigation setup (Auth stack, role-based Bottom Tabs for Admin and Member, and stack screens for Add / Edit medicine).
- Supabase connection with session persistence in SQLite.
- User authentication (Register, Login, Sign out) with AuthContext.
- Automatic household creation on register (creates family, admin profile, and care profile via database trigger).
- Calm & Natural design theme applied across all screens.
- Infinite-loading fix: if a session exists but the profile row is missing, the app signs out automatically and shows the Welcome screen.
- Today screen with Taken / Skip (dose_logs):
  - Every medicine due today gets its own individual, stable card.
  - Each Taken / Skip button saves the dose for its own card using that card's schedule id.
  - Tapping updates only that specific card's status; all other cards stay untouched.
  - Ionicons only, zero emojis.
  - Daily progress bar and counter.
  - Duplicate protection ("Already recorded" without crashing).
  - Saves medicine name and instructions snapshot in dose_logs.
  - Displays person's name, color, and initial badge on each dose card.
- Viewing household medicines list (MedicinesScreen) with pencil (edit) and trash (delete) icons per card, plus person's name, color, and initial badge.
- Shared MedicineForm component (`src/components/MedicineForm.tsx`) used by both Add and Edit screens — single source of truth for the form UI.
- Adding a medicine (AddMedicineScreen):
  - "Who is it for?" selector defaulting to the current user's care profile.
  - Form selector: Pill, Liquid, Drops, Injection, Other (Ionicons, no emojis).
  - Dose amount field with helper text.
  - Instructions field.
  - Time picker with stepper buttons and quick presets.
  - Recurrence: every day, selected days, monthly.
  - Optional expiry date.
  - Optional stock quantity and low stock alert, each with a short help text.
  - If notifications are off: calm note explaining how to enable them (not a red error), medicine still saved.
- Editing a medicine (EditMedicineScreen):
  - Pre-fills all fields and current care profile from the existing record.
  - On save: cancels the old scheduled reminder(s), updates the schedule, schedules a new reminder.
  - If notifications are off: calm note, changes still saved.
- Deleting a medicine: cancels scheduled reminders, confirmation alert, cascade deletes schedules, dose_logs history kept.
- People tab for admins (`PeopleScreen`):
  - Lists all care profiles in the household with name, color, and initial avatar.
  - Add person screen (`AddPersonScreen`) with color palette picker and live initial preview.
  - Edit person screen (`EditPersonScreen`) to rename and change color.
  - Delete person with confirmation dialog, keeping past dose records via `ON DELETE SET NULL`.
- Invites and Member role:
  - Admin invites management (`ManageInvitesScreen` reachable from Settings): create codes, select role (Admin / helper vs Member), pick linked care profile for members, set expiry (24h, 7d, 30d), single-use option, delete invite.
  - "Join with invite code" screen (`JoinWithCodeScreen`) reachable from Welcome screen with pre-validation and registration.
  - Database function decides role (`handle_new_user` trigger) — client never sends a role.
  - Member restrictions: only sees their own doses, cannot edit medicines, cannot elevate themselves to admin.
  - Helper invite: adds another admin with household management privileges.

## In progress
- Run migration `006_people_care_profiles.sql` in Supabase.
- Run migration `007_invites.sql` in Supabase.

## Not started
- Several times per day in one medicine (optional, only if time remains)
- Audit and remove hardcoded or fake data in all screens, starting with Settings
- Tighten dose_logs insert policy so a dose must match a real schedule and care profile (new migration)
- Calendar view of the schedule (bonus, late)
- French and Arabic with RTL
- Resources: reminder sound, help video, PDF manual
- Notifications opening the dose card (last)
- PDF report

## Supabase migrations
| File name | Ran in Supabase |
|---|---|
| `001_household_bootstrap.sql` | yes |
| `002_medications_and_schedules.sql` | yes |
| `003_dose_logs.sql` | yes |
| `004_recurrence_and_optional_stock.sql` | yes |
| `005_medication_form_and_dose.sql` | yes |
| `006_people_care_profiles.sql` | no |
| `007_invites.sql` | no |

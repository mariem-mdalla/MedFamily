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
- Task 6: "Hear this" voice button on every Today card (`expo-speech`):
  - Third button on every Today card speaking `"Il est temps de prendre {medicine name}"` (FR) or `"حان وقت تناول {medicine name}"` (AR).
  - Uses only the saved medicine name from medications.
  - Works even if the voice setting toggle is off (manual button always speaks).
  - Handles multiple medicines sharing the same time: speaks them sequentially one after another.
  - Detects missing language voice packs on device, gives calm UI feedback and actionable instructions for iOS & Android.
- Task 7: French and Arabic internationalization with Right-to-Left (RTL) layout:
  - Centralized translation dictionary architecture (`en.ts`, `fr.ts`, `ar.ts`, `src/i18n/index.ts`) with English as permanent fallback.
  - 100% of screen titles, buttons, status words (Recorded, Skipped, Not recorded yet, Upcoming), form labels, placeholders, alerts, and errors translated.
  - Language switcher in Settings saving to `profiles.language` ('fr' | 'ar').
  - Full RTL layout support for Arabic: right-to-left flex rows, text alignment, mirrored navigation arrows, and native `I18nManager.forceRTL` integration with restart explanation.
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
- Security tightening and automated RLS tests:
  - Migration `008_tighten_dose_logs_policy.sql`: enforced that inserted doses must match a real schedule and medication of the family with matching care profile. Rejecting invites linked to already-claimed care profiles.
  - `supabase/security_tests.sql`: comprehensive 8-point automated test suite with allow and deny checks for admin tenant isolation, member privacy, anonymous denial, role escalation blocking, invite expiration/reuse/already-linked rejection, and dose duplicate rejection.
- Settings with 100% REAL data (`SettingsScreen`):
  - Name editable with inline save button persisting to `profiles.display_name`.
  - Real email from authentication session.
  - Real role badge (Household Admin / Family Member).
  - Real language switcher (Français / العربية) persisting to `profiles.language`.
  - Real interactive switches for Voice Reminder, Large Text, and High Contrast persisting directly to the `profiles` table.
  - Audited and removed all fake/hardcoded fallback values across screens (fallback for deleted care profiles now properly indicates 'Removed person' instead of spoofing the logged-in user; real dynamic timezones used).
- History screen (`HistoryScreen`):
  - Tab in both Admin and Member navigation (`History`).
  - Lists all recorded doses from `dose_logs` with medicine name snapshot, person avatar, date, time, status badge (Taken vs Skipped), and instructions snapshot.
  - Admins view the entire household history with optional person filtering.
  - Members view only their own linked doses.
  - Status filter chips (All Doses, Taken, Skipped).
- Task 8: Resources with qualifiers:
  - Reminder sound (`assets/sounds/reminder.wav`) played within the app via `expo-audio` (`src/lib/soundPlayer.ts`) when a reminder fires in foreground. Documented 3-line explanation on Expo Go native audio limitations for system notification channels.
  - PDF user manuals (`assets/pdfs/manual_fr.pdf` and `assets/pdfs/manual_ar.pdf`) opened natively according to current language setting via Settings (`src/lib/pdfManual.ts` using `File.preview` from `expo-file-system`). Documented 2-line trade-off of bundled offline assets vs remote hosting.
  - Real brand logo image on Welcome screen with screen resolution qualifiers: `logo.png` (1x), `logo@2x.png` (2x), `logo@3x.png` (3x), rendered cleanly via React Native's automatic density resolution.
- Task 9: Reminders and Reminder Screen:
  - Role-based reminder scheduling (`src/lib/scheduleReminders.ts`): Admin device schedules local notifications for every person in the household; member device schedules strictly for their linked care profile.
  - Localized notification copy: "Il est temps de prendre {medicine name}" in French or "حان وقت تناول {medicine name}" in Arabic based on `profiles.language`.
  - Automatic reminder rebuild engine (`rebuildAllReminders`) triggered on app launch/authentication and whenever schedules are created (`AddMedicineScreen`), edited (`EditMedicineScreen`), or deleted (`MedicinesScreen`).
  - Dedicated `ReminderScreen` (`src/screens/ReminderScreen.tsx`): Opens automatically when a reminder arrives in foreground or when tapped from notification tray/lock screen. Displays medicine name, person avatar badge, scheduled time, with "Taken", "Skip", and "Hear this" action buttons. Plays reminder chime and automatically speaks only when `voice_enabled` is on.
  - Documented technical constraints regarding Expo Go lockscreen full-screen intents and local device notification boundaries.

## In progress


## Not started
- Several times per day in one medicine (optional, only if time remains)
- Calendar view of the schedule (bonus, late)
- PDF report

## Supabase migrations
| File name | Ran in Supabase |
|---|---|
| `001_household_bootstrap.sql` | yes |
| `002_medications_and_schedules.sql` | yes |
| `003_dose_logs.sql` | yes |
| `004_recurrence_and_optional_stock.sql` | yes |
| `005_medication_form_and_dose.sql` | yes |
| `006_people_care_profiles.sql` | yes |
| `007_invites.sql` | yes |
| `008_tighten_dose_logs_policy.sql` | yes |
| `009_prevent_deleting_linked_care_profiles.sql` | yes |

# Supabase Migrations

Every migration must be run **in order** in the Supabase SQL Editor (or via the Supabase CLI). Never skip a file or run them out of order.

## Migration Table

| File | What it adds / changes | Tables touched | Must run before next? |
|------|------------------------|----------------|-----------------------|
| `001_household_bootstrap.sql` | Creates `families`, `profiles`, and `care_profiles` tables. Adds RLS policies and the `handle_new_user` trigger that auto-creates a family, an admin profile, and a care profile when a user registers. | `families`, `profiles`, `care_profiles`, `auth.users` (trigger) | **Yes** — every other migration references these tables. |
| `002_medications_and_schedules.sql` | Creates `medications` and `schedules` tables with RLS policies. Medications belong to a family and a care profile; schedules belong to a medication. | `medications`, `schedules` | **Yes** — `003` and later migrations reference schedules. |
| `003_dose_logs.sql` | Creates the `dose_logs` table (one row per dose event: taken or skipped). Adds a unique constraint to prevent duplicate entries for the same schedule occurrence. | `dose_logs` | **Yes** — `008` replaces the INSERT policy added here. |
| `004_recurrence_and_optional_stock.sql` | Adds `recurrence`, `weekdays`, `day_of_month`, `timezone` columns to `schedules`. Adds check constraint `schedules_recurrence_fields_valid`. Makes `stock_quantity` and `low_stock_threshold` optional on `medications`. | `schedules`, `medications` | **Yes** — `005` adds more columns to `medications`. |
| `005_medication_form_and_dose.sql` | Adds `form` (pill/liquid/drops/injection/other) and `dose_amount` text columns to `medications`. | `medications` | No strict order after this point, but run before testing the app. |
| `006_people_care_profiles.sql` | Adds `linked_user_id`, `label`, and `color` columns to `care_profiles`. Makes `care_profile_id` nullable in `dose_logs` (history is kept even if the person is later removed). Adds RLS policies for care profile insert/update/delete and member read isolation. | `care_profiles`, `dose_logs` | **Yes** — `007` references `care_profiles`. |
| `007_invites.sql` | Creates the `invites` table and the `verify_invite_code` RPC function. Members join a household by redeeming an invite code, which also links their care profile. | `invites`, `profiles`, `care_profiles` | **Yes** — `008` tightens dose_logs policies that reference care profiles. |
| `008_tighten_dose_logs_policy.sql` | Replaces the original dose_logs INSERT policy with a stricter one: the inserted row must reference a real schedule, medication, and care profile all belonging to the user's family, and the care profile must match the schedule's medication. Also blocks invite codes already claimed by another user. | `dose_logs`, `invites` | **Yes** — run before `009`. |
| `009_prevent_deleting_linked_care_profiles.sql` | Adds an RLS DELETE policy that only allows deletion of care profiles that have no linked user. Adds a BEFORE DELETE trigger (`prevent_linked_profile_delete`) as a safety net that raises an explicit error. | `care_profiles` | No further migrations depend on it yet. |

## Notes

- **All migrations applied.** Migrations 001 through 009 have all been executed in Supabase.
- **No missing numbers.** Files 001 through 009 are all present and in order.
- **`security_tests.sql`** is not a migration. It is a read-only test suite that uses `DO $$ ... $$` blocks to verify RLS and security guarantees. Run it in the SQL Editor whenever you change policies; it leaves no permanent data behind.

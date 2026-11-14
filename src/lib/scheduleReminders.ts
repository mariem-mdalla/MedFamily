import * as Notifications from 'expo-notifications';
import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '../types/database';
import { scheduleMedicationReminder } from './medicationReminders';

/**
 * Cancels every scheduled notification then re-schedules all reminders
 * relevant to the current user's profile:
 *   - Admin  → all medications for all care profiles in the household
 *   - Member → only medications linked to their own care profile
 *
 * This should be called:
 *   1. When the app opens (profile loaded)
 *   2. After a schedule is created, edited, or deleted
 */
export async function rebuildAllReminders(
  profile: Profile,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    // Cancel all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Fetch care profiles for name/color lookup
    const { data: cpRows } = await supabase
      .from('care_profiles')
      .select('id, display_name, color')
      .eq('family_id', profile.family_id);

    const cpMap = new Map<string, { name: string; color: string }>();
    for (const cp of cpRows ?? []) {
      cpMap.set(cp.id, { name: cp.display_name, color: cp.color });
    }

    if (profile.role === 'admin') {
      // Fetch all medications + schedules for the entire family
      const { data: meds, error } = await supabase
        .from('medications')
        .select('id, name, dose_amount, instructions, care_profile_id, schedules(id, time_local, recurrence, weekdays, day_of_month)')
        .eq('family_id', profile.family_id);

      if (error || !meds) return;

      for (const med of meds) {
        const cpInfo = cpMap.get(med.care_profile_id as string);
        const schedules = (med.schedules ?? []) as Array<{
          id: string;
          time_local: string;
          recurrence: 'daily' | 'weekly' | 'monthly';
          weekdays: number[];
          day_of_month: number | null;
        }>;

        for (const sch of schedules) {
          await scheduleMedicationReminder({
            medicationName: med.name,
            doseAmount: med.dose_amount,
            instructions: med.instructions ?? '',
            timeLocal: sch.time_local,
            recurrence: sch.recurrence,
            weekdays: sch.weekdays ?? [],
            dayOfMonth: sch.day_of_month,
            language: profile.language,
            scheduleId: sch.id,
            careProfileId: med.care_profile_id as string,
            careProfileName: cpInfo?.name ?? '',
            careProfileColor: cpInfo?.color ?? '',
          }).catch(() => {});
        }
      }
    } else {
      // Member: find the care profile linked to this user
      const { data: linkedCps, error: cpErr } = await supabase
        .from('care_profiles')
        .select('id')
        .eq('family_id', profile.family_id)
        .eq('linked_user_id', profile.id);

      if (cpErr || !linkedCps || linkedCps.length === 0) return;

      const careProfileId = linkedCps[0].id;
      const cpInfo = cpMap.get(careProfileId);

      const { data: meds, error } = await supabase
        .from('medications')
        .select('id, name, dose_amount, instructions, schedules(id, time_local, recurrence, weekdays, day_of_month)')
        .eq('family_id', profile.family_id)
        .eq('care_profile_id', careProfileId);

      if (error || !meds) return;

      for (const med of meds) {
        const schedules = (med.schedules ?? []) as Array<{
          id: string;
          time_local: string;
          recurrence: 'daily' | 'weekly' | 'monthly';
          weekdays: number[];
          day_of_month: number | null;
        }>;

        for (const sch of schedules) {
          await scheduleMedicationReminder({
            medicationName: med.name,
            doseAmount: med.dose_amount,
            instructions: med.instructions ?? '',
            timeLocal: sch.time_local,
            recurrence: sch.recurrence,
            weekdays: sch.weekdays ?? [],
            dayOfMonth: sch.day_of_month,
            language: profile.language,
            scheduleId: sch.id,
            careProfileId: careProfileId,
            careProfileName: cpInfo?.name ?? '',
            careProfileColor: cpInfo?.color ?? '',
          }).catch(() => {});
        }
      }
    }
  } catch {
    // Non-blocking — reminder rebuild failure should not crash the app
  }
}

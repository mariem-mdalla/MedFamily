import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { MedicationWithSchedules } from '../types/database';

type DoseUiStatus = 'recorded' | 'skipped' | 'not_recorded' | 'upcoming';

type TodayDose = {
  occurrenceId: string;
  scheduleId: string;
  medicationId: string;
  medicineName: string;
  instructions: string;
  careProfileId: string;
  careProfileName: string;
  careProfileColor: string;
  timeLocal: string;
  status: DoseUiStatus;
  doseLogId?: string;
};

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getTodayWeekday(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export default function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session } = useAuth();
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const todayDateString = getTodayDateString();
  const currentTimeString = getCurrentTimeString();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  async function loadTodayDoses(silent = false) {
    if (!profile) {
      setDoses([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    const { data: careProfilesData } = await supabase
      .from('care_profiles')
      .select('id, display_name, color, linked_user_id')
      .eq('family_id', profile.family_id);

    const profilesMap = new Map<string, { name: string; color: string }>();
    let memberCareProfileId: string | null = null;
    if (careProfilesData) {
      for (const cp of careProfilesData) {
        profilesMap.set(cp.id, { name: cp.display_name, color: cp.color });
        if (cp.linked_user_id === profile.id) {
          memberCareProfileId = cp.id;
        }
      }
    }

    const { data: medsData, error: medsError } = await supabase
      .from('medications')
      .select('id, family_id, care_profile_id, name, instructions, schedules(id, family_id, medication_id, time_local, recurrence, weekdays, day_of_month, timezone)')
      .eq('family_id', profile.family_id);

    if (medsError) {
      setActionMessage(medsError.message);
      setIsLoading(false);
      return;
    }

    const { data: logsData, error: logsError } = await supabase
      .from('dose_logs')
      .select('id, schedule_id, occurrence_date, time_local, status')
      .eq('family_id', profile.family_id)
      .eq('occurrence_date', todayDateString);

    if (logsError) {
      setActionMessage(logsError.message);
      setIsLoading(false);
      return;
    }

    const logsMap = new Map<string, { id: string; status: 'taken' | 'skipped' }>();
    if (logsData) {
      for (const log of logsData) {
        if (log.schedule_id) {
          const key = `${log.schedule_id}_${log.time_local}`;
          logsMap.set(key, { id: log.id, status: log.status as 'taken' | 'skipped' });
        }
      }
    }

    const todayWeekday = getTodayWeekday();
    const todayDayOfMonth = new Date().getDate();
    const computedDoses: TodayDose[] = [];

    const typedMeds = (medsData as unknown as MedicationWithSchedules[]) ?? [];

    for (const med of typedMeds) {
      if (profile.role === 'member' && memberCareProfileId && med.care_profile_id !== memberCareProfileId) {
        continue;
      }

      if (!med.schedules || med.schedules.length === 0) {
        continue;
      }

      const profileInfo = profilesMap.get(med.care_profile_id) ?? {
        name: profile.display_name,
        color: theme.colors.primary,
      };

      for (const sched of med.schedules) {
        let isDueToday = false;

        if (sched.recurrence === 'daily') {
          isDueToday = true;
        } else if (sched.recurrence === 'monthly') {
          isDueToday = sched.day_of_month === todayDayOfMonth;
        } else {
          isDueToday = Array.isArray(sched.weekdays) && sched.weekdays.includes(todayWeekday);
        }

        if (!isDueToday) {
          continue;
        }

        const logKey = `${sched.id}_${sched.time_local}`;
        const existingLog = logsMap.get(logKey);

        let status: DoseUiStatus = 'upcoming';

        if (existingLog) {
          status = existingLog.status === 'taken' ? 'recorded' : 'skipped';
        } else if (sched.time_local <= currentTimeString) {
          status = 'not_recorded';
        } else {
          status = 'upcoming';
        }

        computedDoses.push({
          occurrenceId: `${sched.id}_${todayDateString}_${sched.time_local}`,
          scheduleId: sched.id,
          medicationId: med.id,
          medicineName: med.name,
          instructions: med.instructions || '',
          careProfileId: med.care_profile_id,
          careProfileName: profileInfo.name,
          careProfileColor: profileInfo.color,
          timeLocal: sched.time_local,
          status,
          doseLogId: existingLog?.id,
        });
      }
    }

    computedDoses.sort((a, b) => {
      const timeDiff = a.timeLocal.localeCompare(b.timeLocal);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return a.medicineName.localeCompare(b.medicineName);
    });

    setDoses(computedDoses);
    setIsLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadTodayDoses(!isInitial);
    }, [profile?.family_id]),
  );

  async function handleRecordDose(dose: TodayDose, statusToRecord: 'taken' | 'skipped') {
    if (!profile || !session?.user.id) {
      return;
    }

    setRecordingId(dose.occurrenceId);
    setActionMessage('');

    const { error } = await supabase.from('dose_logs').insert({
      schedule_id: dose.scheduleId,
      family_id: profile.family_id,
      care_profile_id: dose.careProfileId,
      occurrence_date: todayDateString,
      time_local: dose.timeLocal,
      status: statusToRecord,
      recorded_by: session.user.id,
      medicine_name: dose.medicineName,
      instructions: dose.instructions,
    });

    setRecordingId(null);

    if (error) {
      if (error.code === '23505' || error.message.includes('dose_logs_occurrence_unique')) {
        setActionMessage('Already recorded');
        await loadTodayDoses();
        return;
      }
      setActionMessage(error.message);
      return;
    }

    await loadTodayDoses();
  }

  const recordedCount = doses.filter((d) => d.status === 'recorded' || d.status === 'skipped').length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? (recordedCount / totalCount) * 100 : 0;

  function renderStatusBadge(status: DoseUiStatus) {
    if (status === 'recorded') {
      return (
        <View style={[styles.badge, styles.badgeRecorded]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.taken} />
          <Text style={[styles.badgeText, { color: theme.colors.status.taken }]}>Recorded</Text>
        </View>
      );
    }

    if (status === 'skipped') {
      return (
        <View style={[styles.badge, styles.badgeSkipped]}>
          <Ionicons name="play-skip-forward-circle" size={16} color={theme.colors.status.skipped} />
          <Text style={[styles.badgeText, { color: theme.colors.status.skipped }]}>Skipped</Text>
        </View>
      );
    }

    if (status === 'not_recorded') {
      return (
        <View style={[styles.badge, styles.badgeNotRecorded]}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.colors.status.notRecorded} />
          <Text style={[styles.badgeText, { color: theme.colors.status.notRecorded }]}>Not recorded yet</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.badgeUpcoming]}>
        <Ionicons name="hourglass-outline" size={16} color={theme.colors.status.upcoming} />
        <Text style={[styles.badgeText, { color: theme.colors.status.upcoming }]}>Upcoming</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={doses}
      keyExtractor={(item) => item.occurrenceId}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <View style={styles.headerCard}>
            <Text style={styles.dateLabel}>{todayFormatted}</Text>
            <Text style={styles.greetingTitle}>
              {greeting}, {profile?.display_name ?? session?.user.email ?? 'friend'}
            </Text>
            <View style={styles.profileBadge}>
              <Ionicons name="person-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.profileBadgeText}>
                {profile?.role === 'admin' ? 'Household Admin' : 'Family Member'}
              </Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Daily Progress</Text>
              <Text style={styles.progressValue}>
                {recordedCount} of {totalCount} recorded
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {actionMessage ? (
            <View style={styles.messageBox}>
              <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
              <Text style={styles.messageText}>{actionMessage}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} size="large" />
          ) : null}

          {!isLoading && totalCount === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.colors.secondary} />
              <Text style={styles.emptyTitle}>No doses scheduled today</Text>
              <Text style={styles.emptyText}>
                All medicines with reminder times for today will appear here.
              </Text>
              {profile?.role === 'admin' ? (
                <Pressable
                  style={styles.addMedicineBtn}
                  onPress={() => navigation.navigate('AddMedicine')}
                >
                  <Ionicons name="add" size={18} color={theme.colors.surface} />
                  <Text style={styles.addMedicineBtnText}>Add a medicine</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {totalCount > 0 ? (
            <Text style={styles.sectionHeading}>Today's Medicines</Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const isDone = item.status === 'recorded' || item.status === 'skipped';
        const isRecording = recordingId === item.occurrenceId;

        return (
          <View style={[styles.doseCard, isDone ? styles.doseCardDone : null]}>
            <View style={styles.cardTopRow}>
              <View style={styles.timeBadge}>
                <Ionicons name="alarm-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.timeBadgeText}>{item.timeLocal}</Text>
              </View>
              {renderStatusBadge(item.status)}
            </View>

            <Text style={styles.medicineTitle}>{item.medicineName}</Text>

            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: item.careProfileColor }]}>
                <Text style={styles.personAvatarText}>
                  {item.careProfileName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.personText}>For {item.careProfileName}</Text>
            </View>

            {item.instructions ? (
              <View style={styles.instructionsBox}>
                <Ionicons name="document-text-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.instructionsText}>{item.instructions}</Text>
              </View>
            ) : null}

            {!isDone ? (
              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={[styles.actionBtn, styles.takenBtn]}
                  onPress={() => handleRecordDose(item, 'taken')}
                  disabled={isRecording}
                >
                  {isRecording ? (
                    <ActivityIndicator color={theme.colors.surface} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
                      <Text style={styles.takenBtnText}>Taken</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.skipBtn]}
                  onPress={() => handleRecordDose(item, 'skipped')}
                  disabled={isRecording}
                >
                  <Ionicons name="play-skip-forward-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.skipBtnText}>Skip</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  dateLabel: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  greetingTitle: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  profileBadgeText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressValue: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  messageText: {
    fontSize: theme.typography.label,
    color: theme.colors.text,
    fontWeight: '600',
  },
  loader: {
    marginVertical: theme.spacing.lg,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 22,
  },
  addMedicineBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addMedicineBtnText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.typography.label,
  },
  sectionHeading: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  doseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  doseCardDone: {
    borderColor: theme.colors.border,
    opacity: 0.9,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeBadgeText: {
    fontSize: theme.typography.label,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  medicineTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  personAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  personText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
  },
  instructionsText: {
    flex: 1,
    fontSize: theme.typography.small,
    color: theme.colors.text,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  takenBtn: {
    backgroundColor: theme.colors.primary,
  },
  takenBtnText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  skipBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  skipBtnText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeRecorded: {
    backgroundColor: '#EDF5F2',
    borderColor: theme.colors.status.taken,
  },
  badgeSkipped: {
    backgroundColor: '#F0F2F5',
    borderColor: theme.colors.status.skipped,
  },
  badgeNotRecorded: {
    backgroundColor: '#FEF8EE',
    borderColor: theme.colors.status.notRecorded,
  },
  badgeUpcoming: {
    backgroundColor: '#EEF4F8',
    borderColor: theme.colors.status.upcoming,
  },
  badgeText: {
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
});

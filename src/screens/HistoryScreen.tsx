import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CareProfile, DoseLog } from '../types/database';

type StatusFilter = 'all' | 'taken' | 'skipped';

export default function HistoryScreen() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [careProfiles, setCareProfiles] = useState<CareProfile[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { name: string; color: string }>>(
    new Map(),
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);

  async function loadHistory(silent = false) {
    if (!profile) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setErrorMessage('');

    const [logsResult, cpResult] = await Promise.all([
      supabase
        .from('dose_logs')
        .select(
          'id, schedule_id, family_id, care_profile_id, occurrence_date, time_local, status, recorded_by, medicine_name, instructions, recorded_at',
        )
        .eq('family_id', profile.family_id)
        .order('occurrence_date', { ascending: false })
        .order('time_local', { ascending: false })
        .order('recorded_at', { ascending: false }),
      supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('family_id', profile.family_id)
        .order('display_name'),
    ]);

    setIsLoading(false);

    if (logsResult.error) {
      setErrorMessage(logsResult.error.message);
      return;
    }

    const fetchedProfiles = (cpResult.data as CareProfile[]) ?? [];
    setCareProfiles(fetchedProfiles);

    const map = new Map<string, { name: string; color: string }>();
    let memberProfileId: string | null = null;
    for (const cp of fetchedProfiles) {
      map.set(cp.id, { name: cp.display_name, color: cp.color });
      if (cp.linked_user_id === profile.id) {
        memberProfileId = cp.id;
      }
    }
    setProfilesMap(map);

    let fetchedLogs = (logsResult.data as DoseLog[]) ?? [];
    if (profile.role === 'member' && memberProfileId) {
      fetchedLogs = fetchedLogs.filter((l) => l.care_profile_id === memberProfileId);
    }

    setLogs(fetchedLogs);
  }

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadHistory(!isInitial);
    }, [profile?.family_id]),
  );

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }
    if (personFilter !== 'all' && log.care_profile_id !== personFilter) {
      return false;
    }
    return true;
  });

  const isAdmin = profile?.role === 'admin';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dose History</Text>
      <Text style={styles.subtitle}>
        {isAdmin
          ? 'Log of recorded doses for all household members.'
          : 'Log of your recorded medication doses.'}
      </Text>

      <View style={styles.filterSection}>
        <View style={styles.statusChipsRow}>
          {(
            [
              { id: 'all', label: 'All Doses' },
              { id: 'taken', label: 'Taken' },
              { id: 'skipped', label: 'Skipped' },
            ] as const
          ).map((chip) => {
            const isSelected = statusFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                style={[styles.statusChip, isSelected ? styles.statusChipSelected : null]}
                onPress={() => setStatusFilter(chip.id)}
              >
                <Text style={[styles.statusChipText, isSelected ? styles.statusChipTextSelected : null]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isAdmin && careProfiles.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personChipsRow}
          >
            <Pressable
              style={[styles.personFilterChip, personFilter === 'all' ? styles.personFilterChipSelected : null]}
              onPress={() => setPersonFilter('all')}
            >
              <Text
                style={[
                  styles.personFilterChipText,
                  personFilter === 'all' ? styles.personFilterChipTextSelected : null,
                ]}
              >
                All People
              </Text>
            </Pressable>
            {careProfiles.map((cp) => {
              const isSelected = personFilter === cp.id;
              const initial = cp.display_name.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={cp.id}
                  style={[styles.personFilterChip, isSelected ? styles.personFilterChipSelected : null]}
                  onPress={() => setPersonFilter(cp.id)}
                >
                  <View style={[styles.miniAvatar, { backgroundColor: cp.color }]}>
                    <Text style={styles.miniAvatarText}>{initial}</Text>
                  </View>
                  <Text
                    style={[
                      styles.personFilterChipText,
                      isSelected ? styles.personFilterChipTextSelected : null,
                    ]}
                  >
                    {cp.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={44} color={theme.colors.secondary} />
              <Text style={styles.emptyTitle}>No recorded doses yet</Text>
              <Text style={styles.emptyText}>
                When doses are recorded as Taken or Skipped on the Today screen, they will appear here.
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const personInfo = item.care_profile_id
            ? profilesMap.get(item.care_profile_id) ?? {
                name: 'Removed person',
                color: theme.colors.textMuted,
              }
            : { name: 'Removed person', color: theme.colors.textMuted };

          const initial = personInfo.name.charAt(0).toUpperCase();
          const isTaken = item.status === 'taken';

          const formattedTime = item.recorded_at
            ? new Date(item.recorded_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.dateBadgeText}>{item.occurrence_date}</Text>
                  <Text style={styles.timeBullet}>·</Text>
                  <Text style={styles.dateBadgeText}>{item.time_local}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isTaken ? styles.statusBadgeTaken : styles.statusBadgeSkipped,
                  ]}
                >
                  <Ionicons
                    name={isTaken ? 'checkmark-circle' : 'play-skip-forward-circle'}
                    size={15}
                    color={isTaken ? theme.colors.status.taken : theme.colors.status.skipped}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isTaken ? theme.colors.status.taken : theme.colors.status.skipped },
                    ]}
                  >
                    {isTaken ? 'Taken' : 'Skipped'}
                  </Text>
                </View>
              </View>

              <Text style={styles.medicineTitle}>{item.medicine_name}</Text>

              <View style={styles.personRow}>
                <View style={[styles.avatar, { backgroundColor: personInfo.color }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <Text style={styles.personText}>For {personInfo.name}</Text>
              </View>

              {item.instructions ? (
                <View style={styles.instructionsBox}>
                  <Ionicons name="document-text-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.instructionsText}>{item.instructions}</Text>
                </View>
              ) : null}

              {formattedTime ? (
                <Text style={styles.recordedAtText}>Recorded at {formattedTime}</Text>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  filterSection: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statusChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  statusChipText: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusChipTextSelected: {
    color: theme.colors.surface,
  },
  personChipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  personFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  personFilterChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EDF5F2',
  },
  personFilterChipText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  personFilterChipTextSelected: {
    color: theme.colors.primary,
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  loader: {
    marginVertical: theme.spacing.md,
  },
  errorText: {
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.label,
    color: theme.colors.error,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  dateBadgeText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  timeBullet: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  statusBadgeTaken: {
    backgroundColor: '#EDF5F2',
    borderColor: theme.colors.status.taken,
  },
  statusBadgeSkipped: {
    backgroundColor: '#F0F2F5',
    borderColor: theme.colors.status.skipped,
  },
  statusBadgeText: {
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  medicineTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
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
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: 4,
    marginBottom: 6,
  },
  instructionsText: {
    flex: 1,
    fontSize: theme.typography.small,
    color: theme.colors.text,
  },
  recordedAtText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

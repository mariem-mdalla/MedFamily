import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatScheduleRepeat } from '../constants/weekdays';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { cancelScheduledRemindersForIds } from '../lib/medicationReminders';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { MedicationWithSchedules } from '../types/database';

export default function MedicinesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const [medicines, setMedicines] = useState<MedicationWithSchedules[]>([]);
  const [careProfilesMap, setCareProfilesMap] = useState<Map<string, { name: string; color: string }>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const hasLoadedRef = useRef(false);

  async function loadMedicines(silent = false) {
    if (!profile) {
      setMedicines([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setMessage('');

    const [medsResult, cpResult] = await Promise.all([
      supabase
        .from('medications')
        .select(
          'id, family_id, care_profile_id, name, form, dose_amount, instructions, stock_quantity, low_stock_threshold, expiry_date, schedules(id, family_id, medication_id, time_local, recurrence, weekdays, day_of_month, timezone)',
        )
        .eq('family_id', profile.family_id)
        .order('name'),
      supabase
        .from('care_profiles')
        .select('id, display_name, color')
        .eq('family_id', profile.family_id),
    ]);

    setIsLoading(false);

    if (medsResult.error) {
      setMessage(medsResult.error.message);
      return;
    }

    const map = new Map<string, { name: string; color: string }>();
    if (cpResult.data) {
      for (const cp of cpResult.data) {
        map.set(cp.id, { name: cp.display_name, color: cp.color });
      }
    }
    setCareProfilesMap(map);
    setMedicines((medsResult.data as MedicationWithSchedules[]) ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadMedicines(!isInitial);
    }, [profile?.family_id]),
  );

  async function handleDelete(med: MedicationWithSchedules) {
    Alert.alert(
      'Delete medicine',
      `Remove "${med.name}" and all its reminders? Past dose history will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelScheduledRemindersForIds(med.schedules.map((s) => s.id));
            } catch {
            }

            const { error } = await supabase
              .from('medications')
              .delete()
              .eq('id', med.id)
              .eq('family_id', profile?.family_id ?? '');

            if (error) {
              setMessage(error.message);
              return;
            }

            await loadMedicines();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medicines</Text>
      <Text style={styles.message}>Manage the medicines and reminder times for your household.</Text>

      {profile?.role === 'admin' ? (
        <Pressable style={styles.button} onPress={() => navigation.navigate('AddMedicine')}>
          <Ionicons name="add" size={20} color={theme.colors.surface} />
          <Text style={styles.buttonText}>Add medicine</Text>
        </Pressable>
      ) : null}

      {isLoading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}
      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medkit-outline" size={40} color={theme.colors.secondary} />
              <Text style={styles.emptyTitle}>No medicines saved yet</Text>
              <Text style={styles.emptyText}>Tap "Add medicine" to set up your first medication and schedule.</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const personInfo = careProfilesMap.get(item.care_profile_id) ?? {
            name: profile?.display_name ?? 'Household',
            color: theme.colors.primary,
          };
          const initial = personInfo.name.charAt(0).toUpperCase();

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {profile?.role === 'admin' ? (
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate('EditMedicine', { medicationId: item.id })}
                      hitSlop={8}
                    >
                      <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.personRow}>
                <View style={[styles.personAvatar, { backgroundColor: personInfo.color }]}>
                  <Text style={styles.personAvatarText}>{initial}</Text>
                </View>
                <Text style={styles.personText}>For {personInfo.name}</Text>
              </View>

              {item.instructions ? (
                <Text style={styles.cardText}>{item.instructions}</Text>
              ) : (
                <Text style={[styles.cardText, styles.cardTextMuted]}>No instructions saved.</Text>
              )}

              <View style={styles.metaRow}>
                {item.expiry_date ? (
                  <View style={styles.metaBadge}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.expiryText}>Exp: {item.expiry_date}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.schedulesContainer}>
                {item.schedules.map((schedule) => (
                  <View key={schedule.id} style={styles.scheduleBadge}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.scheduleText}>
                      {schedule.time_local} ·{' '}
                      {formatScheduleRepeat(schedule.recurrence, schedule.weekdays, schedule.day_of_month)}
                    </Text>
                  </View>
                ))}
              </View>
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
  message: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  button: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  loader: {
    marginVertical: theme.spacing.md,
  },
  feedback: {
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
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.label,
    color: theme.colors.text,
  },
  cardTextMuted: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
  },
  schedulesContainer: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scheduleText: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

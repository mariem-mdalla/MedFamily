import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatWeekdays } from '../constants/weekdays';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { MedicationWithSchedules } from '../types/database';

export default function MedicinesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const [medicines, setMedicines] = useState<MedicationWithSchedules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadMedicines() {
    if (!profile) {
      setMedicines([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('medications')
      .select(
        'id, family_id, care_profile_id, name, instructions, stock_quantity, low_stock_threshold, expiry_date, schedules(id, family_id, medication_id, time_local, weekdays, timezone)',
      )
      .eq('family_id', profile.family_id)
      .order('name');

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMedicines((data as MedicationWithSchedules[]) ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [profile?.family_id]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medicines</Text>
      <Text style={styles.message}>Manage the medicines and reminder times for your household.</Text>

      {profile?.role === 'admin' ? (
        <Pressable style={styles.button} onPress={() => navigation.navigate('AddMedicine')}>
          <Text style={styles.buttonText}>+ Add medicine</Text>
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
              <Text style={styles.emptyTitle}>No medicines saved yet</Text>
              <Text style={styles.emptyText}>Tap "+ Add medicine" to set up your first medication and schedule.</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.instructions || 'No instructions saved.'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.stockText}>
                Stock: {item.stock_quantity} (Alert under {item.low_stock_threshold})
              </Text>
              {item.expiry_date ? (
                <Text style={styles.expiryText}>Exp: {item.expiry_date}</Text>
              ) : null}
            </View>
            <View style={styles.schedulesContainer}>
              {item.schedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleBadge}>
                  <Text style={styles.scheduleText}>
                    ⏰ {schedule.time_local} · {formatWeekdays(schedule.weekdays)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptyTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: theme.spacing.xs,
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
  cardTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  stockText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
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

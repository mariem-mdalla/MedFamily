import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MedicineForm, { MedicineFormValues } from '../components/MedicineForm';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { cancelScheduledRemindersForIds, scheduleMedicationReminder } from '../lib/medicationReminders';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile, MedicationWithSchedules } from '../types/database';

type EditMedicineScreenProps = NativeStackScreenProps<RootStackParamList, 'EditMedicine'>;

export default function EditMedicineScreen({ navigation, route }: EditMedicineScreenProps) {
  const { profile } = useAuth();
  const { medicationId } = route.params;

  const [careProfiles, setCareProfiles] = useState<CareProfile[]>([]);
  const [initialValues, setInitialValues] = useState<MedicineFormValues | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!profile) {
        return;
      }

      const [medResult, cpResult] = await Promise.all([
        supabase
          .from('medications')
          .select(
            'id, family_id, care_profile_id, name, form, dose_amount, instructions, stock_quantity, low_stock_threshold, expiry_date, schedules(id, family_id, medication_id, time_local, recurrence, weekdays, day_of_month, timezone)',
          )
          .eq('id', medicationId)
          .eq('family_id', profile.family_id)
          .single(),
        supabase
          .from('care_profiles')
          .select('id, family_id, display_name, label, color, linked_user_id')
          .eq('family_id', profile.family_id)
          .order('display_name'),
      ]);

      if (!isMounted) {
        return;
      }

      if (medResult.error || !medResult.data) {
        setLoadError('Could not load this medicine.');
        return;
      }

      if (cpResult.data) {
        setCareProfiles((cpResult.data as CareProfile[]) ?? []);
      }

      const med = medResult.data as unknown as MedicationWithSchedules;
      const firstSchedule = med.schedules?.[0];

      if (firstSchedule) {
        setScheduleId(firstSchedule.id);
      }

      setInitialValues({
        name: med.name,
        form: (med as MedicationWithSchedules & { form: string }).form as MedicineFormValues['form'] ?? 'pill',
        doseAmount: (med as MedicationWithSchedules & { dose_amount: string | null }).dose_amount ?? '',
        instructions: med.instructions || '',
        timeLocal: firstSchedule?.time_local ?? '08:00',
        recurrence: firstSchedule ? (firstSchedule.recurrence as MedicineFormValues['recurrence']) : null,
        selectedDays: Array.isArray(firstSchedule?.weekdays) ? firstSchedule.weekdays : [],
        dayOfMonth: firstSchedule?.day_of_month ? String(firstSchedule.day_of_month) : '',
        expiryDate: med.expiry_date || '',
        stockQuantity: med.stock_quantity !== null && med.stock_quantity !== undefined ? String(med.stock_quantity) : '',
        lowStockThreshold: med.low_stock_threshold !== null && med.low_stock_threshold !== undefined ? String(med.low_stock_threshold) : '',
        careProfileId: med.care_profile_id,
      });
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [medicationId, profile?.family_id]);

  async function handleSave(values: MedicineFormValues): Promise<string | null> {
    if (!profile) {
      return 'Profile not ready.';
    }

    if (profile.role !== 'admin') {
      return 'Only an admin can edit medicines.';
    }

    const monthlyDay = values.dayOfMonth.trim() ? Number(values.dayOfMonth) : null;
    const stockQty =
      values.stockQuantity.trim() !== '' ? parseInt(values.stockQuantity, 10) : null;
    const lowStock =
      values.lowStockThreshold.trim() !== '' ? parseInt(values.lowStockThreshold, 10) : null;

    const { error: medError } = await supabase
      .from('medications')
      .update({
        name: values.name,
        form: values.form,
        dose_amount: values.doseAmount || null,
        instructions: values.instructions,
        stock_quantity: stockQty,
        low_stock_threshold: lowStock,
        expiry_date: values.expiryDate || null,
        care_profile_id: values.careProfileId,
      })
      .eq('id', medicationId)
      .eq('family_id', profile.family_id);

    if (medError) {
      return medError.message;
    }

    if (scheduleId) {
      const { error: schedError } = await supabase
        .from('schedules')
        .update({
          time_local: values.timeLocal,
          recurrence: values.recurrence,
          weekdays: values.recurrence === 'weekly' ? values.selectedDays : [],
          day_of_month: values.recurrence === 'monthly' ? monthlyDay : null,
        })
        .eq('id', scheduleId)
        .eq('family_id', profile.family_id);

      if (schedError) {
        return schedError.message;
      }

      try {
        await cancelScheduledRemindersForIds([scheduleId]);
      } catch {
      }

      try {
        await scheduleMedicationReminder({
          medicationName: values.name,
          doseAmount: values.doseAmount || null,
          instructions: values.instructions,
          timeLocal: values.timeLocal,
          recurrence: values.recurrence!,
          weekdays: values.recurrence === 'weekly' ? values.selectedDays : [],
          dayOfMonth: values.recurrence === 'monthly' ? monthlyDay : null,
          language: profile.language,
          scheduleId: scheduleId,
        });
      } catch {
      }
    }

    navigation.goBack();
    return null;
  }

  if (loadError) {
    return (
      <View style={styles.centeredMessage}>
        <Text style={styles.centeredMessageText}>{loadError}</Text>
      </View>
    );
  }

  if (!initialValues) {
    return (
      <View style={styles.centeredMessage}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <MedicineForm
      initialValues={initialValues}
      careProfiles={careProfiles}
      onSave={handleSave}
      submitLabel="Save changes"
    />
  );
}

const styles = StyleSheet.create({
  centeredMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  centeredMessageText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MedicineForm, { DEFAULT_FORM_VALUES, MedicineFormValues } from '../components/MedicineForm';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { scheduleMedicationReminder } from '../lib/medicationReminders';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile } from '../types/database';

type AddMedicineScreenProps = NativeStackScreenProps<RootStackParamList, 'AddMedicine'>;

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps) {
  const { profile } = useAuth();
  const [careProfile, setCareProfile] = useState<CareProfile | null>(null);
  const [careProfileError, setCareProfileError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCareProfile() {
      if (!profile) {
        return;
      }

      const { data, error } = await supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('linked_user_id', profile.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setCareProfileError(error.message);
        return;
      }

      if (!data) {
        setCareProfileError('No care profile is linked to this account yet.');
        return;
      }

      setCareProfile(data);
    }

    loadCareProfile();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  async function handleSave(values: MedicineFormValues): Promise<string | null> {
    if (!profile || !careProfile) {
      return 'Your household profile is not ready yet.';
    }

    if (profile.role !== 'admin') {
      return 'Only an admin can add medicines.';
    }

    const monthlyDay = values.dayOfMonth.trim() ? Number(values.dayOfMonth) : null;

    const stockQty =
      values.stockQuantity.trim() !== '' ? parseInt(values.stockQuantity, 10) : null;
    const lowStock =
      values.lowStockThreshold.trim() !== '' ? parseInt(values.lowStockThreshold, 10) : null;

    const { data: medication, error: medError } = await supabase
      .from('medications')
      .insert({
        family_id: profile.family_id,
        care_profile_id: careProfile.id,
        name: values.name,
        form: values.form,
        dose_amount: values.doseAmount || null,
        instructions: values.instructions,
        stock_quantity: stockQty,
        low_stock_threshold: lowStock,
        expiry_date: values.expiryDate || null,
      })
      .select('id')
      .single();

    if (medError || !medication) {
      return medError?.message ?? 'Could not save the medicine.';
    }

    const { data: savedSchedule, error: schedError } = await supabase
      .from('schedules')
      .insert({
        family_id: profile.family_id,
        medication_id: medication.id,
        time_local: values.timeLocal,
        recurrence: values.recurrence,
        weekdays: values.recurrence === 'weekly' ? values.selectedDays : [],
        day_of_month: values.recurrence === 'monthly' ? monthlyDay : null,
        timezone: 'Africa/Tunis',
      })
      .select('id')
      .single();

    if (schedError || !savedSchedule) {
      return schedError?.message ?? 'Could not save the schedule.';
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
        scheduleId: savedSchedule.id,
      });
    } catch {
    }

    navigation.goBack();
    return null;
  }

  if (careProfileError) {
    return (
      <View style={styles.centeredMessage}>
        <Text style={styles.centeredMessageText}>{careProfileError}</Text>
      </View>
    );
  }

  return (
    <MedicineForm
      initialValues={DEFAULT_FORM_VALUES}
      careProfileName={careProfile?.display_name ?? '…'}
      onSave={handleSave}
      submitLabel="Save medicine"
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

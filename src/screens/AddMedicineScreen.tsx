import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
  const [careProfiles, setCareProfiles] = useState<CareProfile[]>([]);
  const [defaultCareProfileId, setDefaultCareProfileId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCareProfiles() {
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('family_id', profile.family_id)
        .order('display_name');

      if (!isMounted) {
        return;
      }

      if (error) {
        setLoadError(error.message);
        setIsLoading(false);
        return;
      }

      const profiles = (data as CareProfile[]) ?? [];
      setCareProfiles(profiles);

      const linked = profiles.find((cp) => cp.linked_user_id === profile.id);
      setDefaultCareProfileId(linked?.id ?? profiles[0]?.id ?? '');
      setIsLoading(false);
    }

    loadCareProfiles();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  async function handleSave(values: MedicineFormValues): Promise<string | null> {
    if (!profile) {
      return 'Your household profile is not ready yet.';
    }

    if (profile.role !== 'admin') {
      return 'Only an admin can add medicines.';
    }

    if (!values.careProfileId) {
      return 'Select who this medicine is for.';
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
        care_profile_id: values.careProfileId,
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

  if (isLoading) {
    return (
      <View style={styles.centeredMessage}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centeredMessage}>
        <Text style={styles.centeredMessageText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <MedicineForm
      initialValues={{ ...DEFAULT_FORM_VALUES, careProfileId: defaultCareProfileId }}
      careProfiles={careProfiles}
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

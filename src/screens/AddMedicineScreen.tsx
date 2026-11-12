import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WEEKDAYS } from '../constants/weekdays';
import { theme } from '../constants/theme';
import { scheduleMedicationReminder } from '../lib/medicationReminders';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile, ScheduleRecurrence } from '../types/database';

type AddMedicineScreenProps = NativeStackScreenProps<RootStackParamList, 'AddMedicine'>;

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps) {
  const { profile } = useAuth();
  const [careProfile, setCareProfile] = useState<CareProfile | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [timeLocal, setTimeLocal] = useState('');
  const [recurrence, setRecurrence] = useState<ScheduleRecurrence | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  useEffect(() => {
    async function loadCareProfile() {
      if (!profile) {
        return;
      }

      const { data, error } = await supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('linked_user_id', profile.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data) {
        setMessage('No care profile is linked to this account yet.');
        return;
      }

      setCareProfile(data);
    }

    loadCareProfile();
  }, [profile?.id]);

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        return current.filter((value) => value !== day);
      }

      return [...current, day].sort((a, b) => a - b);
    });
  }

  async function handleSave() {
    if (saveComplete) {
      navigation.goBack();
      return;
    }

    if (!profile || !careProfile) {
      setMessage('Your household profile is not ready yet.');
      return;
    }

    if (profile.role !== 'admin') {
      setMessage('Only an admin can add medicines.');
      return;
    }

    const trimmedName = name.trim();
    const stockText = stockQuantity.trim();
    const thresholdText = lowStockThreshold.trim();
    const stock = stockText ? Number(stockText) : null;
    const threshold = thresholdText ? Number(thresholdText) : null;
    const monthlyDay = dayOfMonth.trim() ? Number(dayOfMonth) : null;
    const timePattern = /^\d{2}:\d{2}$/;

    if (!trimmedName) {
      setMessage('Enter the medicine name.');
      return;
    }

    if ((stockText && (!Number.isInteger(stock) || (stock ?? -1) < 0)) || (thresholdText && (!Number.isInteger(threshold) || (threshold ?? -1) < 0))) {
      setMessage('Stock values must be whole numbers 0 or more.');
      return;
    }

    if (Boolean(stockText) !== Boolean(thresholdText)) {
      setMessage('Enter both stock values, or leave both empty to skip stock tracking.');
      return;
    }

    const [hour, minute] = timeLocal.split(':').map(Number);
    if (!timePattern.test(timeLocal) || hour > 23 || minute > 59) {
      setMessage('Enter a valid reminder time in 24-hour format, such as 08:30.');
      return;
    }

    if (!recurrence) {
      setMessage('Choose how often the reminder should repeat.');
      return;
    }

    if (recurrence === 'weekly' && selectedDays.length === 0) {
      setMessage('Select at least one day.');
      return;
    }

    if (recurrence === 'monthly' && (!Number.isInteger(monthlyDay) || monthlyDay === null || monthlyDay < 1 || monthlyDay > 28)) {
      setMessage('Choose a day from 1 to 28 so it exists every month.');
      return;
    }

    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      setMessage('Use expiry date as YYYY-MM-DD, or leave it empty.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const { data: medication, error: medicationError } = await supabase
      .from('medications')
      .insert({
        family_id: profile.family_id,
        care_profile_id: careProfile.id,
        name: trimmedName,
        instructions: instructions.trim(),
        stock_quantity: stock,
        low_stock_threshold: threshold,
        expiry_date: expiryDate || null,
      })
      .select('id')
      .single();

    if (medicationError || !medication) {
      setIsSubmitting(false);
      setMessage(medicationError?.message ?? 'Could not save the medicine.');
      return;
    }

    const { data: savedSchedule, error: scheduleError } = await supabase.from('schedules').insert({
      family_id: profile.family_id,
      medication_id: medication.id,
      time_local: timeLocal,
      recurrence,
      weekdays: recurrence === 'weekly' ? selectedDays : [],
      day_of_month: recurrence === 'monthly' ? monthlyDay : null,
      timezone: 'Africa/Tunis',
    }).select('id').single();

    if (scheduleError || !savedSchedule) {
      setIsSubmitting(false);
      setMessage(scheduleError.message);
      return;
    }

    try {
      const reminderScheduled = await scheduleMedicationReminder({
        medicationName: trimmedName,
        instructions: instructions.trim(),
        timeLocal,
        recurrence,
        weekdays: recurrence === 'weekly' ? selectedDays : [],
        dayOfMonth: recurrence === 'monthly' ? monthlyDay : null,
        language: profile.language,
        scheduleId: savedSchedule.id,
      });

      setIsSubmitting(false);
      if (reminderScheduled) {
        navigation.goBack();
        return;
      }

      setSaveComplete(true);
      setMessage('Medicine saved, but notifications are disabled. Allow them in your phone settings to receive reminders.');
    } catch {
      setIsSubmitting(false);
      setSaveComplete(true);
      setMessage('Medicine saved, but this phone could not schedule the reminder. Check notification permissions.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add medicine</Text>
      <Text style={styles.message}>
        For {careProfile?.display_name ?? 'your care profile'}. Enter the medicine and reminder schedule you want to save.
      </Text>

      <Text style={styles.fieldLabel}>Medicine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Medicine name"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.fieldLabel}>Instructions</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Optional instructions from your clinician"
        placeholderTextColor={theme.colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <View style={styles.splitRow}>
        <View style={styles.splitField}>
          <Text style={styles.fieldLabel}>Stock quantity (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current quantity"
            placeholderTextColor={theme.colors.textMuted}
            value={stockQuantity}
            onChangeText={setStockQuantity}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.splitField}>
          <Text style={styles.fieldLabel}>Low stock alert (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter alert quantity"
            placeholderTextColor={theme.colors.textMuted}
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Expiry Date (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
        value={expiryDate}
        onChangeText={setExpiryDate}
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Reminder time</Text>
      <TextInput
        style={styles.input}
        placeholder="24-hour time, e.g. 08:30"
        placeholderTextColor={theme.colors.textMuted}
        value={timeLocal}
        onChangeText={setTimeLocal}
        autoCapitalize="none"
      />

      <Text style={styles.sectionTitle}>Repeat</Text>
      <View style={styles.recurrenceRow}>
        {([
          { value: 'daily', label: 'Every day' },
          { value: 'weekly', label: 'Selected days' },
          { value: 'monthly', label: 'Monthly' },
        ] as const).map((option) => (
          <Pressable
            key={option.value}
            style={[styles.recurrenceChip, recurrence === option.value ? styles.dayChipSelected : null]}
            onPress={() => setRecurrence(option.value)}
          >
            <Text style={[styles.dayChipText, recurrence === option.value ? styles.dayChipTextSelected : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {recurrence === 'weekly' ? (
        <View style={styles.daysRow}>
          {WEEKDAYS.map((day) => {
            const selected = selectedDays.includes(day.value);

            return (
              <Pressable
                key={day.value}
                style={[styles.dayChip, selected ? styles.dayChipSelected : null]}
                onPress={() => toggleDay(day.value)}
              >
                <Text style={[styles.dayChipText, selected ? styles.dayChipTextSelected : null]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {recurrence === 'monthly' ? (
        <View>
          <Text style={styles.fieldLabel}>Day of the month</Text>
          <TextInput
            style={styles.input}
            placeholder="Choose 1 to 28"
            placeholderTextColor={theme.colors.textMuted}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
          />
          <Text style={styles.helperText}>Choose 1–28 so the reminder date exists every month.</Text>
        </View>
      ) : null}

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <Pressable style={styles.button} onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>{saveComplete ? 'Done' : 'Save medicine'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
  },
  message: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  fieldLabel: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  splitRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  splitField: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  recurrenceChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  dayChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.typography.label,
  },
  dayChipTextSelected: {
    color: theme.colors.surface,
  },
  helperText: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: theme.typography.small,
  },
  feedback: {
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.label,
    color: theme.colors.error,
  },
  button: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
});

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const PRESETS = [
  { label: 'Morning', hour: 8, minute: 0 },
  { label: 'Noon', hour: 12, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
  { label: 'Night', hour: 21, minute: 0 },
];

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps) {
  const { profile } = useAuth();
  const [careProfile, setCareProfile] = useState<CareProfile | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [timeLocal, setTimeLocal] = useState('08:00');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
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

  function handleOpenTimePicker() {
    const parts = timeLocal.split(':');
    setSelectedHour(parseInt(parts[0] ?? '8', 10));
    setSelectedMinute(parseInt(parts[1] ?? '0', 10));
    setIsTimePickerOpen(true);
  }

  function handleConfirmTime() {
    const formatted = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    setTimeLocal(formatted);
    setIsTimePickerOpen(false);
  }

  function handleApplyPreset(hour: number, minute: number) {
    setSelectedHour(hour);
    setSelectedMinute(minute);
  }

  function handleStepHour(delta: number) {
    setSelectedHour((current) => {
      const next = current + delta;
      if (next < 0) return 23;
      if (next > 23) return 0;
      return next;
    });
  }

  function handleStepMinute(delta: number) {
    setSelectedMinute((current) => {
      const next = current + delta;
      if (next < 0) return 55;
      if (next > 55) return 0;
      return next;
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
    const monthlyDay = dayOfMonth.trim() ? Number(dayOfMonth) : null;

    if (!trimmedName) {
      setMessage('Enter the medicine name.');
      return;
    }

    if (!timeLocal) {
      setMessage('Select a reminder time.');
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
        stock_quantity: null,
        low_stock_threshold: null,
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
        placeholder="e.g. Metformin"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.fieldLabel}>Instructions (Optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. Take with a glass of water after meals"
        placeholderTextColor={theme.colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <Text style={styles.fieldLabel}>Reminder Time</Text>
      <Pressable style={styles.timeSelectorButton} onPress={handleOpenTimePicker}>
        <View style={styles.timeSelectorLeft}>
          <Ionicons name="alarm-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.timeSelectorValue}>{timeLocal}</Text>
        </View>
        <View style={styles.timeSelectorBadge}>
          <Text style={styles.timeSelectorBadgeText}>Change</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </View>
      </Pressable>

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

      <Text style={styles.fieldLabel}>Expiry Date (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
        value={expiryDate}
        onChangeText={setExpiryDate}
        autoCapitalize="none"
      />

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <Pressable style={styles.button} onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>{saveComplete ? 'Done' : 'Save medicine'}</Text>
        )}
      </Pressable>

      <Modal visible={isTimePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reminder Time</Text>
              <Pressable onPress={() => setIsTimePickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.timePreviewBox}>
              <View style={styles.stepperContainer}>
                <View style={styles.stepperColumn}>
                  <Text style={styles.stepperLabel}>HOUR</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.stepperBtnPressed : null]}
                      onPress={() => handleStepHour(-1)}
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.primary} />
                    </Pressable>
                    <Text style={styles.timePreviewNumber}>{String(selectedHour).padStart(2, '0')}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.stepperBtnPressed : null]}
                      onPress={() => handleStepHour(1)}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.timePreviewColon}>:</Text>

                <View style={styles.stepperColumn}>
                  <Text style={styles.stepperLabel}>MINUTE</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.stepperBtnPressed : null]}
                      onPress={() => handleStepMinute(-5)}
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.primary} />
                    </Pressable>
                    <Text style={styles.timePreviewNumber}>{String(selectedMinute).padStart(2, '0')}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.stepperBtnPressed : null]}
                      onPress={() => handleStepMinute(5)}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.pickerSectionLabel}>Quick Presets</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => {
                const isPresetActive = selectedHour === preset.hour && selectedMinute === preset.minute;
                return (
                  <Pressable
                    key={preset.label}
                    style={({ pressed }) => [
                      styles.presetChip,
                      isPresetActive ? styles.presetChipSelected : null,
                      pressed ? styles.presetChipPressed : null,
                    ]}
                    onPress={() => handleApplyPreset(preset.hour, preset.minute)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isPresetActive ? styles.presetChipTextSelected : null,
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetChipTime,
                        isPresetActive ? styles.presetChipTimeSelected : null,
                      ]}
                    >
                      {String(preset.hour).padStart(2, '0')}:00
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.columnsContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>Hour (00–23)</Text>
                <ScrollView
                  style={styles.columnScroll}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.chipsGrid}>
                    {HOURS.map((h) => {
                      const isSelected = selectedHour === h;
                      return (
                        <Pressable
                          key={h}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={({ pressed }) => [
                            styles.timeChip,
                            isSelected ? styles.timeChipSelected : null,
                            pressed ? styles.timeChipPressed : null,
                          ]}
                          onPress={() => setSelectedHour(h)}
                        >
                          <Text style={[styles.timeChipText, isSelected ? styles.timeChipTextSelected : null]}>
                            {String(h).padStart(2, '0')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>Minute (00–55)</Text>
                <ScrollView
                  style={styles.columnScroll}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.chipsGrid}>
                    {MINUTES.map((m) => {
                      const isSelected = selectedMinute === m;
                      return (
                        <Pressable
                          key={m}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={({ pressed }) => [
                            styles.timeChip,
                            isSelected ? styles.timeChipSelected : null,
                            pressed ? styles.timeChipPressed : null,
                          ]}
                          onPress={() => setSelectedMinute(m)}
                        >
                          <Text style={[styles.timeChipText, isSelected ? styles.timeChipTextSelected : null]}>
                            {String(m).padStart(2, '0')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsTimePickerOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleConfirmTime}>
                <Text style={styles.modalConfirmText}>Confirm Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  timeSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
    marginBottom: theme.spacing.md,
  },
  timeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeSelectorValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  timeSelectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  timeSelectorBadgeText: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionTitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  recurrenceRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  recurrenceChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
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
    marginTop: -8,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
  },
  timePreviewBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  stepperColumn: {
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: {
    backgroundColor: '#E2ECE8',
  },
  timePreviewNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.primary,
    minWidth: 44,
    textAlign: 'center',
  },
  timePreviewColon: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textMuted,
    marginTop: 14,
  },
  pickerSectionLabel: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  presetChip: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  presetChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetChipPressed: {
    opacity: 0.8,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  presetChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  presetChipTime: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  presetChipTimeSelected: {
    color: theme.colors.surface,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    maxHeight: 180,
    marginBottom: theme.spacing.md,
  },
  pickerColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  columnHeader: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  columnScroll: {
    flex: 1,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  timeChip: {
    width: 44,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipPressed: {
    backgroundColor: '#D6E2DD',
  },
  timeChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  timeChipTextSelected: {
    color: theme.colors.surface,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  modalConfirmBtn: {
    flex: 1.5,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.surface,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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
import { CareProfile, MedicationForm, ScheduleRecurrence } from '../types/database';

export type MedicineFormValues = {
  name: string;
  form: MedicationForm;
  doseAmount: string;
  instructions: string;
  timeLocal: string;
  recurrence: ScheduleRecurrence | null;
  selectedDays: number[];
  dayOfMonth: string;
  expiryDate: string;
  stockQuantity: string;
  lowStockThreshold: string;
  careProfileId: string;
};

export const DEFAULT_FORM_VALUES: MedicineFormValues = {
  name: '',
  form: 'pill',
  doseAmount: '',
  instructions: '',
  timeLocal: '08:00',
  recurrence: null,
  selectedDays: [],
  dayOfMonth: '',
  expiryDate: '',
  stockQuantity: '',
  lowStockThreshold: '',
  careProfileId: '',
};

type FormOption = {
  value: MedicationForm;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const FORM_OPTIONS: FormOption[] = [
  { value: 'pill', label: 'Pill', icon: 'ellipse-outline' },
  { value: 'liquid', label: 'Liquid', icon: 'beaker-outline' },
  { value: 'drops', label: 'Drops', icon: 'water-outline' },
  { value: 'injection', label: 'Injection', icon: 'medical-outline' },
  { value: 'other', label: 'Other', icon: 'medkit-outline' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const PRESETS = [
  { label: 'Morning', hour: 8, minute: 0 },
  { label: 'Noon', hour: 12, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
  { label: 'Night', hour: 21, minute: 0 },
];

type MedicineFormProps = {
  initialValues: MedicineFormValues;
  careProfiles: CareProfile[];
  onSave: (values: MedicineFormValues) => Promise<string | null>;
  submitLabel: string;
  notificationNote?: string | null;
};

export default function MedicineForm({
  initialValues,
  careProfiles,
  onSave,
  submitLabel,
  notificationNote,
}: MedicineFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [form, setForm] = useState<MedicationForm>(initialValues.form);
  const [doseAmount, setDoseAmount] = useState(initialValues.doseAmount);
  const [instructions, setInstructions] = useState(initialValues.instructions);
  const [timeLocal, setTimeLocal] = useState(initialValues.timeLocal);
  const [recurrence, setRecurrence] = useState<ScheduleRecurrence | null>(initialValues.recurrence);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialValues.selectedDays);
  const [dayOfMonth, setDayOfMonth] = useState(initialValues.dayOfMonth);
  const [expiryDate, setExpiryDate] = useState(initialValues.expiryDate);
  const [stockQuantity, setStockQuantity] = useState(initialValues.stockQuantity);
  const [lowStockThreshold, setLowStockThreshold] = useState(initialValues.lowStockThreshold);
  const [careProfileId, setCareProfileId] = useState(
    initialValues.careProfileId || (careProfiles[0]?.id ?? ''),
  );

  const initialTimeParts = initialValues.timeLocal.split(':');
  const [selectedHour, setSelectedHour] = useState(parseInt(initialTimeParts[0] ?? '8', 10));
  const [selectedMinute, setSelectedMinute] = useState(parseInt(initialTimeParts[1] ?? '0', 10));
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      if (current.includes(day)) return current.filter((v) => v !== day);
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

  async function handleSubmit() {
    setErrorMessage('');

    const trimmedName = name.trim();
    const monthlyDay = dayOfMonth.trim() ? Number(dayOfMonth) : null;

    if (!trimmedName) {
      setErrorMessage('Enter the medicine name.');
      return;
    }

    if (!recurrence) {
      setErrorMessage('Choose how often the reminder should repeat.');
      return;
    }

    if (recurrence === 'weekly' && selectedDays.length === 0) {
      setErrorMessage('Select at least one day of the week.');
      return;
    }

    if (
      recurrence === 'monthly' &&
      (!Number.isInteger(monthlyDay) || monthlyDay === null || monthlyDay < 1 || monthlyDay > 28)
    ) {
      setErrorMessage('Choose a day from 1 to 28 so it exists every month.');
      return;
    }

    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      setErrorMessage('Use expiry date as YYYY-MM-DD, or leave it empty.');
      return;
    }

    if (stockQuantity && isNaN(Number(stockQuantity))) {
      setErrorMessage('Stock quantity must be a number.');
      return;
    }

    if (lowStockThreshold && isNaN(Number(lowStockThreshold))) {
      setErrorMessage('Low stock alert must be a number.');
      return;
    }

    setIsSubmitting(true);

    const error = await onSave({
      name: trimmedName,
      form,
      doseAmount: doseAmount.trim(),
      instructions: instructions.trim(),
      timeLocal,
      recurrence,
      selectedDays,
      dayOfMonth,
      expiryDate,
      stockQuantity,
      lowStockThreshold,
      careProfileId,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {careProfiles.length > 0 ? (
        <View style={styles.whoSection}>
          <Text style={styles.fieldLabel}>Who is it for?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.whoRow}>
            {careProfiles.map((cp) => {
              const isSelected = careProfileId === cp.id;
              const initial = cp.display_name.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={cp.id}
                  style={[styles.whoChip, isSelected ? styles.whoChipSelected : null]}
                  onPress={() => setCareProfileId(cp.id)}
                >
                  <View style={[styles.whoAvatar, { backgroundColor: cp.color }]}>
                    <Text style={styles.whoAvatarText}>{initial}</Text>
                  </View>
                  <Text style={[styles.whoChipName, isSelected ? styles.whoChipNameSelected : null]}>
                    {cp.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Medicine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Metformin"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.fieldLabel}>Form</Text>
      <View style={styles.formRow}>
        {FORM_OPTIONS.map((option) => {
          const isSelected = form === option.value;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.formChip,
                isSelected ? styles.formChipSelected : null,
                pressed ? styles.formChipPressed : null,
              ]}
              onPress={() => setForm(option.value)}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={isSelected ? theme.colors.surface : theme.colors.primary}
              />
              <Text style={[styles.formChipText, isSelected ? styles.formChipTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Dose Amount (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1 pill, 5 ml, 2 drops"
        placeholderTextColor={theme.colors.textMuted}
        value={doseAmount}
        onChangeText={setDoseAmount}
      />
      <Text style={styles.helperText}>
        How much to take each time. This appears in the reminder notification.
      </Text>

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
        {(
          [
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Selected days' },
            { value: 'monthly', label: 'Monthly' },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.recurrenceChip,
              recurrence === option.value ? styles.recurrenceChipSelected : null,
              pressed ? styles.formChipPressed : null,
            ]}
            onPress={() => setRecurrence(option.value)}
          >
            <Text
              style={[
                styles.recurrenceChipText,
                recurrence === option.value ? styles.recurrenceChipTextSelected : null,
              ]}
            >
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
          <Text style={styles.fieldLabel}>Day of the month (1–28)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 15"
            placeholderTextColor={theme.colors.textMuted}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
          />
          <Text style={styles.helperText}>Choose 1–28 so the date exists every month.</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Optional details</Text>

      <Text style={styles.fieldLabel}>Expiry Date (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
        value={expiryDate}
        onChangeText={setExpiryDate}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.fieldLabel}>Stock Quantity (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 30"
        placeholderTextColor={theme.colors.textMuted}
        value={stockQuantity}
        onChangeText={setStockQuantity}
        keyboardType="number-pad"
      />
      <Text style={styles.helperText}>
        How many pills / doses you currently have at home.
      </Text>

      <Text style={styles.fieldLabel}>Low Stock Alert (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5"
        placeholderTextColor={theme.colors.textMuted}
        value={lowStockThreshold}
        onChangeText={setLowStockThreshold}
        keyboardType="number-pad"
      />
      <Text style={styles.helperText}>
        The app will remind you to buy more when you have this many left.
      </Text>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {notificationNote ? (
        <View style={styles.noticeBox}>
          <Ionicons name="notifications-off-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.noticeText}>{notificationNote}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : submitLabel}</Text>
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
                const isActive = selectedHour === preset.hour && selectedMinute === preset.minute;
                return (
                  <Pressable
                    key={preset.label}
                    style={({ pressed }) => [
                      styles.presetChip,
                      isActive ? styles.presetChipSelected : null,
                      pressed ? styles.formChipPressed : null,
                    ]}
                    onPress={() => handleApplyPreset(preset.hour, preset.minute)}
                  >
                    <Text style={[styles.presetChipText, isActive ? styles.presetChipTextSelected : null]}>
                      {preset.label}
                    </Text>
                    <Text style={[styles.presetChipTime, isActive ? styles.presetChipTimeSelected : null]}>
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
                  nestedScrollEnabled
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
                  nestedScrollEnabled
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
  whoSection: {
    marginBottom: theme.spacing.md,
  },
  whoRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  whoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  whoChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EDF5F2',
  },
  whoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  whoChipName: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  whoChipNameSelected: {
    color: theme.colors.primary,
  },
  subtitle: {
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
    marginBottom: 6,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  helperText: {
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  formChip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 60,
  },
  formChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  formChipPressed: {
    opacity: 0.75,
  },
  formChipText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.text,
  },
  formChipTextSelected: {
    color: theme.colors.surface,
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
  recurrenceChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  recurrenceChipText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.typography.label,
  },
  recurrenceChipTextSelected: {
    color: theme.colors.surface,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF0EF',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.label,
    color: theme.colors.error,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  button: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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

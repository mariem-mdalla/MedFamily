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
import { theme } from '../constants/theme';
import { useTranslation } from '../i18n';
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
  icon: keyof typeof Ionicons.glyphMap;
};

const FORM_OPTIONS: FormOption[] = [
  { value: 'pill', icon: 'ellipse-outline' },
  { value: 'liquid', icon: 'beaker-outline' },
  { value: 'drops', icon: 'water-outline' },
  { value: 'injection', icon: 'medical-outline' },
  { value: 'other', icon: 'medkit-outline' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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
  const { t, isRTL } = useTranslation();

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

  const weekdays = [
    { value: 1, label: t.mon },
    { value: 2, label: t.tue },
    { value: 3, label: t.wed },
    { value: 4, label: t.thu },
    { value: 5, label: t.fri },
    { value: 6, label: t.sat },
    { value: 7, label: t.sun },
  ];

  const presets = [
    { label: t.morning, hour: 8, minute: 0 },
    { label: t.noon, hour: 12, minute: 0 },
    { label: t.evening, hour: 18, minute: 0 },
    { label: t.night, hour: 21, minute: 0 },
  ];

  function getFormLabel(formVal: MedicationForm): string {
    switch (formVal) {
      case 'pill':
        return t.pill;
      case 'liquid':
        return t.liquid;
      case 'drops':
        return t.drops;
      case 'injection':
        return t.injection;
      default:
        return t.other;
    }
  }

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
      setErrorMessage(t.enterMedicineName);
      return;
    }

    if (!recurrence) {
      setErrorMessage(t.selectRecurrence);
      return;
    }

    if (recurrence === 'weekly' && selectedDays.length === 0) {
      setErrorMessage(t.selectAtLeastOneDay);
      return;
    }

    if (
      recurrence === 'monthly' &&
      (!Number.isInteger(monthlyDay) || monthlyDay === null || monthlyDay < 1 || monthlyDay > 28)
    ) {
      setErrorMessage(t.enterDayOfMonth);
      return;
    }

    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      setErrorMessage('YYYY-MM-DD');
      return;
    }

    if (stockQuantity && isNaN(Number(stockQuantity))) {
      setErrorMessage(t.stockQuantity);
      return;
    }

    if (lowStockThreshold && isNaN(Number(lowStockThreshold))) {
      setErrorMessage(t.lowStockThreshold);
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
          <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.whoIsItFor}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.whoRow, isRTL && styles.rowRTL]}>
            {careProfiles.map((cp) => {
              const isSelected = careProfileId === cp.id;
              const initial = cp.display_name.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={cp.id}
                  style={[styles.whoChip, isSelected ? styles.whoChipSelected : null, isRTL && styles.rowRTL]}
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

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.medicineName}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.medicineNamePlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.form}</Text>
      <View style={[styles.formRow, isRTL && styles.rowRTL]}>
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
                {getFormLabel(option.value)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.doseAmount}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.doseAmountPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={doseAmount}
        onChangeText={setDoseAmount}
      />
      <Text style={[styles.helperText, isRTL && styles.textRTL]}>
        {t.doseAmountHelper}
      </Text>

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.instructions}</Text>
      <TextInput
        style={[styles.input, styles.multiline, isRTL && styles.inputRTL]}
        placeholder={t.instructionsPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.reminderTime}</Text>
      <Pressable style={[styles.timeSelectorButton, isRTL && styles.rowRTL]} onPress={handleOpenTimePicker}>
        <View style={[styles.timeSelectorLeft, isRTL && styles.rowRTL]}>
          <Ionicons name="alarm-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.timeSelectorValue}>{timeLocal}</Text>
        </View>
        <View style={[styles.timeSelectorBadge, isRTL && styles.rowRTL]}>
          <Text style={styles.timeSelectorBadgeText}>{t.edit}</Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.primary} />
        </View>
      </Pressable>

      <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recurrence}</Text>
      <View style={[styles.recurrenceRow, isRTL && styles.rowRTL]}>
        {(
          [
            { value: 'daily', label: t.everyDay },
            { value: 'weekly', label: t.selectedDays },
            { value: 'monthly', label: t.monthly },
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
        <View style={[styles.daysRow, isRTL && styles.rowRTL]}>
          {weekdays.map((day) => {
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
          <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.dayOfMonth}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t.dayOfMonthPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
          />
        </View>
      ) : null}

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.expiryDate}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.expiryPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={expiryDate}
        onChangeText={setExpiryDate}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.stockQuantity}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.stockPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={stockQuantity}
        onChangeText={setStockQuantity}
        keyboardType="number-pad"
      />
      <Text style={[styles.helperText, isRTL && styles.textRTL]}>
        {t.stockQuantityHelper}
      </Text>

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.lowStockThreshold}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.lowStockPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={lowStockThreshold}
        onChangeText={setLowStockThreshold}
        keyboardType="number-pad"
      />
      <Text style={[styles.helperText, isRTL && styles.textRTL]}>
        {t.lowStockThresholdHelper}
      </Text>

      {errorMessage ? (
        <View style={[styles.errorBox, isRTL && styles.rowRTL]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errorMessage}</Text>
        </View>
      ) : null}

      {notificationNote ? (
        <View style={[styles.noticeBox, isRTL && styles.rowRTL]}>
          <Ionicons name="notifications-off-outline" size={18} color={theme.colors.textMuted} />
          <Text style={[styles.noticeText, isRTL && styles.textRTL]}>{notificationNote}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{isSubmitting ? t.saving : submitLabel}</Text>
      </Pressable>

      <Modal visible={isTimePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={styles.modalTitle}>{t.confirmTime}</Text>
              <Pressable onPress={() => setIsTimePickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.timePreviewBox}>
              <View style={[styles.stepperContainer, isRTL && styles.rowRTL]}>
                <View style={styles.stepperColumn}>
                  <Text style={styles.stepperLabel}>{t.hour}</Text>
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
                  <Text style={styles.stepperLabel}>{t.minute}</Text>
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

            <Text style={[styles.pickerSectionLabel, isRTL && styles.textRTL]}>{t.quickPresets}</Text>
            <View style={[styles.presetsRow, isRTL && styles.rowRTL]}>
              {presets.map((preset) => {
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

            <View style={[styles.columnsContainer, isRTL && styles.rowRTL]}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>{t.hour}</Text>
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
                <Text style={styles.columnHeader}>{t.minute}</Text>
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

            <View style={[styles.modalActionRow, isRTL && styles.rowRTL]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsTimePickerOpen(false)}>
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleConfirmTime}>
                <Text style={styles.modalConfirmText}>{t.confirmTime}</Text>
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
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  multiline: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  formChip: {
    flex: 1,
    minWidth: 60,
    minHeight: 64,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  formChipPressed: {
    opacity: 0.8,
  },
  formChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  formChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
  formChipTextSelected: {
    color: theme.colors.surface,
  },
  timeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EDF5F2',
    borderRadius: theme.radius.full,
  },
  timeSelectorBadgeText: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  recurrenceRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  recurrenceChip: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  recurrenceChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  recurrenceChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  recurrenceChipTextSelected: {
    color: theme.colors.surface,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  dayChip: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dayChipTextSelected: {
    color: theme.colors.surface,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF0EF',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.label,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: theme.typography.label,
  },
  button: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '800',
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
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
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
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});

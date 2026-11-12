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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile } from '../types/database';

type AddMedicineScreenProps = NativeStackScreenProps<RootStackParamList, 'AddMedicine'>;

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps) {
  const { profile } = useAuth();
  const [careProfile, setCareProfile] = useState<CareProfile | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [stockQuantity, setStockQuantity] = useState('30');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [expiryDate, setExpiryDate] = useState('');
  const [timeLocal, setTimeLocal] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!profile || !careProfile) {
      setMessage('Your household profile is not ready yet.');
      return;
    }

    if (profile.role !== 'admin') {
      setMessage('Only an admin can add medicines.');
      return;
    }

    const trimmedName = name.trim();
    const stock = Number(stockQuantity);
    const threshold = Number(lowStockThreshold);
    const timePattern = /^\d{2}:\d{2}$/;

    if (!trimmedName) {
      setMessage('Enter the medicine name.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setMessage('Stock must be a whole number 0 or more.');
      return;
    }

    if (!Number.isInteger(threshold) || threshold < 0) {
      setMessage('Low stock threshold must be a whole number 0 or more.');
      return;
    }

    if (!timePattern.test(timeLocal)) {
      setMessage('Use time as HH:MM, for example 08:00.');
      return;
    }

    if (selectedDays.length === 0) {
      setMessage('Select at least one day.');
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

    const { error: scheduleError } = await supabase.from('schedules').insert({
      family_id: profile.family_id,
      medication_id: medication.id,
      time_local: timeLocal,
      weekdays: selectedDays,
      timezone: 'Africa/Tunis',
    });

    setIsSubmitting(false);

    if (scheduleError) {
      setMessage(scheduleError.message);
      return;
    }

    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add medicine</Text>
      <Text style={styles.message}>
        For {careProfile?.display_name ?? 'your care profile'}. Enter the schedule your clinician already gave you.
      </Text>

      <Text style={styles.fieldLabel}>Medicine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Metformin"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.fieldLabel}>Instructions</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. Take with a glass of water after meals"
        placeholderTextColor={theme.colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <View style={styles.splitRow}>
        <View style={styles.splitField}>
          <Text style={styles.fieldLabel}>Stock Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor={theme.colors.textMuted}
            value={stockQuantity}
            onChangeText={setStockQuantity}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.splitField}>
          <Text style={styles.fieldLabel}>Low Alert At</Text>
          <TextInput
            style={styles.input}
            placeholder="5"
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

      <Text style={styles.fieldLabel}>Reminder Time</Text>
      <TextInput
        style={styles.input}
        placeholder="HH:MM (e.g. 08:00)"
        placeholderTextColor={theme.colors.textMuted}
        value={timeLocal}
        onChangeText={setTimeLocal}
        autoCapitalize="none"
      />

      <Text style={styles.sectionTitle}>Repeat on Days</Text>
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

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <Pressable style={styles.button} onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>Save medicine</Text>
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

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
        For {careProfile?.display_name ?? 'your care profile'}. Enter the schedule your clinician
        already gave you.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Medicine name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Instructions written by you or your clinician"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Stock quantity"
        value={stockQuantity}
        onChangeText={setStockQuantity}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Low stock threshold"
        value={lowStockThreshold}
        onChangeText={setLowStockThreshold}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Expiry date YYYY-MM-DD (optional)"
        value={expiryDate}
        onChangeText={setExpiryDate}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Reminder time HH:MM"
        value={timeLocal}
        onChangeText={setTimeLocal}
        autoCapitalize="none"
      />

      <Text style={styles.sectionTitle}>Days</Text>
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
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Save medicine</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#14213d',
  },
  message: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    color: '#333333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c5c5c5',
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 18,
  },
  multiline: {
    minHeight: 96,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#14213d',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: '#1d4e89',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayChipSelected: {
    backgroundColor: '#1d4e89',
  },
  dayChipText: {
    color: '#1d4e89',
    fontWeight: '700',
  },
  dayChipTextSelected: {
    color: '#ffffff',
  },
  feedback: {
    marginBottom: 12,
    fontSize: 16,
    color: '#14213d',
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#1d4e89',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});

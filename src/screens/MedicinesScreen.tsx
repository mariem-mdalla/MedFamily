import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatWeekdays } from '../constants/weekdays';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { MedicationWithSchedules } from '../types/database';

type MedicinesScreenProps = NativeStackScreenProps<RootStackParamList, 'Medicines'>;

export default function MedicinesScreen({ navigation }: MedicinesScreenProps) {
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
      <Text style={styles.message}>Add the medicines and reminder times for your household.</Text>

      {profile?.role === 'admin' ? (
        <Pressable style={styles.button} onPress={() => navigation.navigate('AddMedicine')}>
          <Text style={styles.buttonText}>Add medicine</Text>
        </Pressable>
      ) : null}

      {isLoading ? <ActivityIndicator style={styles.loader} color="#1d4e89" /> : null}
      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No medicines yet.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.instructions || 'No instructions saved.'}</Text>
            <Text style={styles.cardText}>
              Stock: {item.stock_quantity} · Low under {item.low_stock_threshold}
            </Text>
            {item.schedules.map((schedule) => (
              <Text key={schedule.id} style={styles.scheduleText}>
                {schedule.time_local} · {formatWeekdays(schedule.weekdays)}
              </Text>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 16,
    fontSize: 16,
    color: '#333333',
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#1d4e89',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 12,
  },
  feedback: {
    marginBottom: 12,
    fontSize: 16,
    color: '#14213d',
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    fontSize: 16,
    color: '#666666',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#14213d',
  },
  cardText: {
    marginTop: 6,
    fontSize: 16,
    color: '#333333',
  },
  scheduleText: {
    marginTop: 8,
    fontSize: 16,
    color: '#1d4e89',
    fontWeight: '600',
  },
});

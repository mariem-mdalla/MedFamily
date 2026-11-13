import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

type AddPersonScreenProps = NativeStackScreenProps<RootStackParamList, 'AddPerson'>;

const COLOR_OPTIONS = [
  '#52796F',
  '#E76F51',
  '#2A9D8F',
  '#E9C46A',
  '#F4A261',
  '#8338EC',
  '#3A86FF',
  '#FB5607',
  '#06D6A0',
  '#EF476F',
];

export default function AddPersonScreen({ navigation }: AddPersonScreenProps) {
  const { profile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  async function handleSave() {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setErrorMessage('Enter a name for this person.');
      return;
    }

    if (!profile) {
      setErrorMessage('Profile not ready.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.from('care_profiles').insert({
      family_id: profile.family_id,
      display_name: trimmedName,
      color: selectedColor,
      label: null,
      linked_user_id: null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.previewRow}>
        <View style={[styles.previewAvatar, { backgroundColor: selectedColor }]}>
          <Text style={styles.previewInitial}>{initial}</Text>
        </View>
        <Text style={styles.previewName}>{displayName.trim() || 'Name preview'}</Text>
      </View>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Grandpa, Emma"
        placeholderTextColor={theme.colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        autoFocus
      />

      <Text style={styles.fieldLabel}>Color</Text>
      <View style={styles.colorGrid}>
        {COLOR_OPTIONS.map((color) => (
          <Pressable
            key={color}
            style={[styles.colorChip, { backgroundColor: color }, selectedColor === color ? styles.colorChipSelected : null]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor === color ? (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            ) : null}
          </Pressable>
        ))}
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        onPress={handleSave}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Add person'}</Text>
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  previewName: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
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
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  colorChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text,
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
});

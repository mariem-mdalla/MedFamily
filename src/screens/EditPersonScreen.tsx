import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

type EditPersonScreenProps = NativeStackScreenProps<RootStackParamList, 'EditPerson'>;

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

export default function EditPersonScreen({ navigation, route }: EditPersonScreenProps) {
  const { profile } = useAuth();
  const { careProfileId } = route.params;

  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    let isMounted = true;

    async function loadPerson() {
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('id', careProfileId)
        .eq('family_id', profile.family_id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setLoadError('Could not load this person.');
        setIsLoading(false);
        return;
      }

      setDisplayName(data.display_name);
      setSelectedColor(data.color);
      setIsLoading(false);
    }

    loadPerson();

    return () => {
      isMounted = false;
    };
  }, [careProfileId, profile?.family_id]);

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

    const { error } = await supabase
      .from('care_profiles')
      .update({ display_name: trimmedName, color: selectedColor })
      .eq('id', careProfileId)
      .eq('family_id', profile.family_id);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    navigation.goBack();
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
        <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>
    </ScrollView>
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

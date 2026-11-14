import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session, signOut, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'ar'>(profile?.language ?? 'fr');
  const [voiceEnabled, setVoiceEnabled] = useState(profile?.voice_enabled ?? false);
  const [largeText, setLargeText] = useState(profile?.large_text ?? false);
  const [highContrast, setHighContrast] = useState(profile?.high_contrast ?? false);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setLanguage(profile.language);
      setVoiceEnabled(profile.voice_enabled);
      setLargeText(profile.large_text);
      setHighContrast(profile.high_contrast);
    }
  }, [profile]);

  async function handleSaveName() {
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Name cannot be empty.');
      return;
    }

    setIsSavingName(true);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', profile.id);

    setIsSavingName(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refreshProfile();
    setStatusMessage('Name updated successfully.');
  }

  async function handleToggleVoice(nextVal: boolean) {
    if (!profile) return;
    setVoiceEnabled(nextVal);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ voice_enabled: nextVal })
      .eq('id', profile.id);

    if (error) {
      setVoiceEnabled(!nextVal);
      setErrorMessage(error.message);
      return;
    }

    await refreshProfile();
    setStatusMessage('Voice reminder preference saved.');
  }

  async function handleToggleLargeText(nextVal: boolean) {
    if (!profile) return;
    setLargeText(nextVal);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ large_text: nextVal })
      .eq('id', profile.id);

    if (error) {
      setLargeText(!nextVal);
      setErrorMessage(error.message);
      return;
    }

    await refreshProfile();
    setStatusMessage('Large text preference saved.');
  }

  async function handleToggleHighContrast(nextVal: boolean) {
    if (!profile) return;
    setHighContrast(nextVal);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ high_contrast: nextVal })
      .eq('id', profile.id);

    if (error) {
      setHighContrast(!nextVal);
      setErrorMessage(error.message);
      return;
    }

    await refreshProfile();
    setStatusMessage('High contrast preference saved.');
  }

  async function handleChangeLanguage(nextLang: 'fr' | 'ar') {
    if (!profile || language === nextLang) return;
    setLanguage(nextLang);
    setErrorMessage('');
    setStatusMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ language: nextLang })
      .eq('id', profile.id);

    if (error) {
      setLanguage(profile.language);
      setErrorMessage(error.message);
      return;
    }

    await refreshProfile();
    setStatusMessage(nextLang === 'ar' ? 'تم حفظ اللغة بنجاح.' : 'Langue enregistrée avec succès.');
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage('');
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not sign out.');
      setIsSigningOut(false);
    }
  }

  const hasNameChanged = name.trim() !== (profile?.display_name ?? '');

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Profile</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
            />
            {hasNameChanged ? (
              <Pressable
                style={[styles.saveNameBtn, isSavingName ? styles.saveNameBtnDisabled : null]}
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.saveNameBtnText}>Save</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {profile?.role === 'admin' ? 'Household Admin' : 'Family Member'}
            </Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langChip, language === 'fr' ? styles.langChipSelected : null]}
              onPress={() => handleChangeLanguage('fr')}
            >
              <Text style={[styles.langChipText, language === 'fr' ? styles.langChipTextSelected : null]}>
                Français
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, language === 'ar' ? styles.langChipSelected : null]}
              onPress={() => handleChangeLanguage('ar')}
            >
              <Text style={[styles.langChipText, language === 'ar' ? styles.langChipTextSelected : null]}>
                العربية
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {profile?.role === 'admin' ? (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Household</Text>
          <Pressable
            style={styles.actionRow}
            onPress={() => navigation.navigate('ManageInvites')}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="ticket-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.actionText}>Manage invite codes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Preferences</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Voice Reminder</Text>
            <Text style={styles.helperText}>Speak medication instructions aloud</Text>
          </View>
          <Switch
            value={voiceEnabled}
            onValueChange={handleToggleVoice}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Large Text</Text>
            <Text style={styles.helperText}>Increase readability across cards</Text>
          </View>
          <Switch
            value={largeText}
            onValueChange={handleToggleLargeText}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>High Contrast</Text>
            <Text style={styles.helperText}>Higher contrast borders and buttons</Text>
          </View>
          <Switch
            value={highContrast}
            onValueChange={handleToggleHighContrast}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {statusMessage ? (
        <View style={styles.statusBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? (
          <ActivityIndicator color={theme.colors.error} />
        ) : (
          <Text style={styles.signOutText}>Sign out</Text>
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  fieldBlock: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 6,
  },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  saveNameBtn: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNameBtnDisabled: {
    opacity: 0.6,
  },
  saveNameBtnText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.typography.label,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  langRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 8,
  },
  langChip: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  langChipText: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  langChipTextSelected: {
    color: theme.colors.surface,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  helperText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    minHeight: theme.touchTarget.minTarget,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF5F2',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statusText: {
    flex: 1,
    fontSize: theme.typography.label,
    color: theme.colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.colors.error,
    fontSize: theme.typography.label,
  },
  signOutButton: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
});

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
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
import { useTranslation } from '../i18n';
import { scheduleTestReminder } from '../lib/medicationReminders';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session, signOut, refreshProfile } = useAuth();
  const { t, isRTL } = useTranslation();

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
      setErrorMessage(t.nameEmpty);
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
    setStatusMessage(t.nameSaved);
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
    setStatusMessage(t.voiceSaved);
  }

  async function handleTestReminder() {
    setStatusMessage('');
    setErrorMessage('');
    const ok = await scheduleTestReminder(language);
    if (ok) {
      setStatusMessage(t.testReminderScheduled);
    }
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
    setStatusMessage(t.largeTextSaved);
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
    setStatusMessage(t.highContrastSaved);
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

    const shouldBeRTL = nextLang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      Alert.alert(
        t.restartRequiredTitle,
        t.restartRequiredMessage,
        [{ text: t.ok }],
      );
    }

    setStatusMessage(t.languageSaved);
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

  const dynTextSize = largeText ? 18 : 15;
  const dynTitleSize = largeText ? 25 : 18;
  const dynHelperSize = largeText ? 15 : 13;
  const dynCardStyle = highContrast
    ? { borderColor: '#111827', borderWidth: 2, backgroundColor: '#FFFFFF' }
    : null;
  const dynLabelColor = highContrast ? '#000000' : theme.colors.textMuted;
  const dynTextColor = highContrast ? '#000000' : theme.colors.text;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        highContrast ? { backgroundColor: '#F0F2F5' } : null,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, dynCardStyle]}>
        <Text style={[styles.sectionHeader, { fontSize: dynTitleSize, color: dynTextColor }, isRTL && styles.textRTL]}>
          {t.profile}
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { fontSize: dynTextSize, color: dynLabelColor }, isRTL && styles.textRTL]}>
            {t.name}
          </Text>
          <View style={[styles.nameRow, isRTL && styles.rowRTL]}>
            <TextInput
              style={[
                styles.nameInput,
                { fontSize: dynTextSize, color: dynTextColor },
                highContrast ? { borderColor: '#111827', borderWidth: 1.5 } : null,
                isRTL && styles.inputRTL,
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t.displayNamePlaceholder}
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
                  <Text style={[styles.saveNameBtnText, { fontSize: dynTextSize }]}>{t.save}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.row, isRTL && styles.rowRTL]}>
          <Text style={[styles.label, { fontSize: dynTextSize, color: dynLabelColor }]}>{t.email}</Text>
          <Text style={[styles.value, { fontSize: dynTextSize, color: dynTextColor }]}>
            {session?.user.email ?? '—'}
          </Text>
        </View>

        <View style={[styles.row, isRTL && styles.rowRTL]}>
          <Text style={[styles.label, { fontSize: dynTextSize, color: dynLabelColor }]}>{t.role}</Text>
          <View style={[styles.badge, highContrast ? { borderColor: '#111827', borderWidth: 1.5 } : null]}>
            <Text style={[styles.badgeText, { fontSize: dynHelperSize }]}>
              {profile?.role === 'admin' ? t.householdAdmin : t.familyMember}
            </Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { fontSize: dynTextSize, color: dynLabelColor }, isRTL && styles.textRTL]}>
            {t.language}
          </Text>
          <View style={[styles.langRow, isRTL && styles.rowRTL]}>
            <Pressable
              style={[
                styles.langChip,
                language === 'fr' ? styles.langChipSelected : null,
                highContrast && language !== 'fr' ? { borderColor: '#111827' } : null,
              ]}
              onPress={() => handleChangeLanguage('fr')}
            >
              <Text
                style={[
                  styles.langChipText,
                  { fontSize: dynTextSize },
                  language === 'fr' ? styles.langChipTextSelected : null,
                ]}
              >
                Français
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.langChip,
                language === 'ar' ? styles.langChipSelected : null,
                highContrast && language !== 'ar' ? { borderColor: '#111827' } : null,
              ]}
              onPress={() => handleChangeLanguage('ar')}
            >
              <Text
                style={[
                  styles.langChipText,
                  { fontSize: dynTextSize },
                  language === 'ar' ? styles.langChipTextSelected : null,
                ]}
              >
                العربية
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {profile?.role === 'admin' ? (
        <View style={[styles.card, dynCardStyle]}>
          <Text style={[styles.sectionHeader, { fontSize: dynTitleSize, color: dynTextColor }, isRTL && styles.textRTL]}>
            {t.household}
          </Text>
          <Pressable
            style={[styles.actionRow, isRTL && styles.rowRTL]}
            onPress={() => navigation.navigate('ManageInvites')}
          >
            <View style={[styles.actionLeft, isRTL && styles.rowRTL]}>
              <Ionicons name="ticket-outline" size={largeText ? 24 : 20} color={theme.colors.primary} />
              <Text style={[styles.actionText, { fontSize: dynTextSize, color: dynTextColor }]}>
                {t.manageInvites}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.card, dynCardStyle]}>
        <Text style={[styles.sectionHeader, { fontSize: dynTitleSize, color: dynTextColor }, isRTL && styles.textRTL]}>
          {t.preferences}
        </Text>

        <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
          <View style={[styles.switchLabelContainer, isRTL ? { marginLeft: theme.spacing.md, marginRight: 0 } : null]}>
            <Text style={[styles.label, { fontSize: dynTextSize, color: dynTextColor }, isRTL && styles.textRTL]}>
              {t.voiceReminder}
            </Text>
            <Text style={[styles.helperText, { fontSize: dynHelperSize, color: dynLabelColor }, isRTL && styles.textRTL]}>
              {t.voiceReminderHelper}
            </Text>
          </View>
          <Switch
            value={voiceEnabled}
            onValueChange={handleToggleVoice}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {voiceEnabled ? (
          <Pressable
            style={[styles.testReminderBtn, isRTL && styles.rowRTL]}
            onPress={handleTestReminder}
          >
            <Ionicons name="notifications-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.testReminderText, { fontSize: dynHelperSize }]}>{t.testReminderBtn}</Text>
          </Pressable>
        ) : null}

        <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
          <View style={[styles.switchLabelContainer, isRTL ? { marginLeft: theme.spacing.md, marginRight: 0 } : null]}>
            <Text style={[styles.label, { fontSize: dynTextSize, color: dynTextColor }, isRTL && styles.textRTL]}>
              {t.largeText}
            </Text>
            <Text style={[styles.helperText, { fontSize: dynHelperSize, color: dynLabelColor }, isRTL && styles.textRTL]}>
              {t.largeTextHelper}
            </Text>
          </View>
          <Switch
            value={largeText}
            onValueChange={handleToggleLargeText}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
          <View style={[styles.switchLabelContainer, isRTL ? { marginLeft: theme.spacing.md, marginRight: 0 } : null]}>
            <Text style={[styles.label, { fontSize: dynTextSize, color: dynTextColor }, isRTL && styles.textRTL]}>
              {t.highContrast}
            </Text>
            <Text style={[styles.helperText, { fontSize: dynHelperSize, color: dynLabelColor }, isRTL && styles.textRTL]}>
              {t.highContrastHelper}
            </Text>
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
        <View style={[styles.statusBox, isRTL && styles.rowRTL]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.statusText, isRTL && styles.textRTL]}>{statusMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.errorBox, isRTL && styles.rowRTL]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? (
          <ActivityIndicator color={theme.colors.error} />
        ) : (
          <Text style={styles.signOutText}>{t.signOut}</Text>
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
  testReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EDF5F2',
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 6,
  },
  testReminderText: {
    color: theme.colors.primary,
    fontWeight: '700',
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

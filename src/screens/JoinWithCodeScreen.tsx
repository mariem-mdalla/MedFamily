import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { useTranslation } from '../i18n';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

type JoinWithCodeScreenProps = NativeStackScreenProps<RootStackParamList, 'JoinWithCode'>;

export default function JoinWithCodeScreen({ navigation }: JoinWithCodeScreenProps) {
  const { t, isRTL, lang } = useTranslation();
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleJoin() {
    const trimmedCode = inviteCode.trim().toUpperCase();
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedCode) {
      setErrorMessage(t.enterInviteCode);
      return;
    }
    if (!trimmedName) {
      setErrorMessage(t.enterYourName);
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage(t.enterYourEmail);
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t.passwordMinLength);
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const { data: verifyData, error: verifyError } = await supabase.rpc(
      'verify_invite_code',
      { p_code: trimmedCode },
    );

    if (verifyError) {
      setIsSubmitting(false);
      setErrorMessage(verifyError.message);
      return;
    }

    const check = verifyData as { valid: boolean; message?: string } | null;
    if (check && !check.valid) {
      setIsSubmitting(false);
      setErrorMessage(check.message ?? t.enterInviteCode);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          invite_code: trimmedCode,
          display_name: trimmedName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setSuccessMessage(t.accountCreatedCheckEmail);
    } else {
      if (lang !== 'fr') {
        try {
          await supabase.from('profiles').update({ language: lang }).eq('id', data.session.user.id);
        } catch {
          // non-blocking
        }
      }
      setSuccessMessage(t.joinSuccess);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerCard}>
        <Ionicons name="ticket-outline" size={32} color={theme.colors.primary} />
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t.joinHousehold}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
          {t.joinSubtitle}
        </Text>
      </View>

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.inviteCode}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.inviteCodePlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.yourName}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.displayNamePlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.email}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.emailPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.password}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.passwordPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {errorMessage ? (
        <View style={[styles.errorBox, isRTL && styles.rowRTL]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={[styles.successBox, isRTL && styles.rowRTL]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.successText, isRTL && styles.textRTL]}>{successMessage}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        onPress={handleJoin}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>{t.join}</Text>
        )}
      </Pressable>

      <Pressable style={[styles.backLink, isRTL && styles.rowRTL]} onPress={() => navigation.goBack()}>
        <Ionicons name={isRTL ? "arrow-forward-outline" : "arrow-back-outline"} size={16} color={theme.colors.primary} />
        <Text style={styles.backLinkText}>{t.welcomeTitle}</Text>
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
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EDF5F2',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  successText: {
    flex: 1,
    fontSize: theme.typography.label,
    color: theme.colors.text,
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.lg,
    minHeight: theme.touchTarget.minHeight,
  },
  backLinkText: {
    fontSize: theme.typography.label,
    color: theme.colors.primary,
    fontWeight: '600',
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

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useTranslation } from '../i18n';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { t, isRTL, lang, setGuestLanguage } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || password.length < 6) {
      setMessage(t.enterRegistrationDetails);
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: trimmedName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data.session) {
      setMessage(t.accountCreatedCheckEmail);
      return;
    }

    if (data.session?.user && lang !== 'fr') {
      try {
        await supabase.from('profiles').update({ language: lang }).eq('id', data.session.user.id);
      } catch {
        // non-blocking
      }
    }

    setMessage(t.accountCreated);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.langRow, isRTL && styles.rowRTL]}>
        <Pressable
          style={styles.langPill}
          onPress={() => {
            const next = lang === 'ar' ? 'fr' : 'ar';
            setGuestLanguage(next);
            I18nManager.forceRTL(next === 'ar');
          }}
        >
          <Text style={styles.langPillText}>{lang === 'ar' ? 'Français' : 'العربية'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.title, isRTL && styles.textRTL]}>{t.createAccount}</Text>
      <Text style={[styles.message, isRTL && styles.textRTL]}>{t.registerSubtitle}</Text>

      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.displayNamePlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.emailPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder={t.passwordPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {message ? <Text style={[styles.feedback, isRTL && styles.textRTL]}>{message}</Text> : null}

      <Pressable style={styles.button} onPress={handleRegister} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>{t.createAccount}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>{t.iAlreadyHaveAnAccount}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  langPill: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  langPillText: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.primary,
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  feedback: {
    marginBottom: theme.spacing.sm,
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
  link: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'center',
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

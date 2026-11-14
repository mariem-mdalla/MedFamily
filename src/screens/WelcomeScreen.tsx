import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { useTranslation } from '../i18n';
import { RootStackParamList } from '../navigation/types';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { t, isRTL, lang, setGuestLanguage } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Language Switcher for Guest / Pre-login */}
      <View style={styles.langSelectorContainer}>
        <View style={styles.langSelector}>
          <Pressable
            style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
            onPress={() => {
              setGuestLanguage('fr');
              I18nManager.forceRTL(false);
            }}
          >
            <Text style={[styles.langText, lang === 'fr' && styles.langTextActive]}>Français</Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
            onPress={() => {
              setGuestLanguage('ar');
              I18nManager.forceRTL(true);
            }}
          >
            <Text style={[styles.langText, lang === 'ar' && styles.langTextActive]}>العربية</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <Ionicons name="medkit-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>MedFamily</Text>
        <Text style={[styles.message, isRTL && styles.textRTL]}>{t.welcomeSubtitle}</Text>

        <Pressable style={styles.button} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.buttonText}>{t.createAccount}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>{t.iAlreadyHaveAnAccount}</Text>
        </Pressable>

        <Pressable style={[styles.inviteButton, isRTL && styles.rowRTL]} onPress={() => navigation.navigate('JoinWithCode')}>
          <Ionicons name="ticket-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.inviteButtonText}>{t.joinWithInviteCode}</Text>
        </Pressable>
      </View>
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
  langSelectorContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  langBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  langText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  langTextActive: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    marginTop: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  inviteButton: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
  },
  inviteButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.label,
    fontWeight: '600',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});

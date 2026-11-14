import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session } = useAuth();
  const { t, isRTL, lang } = useTranslation();

  const todayFormatted = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'fr-FR', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const userName = profile?.display_name ?? session?.user.email ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={[styles.dateText, isRTL && styles.textRTL]}>{todayFormatted}</Text>
        <Text style={[styles.greetingText, isRTL && styles.textRTL]}>
          {t.hi}, {userName}
        </Text>
        <View style={[styles.roleBadge, isRTL && styles.roleBadgeRTL]}>
          <Text style={styles.roleText}>
            {profile?.role === 'admin' ? t.householdAdmin : t.familyMember}
          </Text>
        </View>
      </View>

      <View style={styles.overviewCard}>
        <View style={[styles.overviewHeading, isRTL && styles.rowRTL]}>
          <View style={[styles.overviewIcon, isRTL && styles.overviewIconRTL]}>
            <Ionicons name="medkit-outline" size={24} color={theme.colors.primary} />
          </View>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
            {profile?.role === 'admin' ? t.manageMedicinesCardTitle : t.yourScheduleCardTitle}
          </Text>
        </View>
        <Text style={[styles.cardDescription, isRTL && styles.textRTL]}>
          {profile?.role === 'admin'
            ? t.manageMedicinesCardDesc
            : t.yourScheduleCardDesc}
        </Text>
        {profile?.role === 'admin' ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddMedicine')}
          >
            <Text style={styles.actionButtonText}>{t.addAMedicine}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  dateText: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  greetingText: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  roleBadgeRTL: {
    alignSelf: 'flex-end',
  },
  roleText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  overviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  overviewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  overviewIconRTL: {
    marginRight: 0,
    marginLeft: theme.spacing.sm,
  },
  cardDescription: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});

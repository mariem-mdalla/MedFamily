import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { playReminderSound, stopReminderSound } from '../lib/soundPlayer';
import { speakMedicineReminder } from '../lib/speechReminder';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reminder'>;

export default function ReminderScreen({ route, navigation }: Props) {
  const { medicationName, careProfileId, careProfileName, careProfileColor, timeLocal, scheduleId, language } =
    route.params;
  const { profile } = useAuth();
  const { t, isRTL } = useTranslation();

  // On mount: play sound + auto-speak if voice is enabled
  useEffect(() => {
    playReminderSound();

    if (profile?.voice_enabled) {
      speakMedicineReminder(medicationName, language);
    }

    return () => {
      stopReminderSound();
    };
  }, [medicationName, language, profile?.voice_enabled]);

  async function recordDose(status: 'taken' | 'skipped') {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hour = timeLocal.split(':').slice(0, 2).join(':');

    let resolvedCareProfileId = careProfileId;
    if (!resolvedCareProfileId && scheduleId && scheduleId !== 'test') {
      const { data: schedData } = await supabase
        .from('schedules')
        .select('medications(care_profile_id)')
        .eq('id', scheduleId)
        .maybeSingle();
      const med = schedData?.medications as unknown as { care_profile_id?: string } | undefined;
      resolvedCareProfileId = med?.care_profile_id;
    }

    if (scheduleId && scheduleId !== 'test') {
      await supabase.from('dose_logs').insert({
        schedule_id: scheduleId,
        family_id: profile?.family_id,
        care_profile_id: resolvedCareProfileId ?? null,
        occurrence_date: today,
        time_local: hour,
        status,
        recorded_by: profile?.id ?? null,
        medicine_name: medicationName,
        instructions: '',
        recorded_at: new Date().toISOString(),
      });
    }

    navigation.goBack();
  }

  const colorDot = { backgroundColor: careProfileColor || theme.colors.primary };
  const isArabic = isRTL;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, isArabic && styles.containerRTL]}>
        {/* Header */}
        <View style={[styles.header, isArabic && styles.rowRTL]}>
          <Ionicons name="alarm-outline" size={28} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, isArabic && styles.textRTL]}>
            {t.reminderTitle}
          </Text>
        </View>

        {/* Medicine name */}
        <Text style={[styles.medicineName, isArabic && styles.textRTL]}>
          {medicationName}
        </Text>

        {/* Person row */}
        <View style={[styles.personRow, isArabic && styles.rowRTL]}>
          <View style={[styles.colorDot, colorDot]} />
          <Text style={[styles.personText, isArabic && styles.textRTL]}>
            {t.reminderFor}: {careProfileName}
          </Text>
        </View>

        {/* Time */}
        <View style={[styles.timeBadge]}>
          <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.timeText}>{timeLocal}</Text>
        </View>

        {/* Buttons */}
        <View style={[styles.actions, isArabic && styles.actionsRTL]}>
          <Pressable
            style={[styles.btn, styles.takenBtn]}
            onPress={() => recordDose('taken')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnTextLight}>{t.taken}</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.skipBtn]}
            onPress={() => recordDose('skipped')}
          >
            <Ionicons name="close-circle-outline" size={20} color={theme.colors.text} />
            <Text style={styles.btnTextDark}>{t.skip}</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.hearBtn]}
            onPress={() => speakMedicineReminder(medicationName, language)}
          >
            <Ionicons name="volume-high-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.btnTextDark, { color: theme.colors.primary }]}>{t.hearThis}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerRTL: {
    alignItems: I18nManager.isRTL ? 'flex-end' : 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.lg,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  medicineName: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  personText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  timeText: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actions: {
    width: '100%',
    gap: theme.spacing.md,
  },
  actionsRTL: {
    alignItems: 'flex-end',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  takenBtn: {
    backgroundColor: theme.colors.primary,
  },
  skipBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hearBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  btnTextLight: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: '#fff',
  },
  btnTextDark: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
});

import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { supabase } from './src/lib/supabase';
import { setupNotificationChannel } from './src/lib/medicationReminders';
import { rebuildAllReminders } from './src/lib/scheduleReminders';
import { playReminderSound } from './src/lib/soundPlayer';
import { speakMedicineReminder } from './src/lib/speechReminder';
import { RootStackParamList } from './src/navigation/types';
import RootNavigator from './src/navigation/RootNavigator';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Navigation ref so App.tsx can navigate outside the component tree
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/** Extracts route params from notification data, returns null if incomplete */
function extractReminderParams(
  data: Record<string, unknown> | undefined,
): RootStackParamList['Reminder'] | null {
  if (!data) return null;
  const { medicationName, language, scheduleId, careProfileId, careProfileName, careProfileColor, timeLocal } = data;
  if (typeof medicationName !== 'string') return null;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    medicationName: medicationName as string,
    careProfileId: typeof careProfileId === 'string' && careProfileId ? careProfileId : undefined,
    careProfileName:
      typeof careProfileName === 'string' && careProfileName
        ? careProfileName
        : language === 'ar'
          ? 'أنا'
          : 'Moi',
    careProfileColor: typeof careProfileColor === 'string' && careProfileColor ? careProfileColor : theme.colors.primary,
    timeLocal: typeof timeLocal === 'string' && timeLocal ? timeLocal : currentTime,
    scheduleId: typeof scheduleId === 'string' ? scheduleId : 'test',
    language: language === 'ar' ? 'ar' : 'fr',
  };
}

/** Navigates to ReminderScreen with retry if navigation container is not ready yet */
function navigateToReminder(params: RootStackParamList['Reminder']) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Reminder', params);
    return;
  }
  const interval = setInterval(() => {
    if (navigationRef.isReady()) {
      clearInterval(interval);
      navigationRef.navigate('Reminder', params);
    }
  }, 100);
  setTimeout(() => clearInterval(interval), 3000);
}

function NotificationVoiceListener() {
  const { profile } = useAuth();
  // Keep a ref to avoid stale closure issues
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Rebuild all reminders once profile is ready
  useEffect(() => {
    if (!profile) return;
    rebuildAllReminders(profile, supabase).catch(() => {});
  }, [profile?.id]); // only re-run when the user changes (not on every profile update)

  useEffect(() => {
    // Set up channel and request permissions once mounted in React lifecycle
    setupNotificationChannel();
    Notifications.requestPermissionsAsync();

    // Check if app was opened from a notification response (cold start)
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        const params = extractReminderParams(data);
        if (params) {
          navigateToReminder(params);
        }
      })
      .catch(() => {});

    // 1. Notification arrives while app is in FOREGROUND → navigate to ReminderScreen
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const params = extractReminderParams(data);

      if (params) {
        navigateToReminder(params);
      } else {
        // Fallback: play sound + speak without navigation
        playReminderSound();
        const currentProfile = profileRef.current;
        const shouldSpeak = currentProfile?.voice_enabled || (data as { isTest?: boolean })?.isTest;
        if (shouldSpeak) {
          const medName = (data?.medicationName as string) || 'médicament';
          const lang = (data?.language as 'fr' | 'ar') ?? (currentProfile?.language === 'ar' ? 'ar' : 'fr');
          speakMedicineReminder(medName, lang);
        }
      }
    });

    // 2. User TAPS notification from background / lock screen → open ReminderScreen
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const params = extractReminderParams(data);

      if (params) {
        navigateToReminder(params);
      } else {
        // Fallback: speak only
        const currentProfile = profileRef.current;
        const shouldSpeak = currentProfile?.voice_enabled || (data as { isTest?: boolean })?.isTest;
        if (shouldSpeak) {
          const medName = (data?.medicationName as string) || 'médicament';
          const lang = (data?.language as 'fr' | 'ar') ?? (currentProfile?.language === 'ar' ? 'ar' : 'fr');
          speakMedicineReminder(medName, lang);
        }
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []); // only once on mount — profile is read via profileRef

  return null;
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationVoiceListener />
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <RootNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

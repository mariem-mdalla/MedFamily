import { useEffect } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { setupNotificationChannel } from './src/lib/medicationReminders';
import { speakMedicineReminder } from './src/lib/speechReminder';
import RootNavigator from './src/navigation/RootNavigator';

I18nManager.allowRTL(true);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

function NotificationVoiceListener() {
  const { profile } = useAuth();

  useEffect(() => {
    // Set up channel and request permissions once mounted in React lifecycle
    setupNotificationChannel();
    Notifications.requestPermissionsAsync();

    // 1. When notification arrives while app is open in foreground
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { medicationName?: string; language?: 'fr' | 'ar'; isTest?: boolean }
        | undefined;

      const shouldSpeak = profile?.voice_enabled || data?.isTest;
      if (!shouldSpeak) return;

      const medName = data?.medicationName || (profile?.language === 'ar' ? 'دواء' : 'médicament');
      const lang = data?.language ?? (profile?.language === 'ar' ? 'ar' : 'fr');
      speakMedicineReminder(medName, lang);
    });

    // 2. When user taps the notification banner from background / lock screen
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { medicationName?: string; language?: 'fr' | 'ar'; isTest?: boolean }
        | undefined;

      const shouldSpeak = profile?.voice_enabled || data?.isTest;
      if (!shouldSpeak) return;

      const medName = data?.medicationName || (profile?.language === 'ar' ? 'دواء' : 'médicament');
      const lang = data?.language ?? (profile?.language === 'ar' ? 'ar' : 'fr');
      speakMedicineReminder(medName, lang);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [profile?.voice_enabled, profile?.language]);

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
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

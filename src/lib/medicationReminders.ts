import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type ReminderSchedule = {
  medicationName: string;
  instructions: string;
  timeLocal: string;
  recurrence: 'daily' | 'weekly' | 'monthly';
  weekdays: number[];
  dayOfMonth: number | null;
  language: 'fr' | 'ar';
  scheduleId: string;
};

const CHANNEL_ID = 'medication-reminders';

export async function scheduleMedicationReminder(schedule: ReminderSchedule) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    return false;
  }

  const [hour, minute] = schedule.timeLocal.split(':').map(Number);
  const title = schedule.language === 'ar' ? 'تذكير بالدواء' : 'Rappel de médicament';
  const reminder = schedule.language === 'ar'
    ? `حان وقت تناول ${schedule.medicationName}.`
    : `C'est l'heure de prendre ${schedule.medicationName}.`;
  const body = schedule.instructions ? `${reminder} ${schedule.instructions}` : reminder;
  const content = {
    title,
    body,
    sound: 'default' as const,
    data: { scheduleId: schedule.scheduleId },
  };

  if (schedule.recurrence === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  }

  if (schedule.recurrence === 'monthly' && schedule.dayOfMonth) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: schedule.dayOfMonth,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  }

  const expoWeekdays = schedule.weekdays.map((weekday) => (weekday === 7 ? 1 : weekday + 1));

  await Promise.all(
    expoWeekdays.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      }),
    ),
  );

  return true;
}

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderSchedule = {
  medicationName: string;
  doseAmount: string | null;
  instructions: string;
  timeLocal: string;
  recurrence: 'daily' | 'weekly' | 'monthly';
  weekdays: number[];
  dayOfMonth: number | null;
  language: 'fr' | 'ar';
  scheduleId: string;
};

export const NOTIFICATION_CHANNEL_ID = 'medication-reminders';

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Medication Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    } catch {
      // non-blocking
    }
  }
}

export async function cancelScheduledRemindersForIds(scheduleIds: string[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const toCancel = scheduled.filter((n) => {
    const id = n.content.data?.scheduleId as string | undefined;
    return id !== undefined && scheduleIds.includes(id);
  });

  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function scheduleMedicationReminder(schedule: ReminderSchedule): Promise<boolean> {
  await setupNotificationChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    return false;
  }

  const [hour, minute] = schedule.timeLocal.split(':').map(Number);
  const title = schedule.language === 'ar' ? 'تذكير بالدواء' : 'Rappel de médicament';

  const doseHint = schedule.doseAmount ? ` (${schedule.doseAmount})` : '';
  const reminderBase =
    schedule.language === 'ar'
      ? `حان وقت تناول ${schedule.medicationName}${doseHint}.`
      : `C'est l'heure de prendre ${schedule.medicationName}${doseHint}.`;

  const body = schedule.instructions ? `${reminderBase} ${schedule.instructions}` : reminderBase;
  const content = {
    title,
    body,
    sound: 'default' as const,
    data: {
      scheduleId: schedule.scheduleId,
      medicationName: schedule.medicationName,
      language: schedule.language,
    },
  };

  // 1. Calculate the exact next occurrence Date
  const now = new Date();
  const nextOccurrence = new Date();
  nextOccurrence.setHours(hour, minute, 0, 0);

  // If the target time has already passed today, push to tomorrow
  if (nextOccurrence.getTime() <= now.getTime()) {
    nextOccurrence.setDate(nextOccurrence.getDate() + 1);
  }

  // 2. Schedule the immediate next occurrence with an exact DATE trigger
  // This guarantees that short-term tests (e.g. 1-2 minutes from now) fire on time without inexact Doze delays
  try {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextOccurrence,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  } catch {
    // continue
  }

  // 3. Schedule the repeating schedule based on recurrence type
  if (schedule.recurrence === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: NOTIFICATION_CHANNEL_ID,
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
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
    return true;
  }

  if (schedule.recurrence === 'weekly' && schedule.weekdays.length > 0) {
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
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        }),
      ),
    );
  }

  return true;
}

export async function scheduleTestReminder(language: 'fr' | 'ar', seconds = 5): Promise<boolean> {
  await setupNotificationChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    return false;
  }

  const isAr = language === 'ar';
  const medicineName = isAr ? 'باراسيتامول' : 'Paracétamol';
  const title = isAr ? 'تذكير بالدواء (اختبار)' : 'Rappel de médicament (Test)';
  const body = isAr
    ? `حان وقت تناول ${medicineName}. خذ حبة واحدة بعد الأكل.`
    : `C'est l'heure de prendre ${medicineName}. Prendre 1 comprimé après le repas.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: {
        medicationName: medicineName,
        language,
        isTest: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });

  return true;
}

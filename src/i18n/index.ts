import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { en, TranslationKeys } from './en';
import { fr } from './fr';
import { ar } from './ar';

export type { TranslationKeys };

const dictionaries: Record<'en' | 'fr' | 'ar', TranslationKeys> = {
  en,
  fr: { ...en, ...fr },
  ar: { ...en, ...ar },
};

let globalGuestLanguage: 'fr' | 'ar' = 'fr';
const languageListeners = new Set<() => void>();

export function setGuestLanguage(lang: 'fr' | 'ar') {
  globalGuestLanguage = lang;
  languageListeners.forEach((fn) => fn());
}

export function getTranslation(language?: 'fr' | 'ar' | null): TranslationKeys {
  const lang = language === 'ar' ? 'ar' : 'fr';
  return dictionaries[lang] ?? dictionaries.en;
}

export function useTranslation() {
  const { profile } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((v) => v + 1);
    languageListeners.add(listener);
    return () => {
      languageListeners.delete(listener);
    };
  }, []);

  const lang = (profile?.language ?? globalGuestLanguage) as 'fr' | 'ar';
  const isRTL = lang === 'ar';
  const t = dictionaries[lang] ?? dictionaries.en;

  function formatSchedule(
    recurrence: string | null | undefined,
    weekdays: number[] | null | undefined,
    dayOfMonth: number | null | undefined,
  ): string {
    if (!recurrence || recurrence === 'daily') {
      return t.dailyRepeat;
    }

    if (recurrence === 'monthly') {
      return t.monthlyOnDay(dayOfMonth ?? null);
    }

    if (recurrence === 'weekly' && Array.isArray(weekdays) && weekdays.length > 0) {
      const dayMap: Record<number, string> = {
        1: t.mon,
        2: t.tue,
        3: t.wed,
        4: t.thu,
        5: t.fri,
        6: t.sat,
        7: t.sun,
      };
      return weekdays.map((d) => dayMap[d] ?? '').filter(Boolean).join(', ');
    }

    return t.dailyRepeat;
  }

  return {
    t,
    lang,
    isRTL,
    isDeviceRTL: I18nManager.isRTL,
    setGuestLanguage,
    formatSchedule,
  };
}

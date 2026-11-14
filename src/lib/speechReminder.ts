import * as Speech from 'expo-speech';

export async function findMatchingVoice(lang: 'fr' | 'ar'): Promise<string | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) {
      return undefined;
    }

    const isAr = lang === 'ar';
    const matchingVoice = voices.find((v) => {
      const l = v.language.toLowerCase();
      const id = v.identifier.toLowerCase();
      if (isAr) {
        return l.startsWith('ar') || id.includes('ar');
      }
      return l === 'fr-fr' || l.startsWith('fr') || id.includes('fra') || id.includes('french');
    });

    return matchingVoice?.identifier;
  } catch {
    return undefined;
  }
}

export async function speakMedicineReminder(medicineName: string, lang: 'fr' | 'ar'): Promise<void> {
  const isAr = lang === 'ar';
  const langCode = isAr ? 'ar-SA' : 'fr-FR';
  const phrase = isAr
    ? `حان وقت تناول ${medicineName}`
    : `Il est temps de prendre ${medicineName}`;

  const voiceIdentifier = await findMatchingVoice(lang);

  Speech.stop();
  Speech.speak(phrase, {
    language: langCode,
    voice: voiceIdentifier,
    rate: 0.9,
  });
}

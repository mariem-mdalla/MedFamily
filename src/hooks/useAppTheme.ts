import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export function useAppTheme() {
  const { profile } = useAuth();

  const isLarge = profile?.large_text ?? false;
  const isHighContrast = profile?.high_contrast ?? false;

  const fontSizes = {
    title: isLarge ? 24 : 20,
    section: isLarge ? 20 : 16,
    body: isLarge ? 17 : 14,
    label: isLarge ? 16 : 13,
    helper: isLarge ? 14 : 12,
    small: isLarge ? 13 : 11,
  };

  const colors = {
    text: isHighContrast ? '#000000' : theme.colors.text,
    textMuted: isHighContrast ? '#111827' : theme.colors.textMuted,
    border: isHighContrast ? '#111827' : theme.colors.border,
    background: theme.colors.background,
    surface: '#FFFFFF',
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: isHighContrast ? 2 : 1,
  };

  const buttonStyle = {
    minHeight: isLarge ? 52 : 46,
  };

  return {
    isLarge,
    isHighContrast,
    fontSizes,
    colors,
    cardStyle,
    buttonStyle,
  };
}

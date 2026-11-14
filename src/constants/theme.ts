export const theme = {
  colors: {
    primary: '#52796F',
    primaryDark: '#354F52',
    secondary: '#84A98C',
    background: '#F5F3EB',
    surface: '#FFFFFF',
    text: '#263B35',
    textMuted: '#5C6B64',
    border: '#CAD2C5',
    error: '#BC4749',
    status: {
      taken: '#52796F',
      notRecorded: '#DDA15E',
      skipped: '#8D99AE',
      upcoming: '#3D5A80',
    },
  },
  typography: {
    title: 32,
    section: 22,
    body: 18,
    label: 16,
    small: 14,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
  touchTarget: {
    minHeight: 56,
    minTarget: 48,
  },
} as const;

export function getTheme(largeText = false, highContrast = false) {
  return {
    colors: {
      ...theme.colors,
      primary: highContrast ? '#1B4332' : theme.colors.primary,
      primaryDark: highContrast ? '#081C15' : theme.colors.primaryDark,
      secondary: highContrast ? '#2D6A4F' : theme.colors.secondary,
      background: highContrast ? '#FFFFFF' : theme.colors.background,
      surface: '#FFFFFF',
      text: highContrast ? '#000000' : theme.colors.text,
      textMuted: highContrast ? '#1F2937' : theme.colors.textMuted,
      border: highContrast ? '#374151' : theme.colors.border,
      error: highContrast ? '#991B1B' : theme.colors.error,
      status: {
        taken: highContrast ? '#1B4332' : theme.colors.status.taken,
        notRecorded: highContrast ? '#B45309' : theme.colors.status.notRecorded,
        skipped: highContrast ? '#4B5563' : theme.colors.status.skipped,
        upcoming: highContrast ? '#1E3A8A' : theme.colors.status.upcoming,
      },
    },
    typography: {
      title: largeText ? 38 : 32,
      section: largeText ? 26 : 22,
      body: largeText ? 22 : 18,
      label: largeText ? 19 : 16,
      small: largeText ? 16 : 14,
    },
    spacing: theme.spacing,
    radius: theme.radius,
    touchTarget: theme.touchTarget,
  };
}

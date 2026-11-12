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

const sharedColors = {
  azureRadiance: '#007AFF',
  limedSpruce: '#38434D',
  cornflowerBlue: '#6366F1',
  astral: '#2E78B7',
  primary: '#2F80ED',
  accent: '#56CCF2',
} as const;

export const lightTheme = {
  colors: {
    ...sharedColors,
    typography: '#1A1A1A',
    background: '#F9FAFB',
    white: '#FFFFFF',
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    screen: 20,
  },
  spacing: (value: number) => value * 4,
} as const;

export const darkTheme = {
  colors: {
    ...sharedColors,
    typography: '#F9FAFB',
    background: '#1A1A1A',
    white: '#FFFFFF',
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    screen: 20,
  },
  spacing: (value: number) => value * 4,
} as const;

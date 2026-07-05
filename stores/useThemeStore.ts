import { create } from 'zustand';

export interface Theme {
  // Backgrounds
  bg: string;
  bgSecondary: string;
  card: string;
  cardBorder: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Brand
  blue: string;
  blueLight: string;
  // Messages
  bubbleOwn: string;
  bubbleOwnText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  bubbleOtherBorder: string;
  // Input
  inputBg: string;
  inputBorder: string;
  // Misc
  divider: string;
  iconBg: string;
  danger: string;
}

const LIGHT: Theme = {
  bg: '#F5F7FB',
  bgSecondary: '#EEF2FD',
  card: '#ffffff',
  cardBorder: '#E4E9F2',
  textPrimary: '#1A1D2E',
  textSecondary: '#6B7A99',
  textMuted: '#A0AABA',
  blue: '#3B6EE8',
  blueLight: '#EEF2FD',
  bubbleOwn: '#3B6EE8',
  bubbleOwnText: '#ffffff',
  bubbleOther: '#ffffff',
  bubbleOtherText: '#1A1D2E',
  bubbleOtherBorder: '#E4E9F2',
  inputBg: '#F5F7FB',
  inputBorder: '#E4E9F2',
  divider: '#F0F4FC',
  iconBg: '#F5F7FB',
  danger: '#ef4444',
};

const DARK: Theme = {
  bg: '#0F1117',
  bgSecondary: '#161B27',
  card: '#1C2235',
  cardBorder: '#2A3450',
  textPrimary: '#E8EBF5',
  textSecondary: '#8A95B0',
  textMuted: '#505A75',
  blue: '#4F85FF',
  blueLight: '#1A2B50',
  bubbleOwn: '#4F85FF',
  bubbleOwnText: '#ffffff',
  bubbleOther: '#1C2235',
  bubbleOtherText: '#E8EBF5',
  bubbleOtherBorder: '#2A3450',
  inputBg: '#161B27',
  inputBorder: '#2A3450',
  divider: '#1A2035',
  iconBg: '#161B27',
  danger: '#ff5c5c',
};

interface ThemeState {
  isDark: boolean;
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  theme: LIGHT,
  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next, theme: next ? DARK : LIGHT });
  },
}));

// Dashboard design tokens — shared across dashboard atomic components.
// Hard-coded per design brief; intentionally not from ThemeContext to keep
// the dashboard pixel-perfect across light/dark modes.

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const T = {
  bg: '#08082A',
  card: '#12123A',
  card2: '#1A1A4A',
  primary: '#6C47FF',
  gradFrom: '#4B2FBF',
  gradTo: '#7B4FEF',
  success: '#00C48C',
  danger: '#FF4D67',
  info: '#4D9EFF',
  text: '#FFFFFF',
  textDim: '#A0A3BD',
  border: 'rgba(255,255,255,0.06)',
} as const;

export const FONT = 'System'; // SF Pro Display on iOS, Roboto on Android

// Haptic feedback — no-op on web
export const tap = (style: 'light' | 'medium' = 'light') => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.impactAsync(
        style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {
      /* ignore */
    }
  }
};

export const COLORS = {
  // Primary
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#5449CC',
  
  // Success/Positive
  success: '#4CAF50',
  successLight: '#81C784',
  successDark: '#388E3C',
  
  // Error/Negative
  error: '#F44336',
  errorLight: '#E57373',
  errorDark: '#D32F2F',
  
  // Warning
  warning: '#FF9800',
  warningLight: '#FFB74D',
  warningDark: '#F57C00',
  
  // Neutral
  background: '#F5F5F5',
  white: '#FFFFFF',
  black: '#000000',
  
  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  
  // Borders
  border: '#E0E0E0',
  borderDark: '#BDBDBD',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

export const SHADOWS = {
  sm: {
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  md: {
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

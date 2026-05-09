import { CURRENCIES } from '../constants/theme';

export const getCurrencySymbol = (code?: string): string => {
  if (!code) return '$';
  const found = CURRENCIES.find((c) => c.code === code);
  return found?.symbol || '$';
};

export const getCurrencyName = (code?: string): string => {
  if (!code) return 'US Dollar';
  const found = CURRENCIES.find((c) => c.code === code);
  return found?.name || 'US Dollar';
};

export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  const value = (amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${value}`;
};

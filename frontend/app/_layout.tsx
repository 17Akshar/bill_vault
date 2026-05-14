import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Fintracker – Personal Finance & Wealth Management';
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/forgot-password" />
            <Stack.Screen name="auth/forgot-email" />
            <Stack.Screen name="auth/mpin-setup-prompt" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="accounts/add" />
            <Stack.Screen name="transactions/add" />
            <Stack.Screen name="profile/family" />
            <Stack.Screen name="profile/categories" />
            <Stack.Screen name="profile/budgets" />
            <Stack.Screen name="bills/add" />
            <Stack.Screen name="bills/[id]" />
            <Stack.Screen name="bills/edit" />
            <Stack.Screen name="credit-cards/index" />
            <Stack.Screen name="loans/index" />
            <Stack.Screen name="loans/[id]" />
            <Stack.Screen name="lending/index" />
            <Stack.Screen name="investments/index" />
            <Stack.Screen name="net-worth/index" />
            <Stack.Screen name="reminders/index" />
            <Stack.Screen name="rentals/index" />
            <Stack.Screen name="reports/index" />
            <Stack.Screen name="reports/investment-analytics" />
            <Stack.Screen name="reports/cashflow" />
            <Stack.Screen name="reports/expense-breakdown" />
            <Stack.Screen name="budgets/index" />
            <Stack.Screen name="security/mpin" />
            <Stack.Screen name="calendar/index" />
            <Stack.Screen name="notes/index" />
            <Stack.Screen name="profile/dashboard-settings" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
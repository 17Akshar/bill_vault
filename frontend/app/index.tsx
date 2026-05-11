import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

// Tab/Home screens
import { HomeScreen } from '../src/screens/HomeScreen';
import {
  TransactionsTabScreen,
  WealthScreen,
  InsightsTabScreen,
} from '../src/screens/PlaceholderTabs';
import { MoreScreen } from '../src/screens/MoreScreen';

// Existing module screens (Budget, Lend & Borrowed, etc.) — reused as-is
import { BudgetDashboardScreen } from '../src/screens/BudgetDashboardScreen';
import { AddToBudgetScreen } from '../src/screens/AddToBudgetScreen';
import { AddCategoryBudgetScreen } from '../src/screens/AddCategoryBudgetScreen';
import { SavingsGoalScreen } from '../src/screens/SavingsGoalScreen';
import { BudgetInsightsScreen } from '../src/screens/BudgetInsightsScreen';
import { CurrencySettingsScreen } from '../src/screens/CurrencySettingsScreen';
import { BudgetTemplatesScreen } from '../src/screens/BudgetTemplatesScreen';
import { LendBorrowDashboardScreen } from '../src/screens/LendBorrowDashboardScreen';
import { AddLoanScreen } from '../src/screens/AddLoanScreen';
import { LoanDetailScreen } from '../src/screens/LoanDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const DARK_TAB_BG = '#0B0B0F';
const ACCENT = '#7B61FF';
const INACTIVE = '#666B7E';

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: DARK_TAB_BG,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'home',
            Transactions: 'repeat',
            Wealth: 'trending-up',
            Insights: 'bar-chart-2',
            More: 'menu',
          };
          return (
            <Feather
              name={(icons[route.name] || 'circle') as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsTabScreen} />
      <Tab.Screen name="Wealth" component={WealthScreen} />
      <Tab.Screen name="Insights" component={InsightsTabScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function Index() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator
        initialRouteName="Tabs"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} />

        {/* Existing Budget module — unchanged, reused */}
        <Stack.Screen name="BudgetDashboard" component={BudgetDashboardScreen} />
        <Stack.Screen
          name="AddToBudget"
          component={AddToBudgetScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="AddCategoryBudget" component={AddCategoryBudgetScreen} />
        <Stack.Screen name="SavingsGoal" component={SavingsGoalScreen} />
        <Stack.Screen name="BudgetInsights" component={BudgetInsightsScreen} />
        <Stack.Screen
          name="CurrencySettings"
          component={CurrencySettingsScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="BudgetTemplates" component={BudgetTemplatesScreen} />

        {/* Existing Lend & Borrowed module — unchanged, reused */}
        <Stack.Screen
          name="LendBorrowDashboard"
          component={LendBorrowDashboardScreen}
        />
        <Stack.Screen name="AddLoan" component={AddLoanScreen} />
        <Stack.Screen name="LoanDetail" component={LoanDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

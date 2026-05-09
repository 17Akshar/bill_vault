import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BudgetDashboardScreen } from '../src/screens/BudgetDashboardScreen';
import { AddToBudgetScreen } from '../src/screens/AddToBudgetScreen';
import { AddCategoryBudgetScreen } from '../src/screens/AddCategoryBudgetScreen';
import { SavingsGoalScreen } from '../src/screens/SavingsGoalScreen';
import { BudgetInsightsScreen } from '../src/screens/BudgetInsightsScreen';
import { CurrencySettingsScreen } from '../src/screens/CurrencySettingsScreen';

const Stack = createNativeStackNavigator();

export default function Index() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator
        initialRouteName="BudgetDashboard"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="BudgetDashboard" component={BudgetDashboardScreen} />
        <Stack.Screen
          name="AddToBudget"
          component={AddToBudgetScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="AddCategoryBudget" component={AddCategoryBudgetScreen} />
        <Stack.Screen name="SavingsGoal" component={SavingsGoalScreen} />
        <Stack.Screen name="BudgetInsights" component={BudgetInsightsScreen} />
        <Stack.Screen
          name="CurrencySettings"
          component={CurrencySettingsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

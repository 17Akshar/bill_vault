import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BudgetDashboardScreen } from '../src/screens/BudgetDashboardScreen';
import { AddToBudgetScreen } from '../src/screens/AddToBudgetScreen';
import { AddCategoryBudgetScreen } from '../src/screens/AddCategoryBudgetScreen';
import { AddCustomCategoryScreen } from '../src/screens/AddCustomCategoryScreen';
import { SetTotalBudgetScreen } from '../src/screens/SetTotalBudgetScreen';
import { SavingsGoalScreen } from '../src/screens/SavingsGoalScreen';
import { ImportBudgetScreen } from '../src/screens/ImportBudgetScreen';
import { BudgetInsightsScreen } from '../src/screens/BudgetInsightsScreen';

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
        <Stack.Screen name="AddCustomCategory" component={AddCustomCategoryScreen} />
        <Stack.Screen name="SetTotalBudget" component={SetTotalBudgetScreen} />
        <Stack.Screen name="SavingsGoal" component={SavingsGoalScreen} />
        <Stack.Screen name="ImportBudget" component={ImportBudgetScreen} />
        <Stack.Screen name="BudgetInsights" component={BudgetInsightsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

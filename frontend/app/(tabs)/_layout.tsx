import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { View } from 'react-native';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { backgroundColor: color + '15', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { backgroundColor: color + '15', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? "swap-horizontal" : "swap-horizontal-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { backgroundColor: color + '15', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? "wallet" : "wallet-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { backgroundColor: color + '15', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? "apps" : "apps-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { backgroundColor: color + '15', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      {/* Hide analytics from tab bar but keep route accessible */}
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
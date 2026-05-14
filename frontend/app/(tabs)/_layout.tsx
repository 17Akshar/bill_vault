import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

// Spec dashboard theme tokens — applied to the bottom tab bar globally
const T = {
  bg:       '#08082A',
  card:     '#12123A',
  primary:  '#6C47FF',
  textDim:  '#A0A3BD',
  border:   'rgba(255,255,255,0.06)',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.textDim,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activePill : styles.iconWrap}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activePill : styles.iconWrap}>
              <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Wealth',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activePill : styles.iconWrap}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activePill : styles.iconWrap}>
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Hide bills from tab bar — accessible via More / direct route */}
      <Tabs.Screen name="bills" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activePill : styles.iconWrap}>
              <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Hide analytics from tab bar but keep route accessible */}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: T.card,
    borderTopColor: T.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 12,
    paddingTop: 8,
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    padding: 4,
  },
  activePill: {
    backgroundColor: T.primary + '22',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

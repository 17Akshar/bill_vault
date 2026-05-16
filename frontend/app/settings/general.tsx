import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function GeneralSettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const toggleOptions = [
    {
      icon: 'moon-outline',
      label: 'Dark Mode',
      desc: 'Use dark theme across the app',
      value: isDark,
      onChange: (_v: boolean) => toggleTheme(),
    },
    {
      icon: 'notifications-outline',
      label: 'Push Notifications',
      desc: 'Receive app notifications',
      value: notificationsEnabled,
      onChange: setNotificationsEnabled,
    },
    {
      icon: 'volume-high-outline',
      label: 'Sound',
      desc: 'Play sound for alerts',
      value: soundEnabled,
      onChange: setSoundEnabled,
    },
    {
      icon: 'phone-portrait-outline',
      label: 'Vibration',
      desc: 'Vibrate for notifications',
      value: vibrationEnabled,
      onChange: setVibrationEnabled,
    },
    {
      icon: 'bar-chart-outline',
      label: 'Usage Analytics',
      desc: 'Help improve the app anonymously',
      value: analyticsEnabled,
      onChange: setAnalyticsEnabled,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>General Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>APPEARANCE & BEHAVIOUR</Text>
          {toggleOptions.map((item, idx) => (
            <View
              key={idx}
              style={[styles.row, idx < toggleOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/settings/notifications' as any)}
        >
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="notifications-circle-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Notification Preferences</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>Configure alerts for bills, EMIs, investments</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerCard, { borderColor: '#EF444430' }]}
          onPress={() => Alert.alert('Clear Cache', 'This will clear all cached data. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Done', 'Cache cleared') },
          ])}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={[styles.dangerText, { color: '#EF4444' }]}>Clear Cache</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12, fontWeight: '400' },

  dangerCard: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dangerText: { fontSize: 14, fontWeight: '700' },
});

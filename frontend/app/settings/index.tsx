import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const sections = [
    {
      title: 'PROFILE',
      items: [{ icon: 'person-outline', label: 'Profile', subtitle: 'Manage your personal information', color: '#5B2FBF', route: '/profile' }],
    },
    {
      title: 'PRODUCTIVITY',
      items: [
        { icon: 'document-outline', label: 'Notes', subtitle: 'Write and manage notes', color: '#F59E0B', route: '/notes' },
        { icon: 'notifications-outline', label: 'Reminders', subtitle: 'Never miss a due date', color: '#EF4444', route: '/reminders' },
        { icon: 'calendar-outline', label: 'Calendar', subtitle: 'View all financial events', color: '#3B82F6', route: '/calendar' },
      ],
    },
    {
      title: 'FINANCIAL TOOLS',
      items: [
        { icon: 'trending-up-outline', label: 'Investment', subtitle: 'Track and manage investments', color: '#22C55E', route: '/investments' },
        { icon: 'wallet-outline', label: 'Budget Limits', subtitle: 'Set budget and track limits', color: '#0EA5E9', route: '/budget' },
        { icon: 'calendar-number-outline', label: 'Planned Payments', subtitle: 'Upcoming bills and payments', color: '#F59E0B', route: '/planned-payments' },
        { icon: 'home-outline', label: 'Loans', subtitle: 'Track loans and EMIs', color: '#8B5CF6', route: '/loans' },
        { icon: 'home-outline', label: 'Rentals', subtitle: 'Manage rental properties', color: '#FF9100', route: '/rental-tracker' },
        { icon: 'people-outline', label: 'Lent and Borrowed', subtitle: 'Track money lent or borrowed', color: '#3B82F6', route: '/lend-borrow' },
        { icon: 'card-outline', label: 'Credit Cards', subtitle: 'Manage credit cards, bills & payments', color: '#EC4899', route: '/credit-cards' },
      ],
    },
    {
      title: 'ACCOUNTS & STRUCTURE',
      items: [
        { icon: 'business-outline', label: 'Accounts', subtitle: 'View and manage your accounts', color: '#6366F1', route: '/accounts' },
        { icon: 'pricetag-outline', label: 'Categories', subtitle: 'Manage income & expense categories', color: '#EC4899', route: '/profile/categories' },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        { icon: 'settings-outline', label: 'General Settings', subtitle: 'General app settings', color: '#6B7280', route: '/settings/general' },
        { icon: 'shield-outline', label: 'Security (MPIN)', subtitle: 'Change MPIN & security', color: '#22C55E', route: '/security' },
        { icon: 'cloud-upload-outline', label: 'Backup, Sync & Export', subtitle: 'Backup and sync your data', color: '#0EA5E9', route: '/backup-sync' },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { icon: 'help-circle-outline', label: 'Help & Support', subtitle: 'Get help and contact us', color: '#EF4444', route: '/help' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((section, sectionIdx) => (
          <View key={sectionIdx}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[styles.item, itemIdx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={styles.itemLabel}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

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

  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },

  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemSubtitle: { fontSize: 12, fontWeight: '400' },
});

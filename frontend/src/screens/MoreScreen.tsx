import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Premium dark theme tokens for the More screen (matches reference design)
const DARK = {
  bg: '#0B0B0F',
  cardBg: '#171821',
  cardBgAlt: '#1C1D27',
  textPrimary: '#FFFFFF',
  textSecondary: '#9BA0B3',
  textMuted: '#666B7E',
  divider: '#252731',
  accent: '#7B61FF',
};

interface MoreScreenProps {
  navigation: any;
}

interface MoreItem {
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  /** If `screen` is set, navigate to it. Otherwise show "Coming soon" alert. */
  screen?: string;
  comingSoon?: boolean;
}

interface MoreSection {
  title: string;
  items: MoreItem[];
}

const SECTIONS: MoreSection[] = [
  {
    title: 'PROFILE',
    items: [
      {
        title: 'Profile',
        subtitle: 'Profile photo, email ID, mobile number, user ID, password & security question',
        icon: 'user',
        iconBg: '#7B61FF',
        comingSoon: true,
      },
    ],
  },
  {
    title: 'PRODUCTIVITY',
    items: [
      {
        title: 'Notes',
        subtitle: 'Write and manage notes',
        icon: 'file-text',
        iconBg: '#F5A623',
        comingSoon: true,
      },
      {
        title: 'Reminders',
        subtitle: 'Never miss a due date',
        icon: 'bell',
        iconBg: '#E74C3C',
        comingSoon: true,
      },
      {
        title: 'Calendar',
        subtitle: 'View all financial events',
        icon: 'calendar',
        iconBg: '#3498DB',
        comingSoon: true,
      },
    ],
  },
  {
    title: 'FINANCIAL TOOLS',
    items: [
      {
        title: 'Investment',
        subtitle: 'Track and manage investments',
        icon: 'trending-up',
        iconBg: '#2ECC71',
        comingSoon: true,
      },
      {
        title: 'Budget',
        subtitle: 'Set budgets and track spending',
        icon: 'pie-chart',
        iconBg: '#16C79A',
        screen: 'BudgetDashboard',
      },
      {
        title: 'Planned Payments',
        subtitle: 'Upcoming bills and payments',
        icon: 'calendar',
        iconBg: '#E84393',
        comingSoon: true,
      },
      {
        title: 'Loans',
        subtitle: 'Track loans and EMIs',
        icon: 'home',
        iconBg: '#6C5CE7',
        comingSoon: true,
      },
      {
        title: 'Rentals',
        subtitle: 'Manage rental properties',
        icon: 'home',
        iconBg: '#FDA85F',
        comingSoon: true,
      },
      {
        title: 'Lend & Borrowed',
        subtitle: 'Track money lent or borrowed',
        icon: 'users',
        iconBg: '#3498DB',
        screen: 'LendBorrowDashboard',
      },
    ],
  },
  {
    title: 'ACCOUNTS & STRUCTURE',
    items: [
      {
        title: 'Accounts',
        subtitle: 'View and manage your accounts',
        icon: 'credit-card',
        iconBg: '#3498DB',
        comingSoon: true,
      },
      {
        title: 'Categories',
        subtitle: 'Manage income & expense categories',
        icon: 'grid',
        iconBg: '#9B59B6',
        comingSoon: true,
      },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      {
        title: 'Settings',
        subtitle: 'General app settings',
        icon: 'settings',
        iconBg: '#7F8C8D',
        comingSoon: true,
      },
      {
        title: 'Currency',
        subtitle: 'Change preferred currency',
        icon: 'dollar-sign',
        iconBg: '#16C79A',
        screen: 'CurrencySettings',
      },
      {
        title: 'Security (MPIN)',
        subtitle: 'Change MPIN & security',
        icon: 'lock',
        iconBg: '#27AE60',
        comingSoon: true,
      },
      {
        title: 'Backup & Sync',
        subtitle: 'Backup and sync your data',
        icon: 'cloud',
        iconBg: '#3498DB',
        comingSoon: true,
      },
      {
        title: 'Export Data',
        subtitle: 'Export your financial data',
        icon: 'download',
        iconBg: '#16C79A',
        comingSoon: true,
      },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      {
        title: 'Help & Support',
        subtitle: 'Get help and contact us',
        icon: 'help-circle',
        iconBg: '#E74C3C',
        comingSoon: true,
      },
    ],
  },
];

export const MoreScreen: React.FC<MoreScreenProps> = ({ navigation }) => {
  const handlePress = (item: MoreItem) => {
    if (item.screen) {
      navigation?.navigate?.(item.screen);
    } else if (item.comingSoon) {
      Alert.alert('Coming Soon', `"${item.title}" will be available in a future update.`);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.title}
                    style={[
                      styles.row,
                      idx !== section.items.length - 1 && styles.rowDivider,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handlePress(item)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
                      <Feather name={item.icon as any} size={20} color={DARK.textPrimary} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={DARK.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: DARK.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    color: DARK.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginLeft: 8,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: DARK.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: DARK.divider,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: DARK.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: DARK.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 17,
  },
});

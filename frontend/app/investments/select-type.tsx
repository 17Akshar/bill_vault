import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

// Investment categories grouped
const INVESTMENT_GROUPS = [
  {
    id: 'market',
    title: 'Market Investments',
    color: '#7C4DFF',
    items: [
      {
        id: 'stocks',
        name: 'Shares / Stocks',
        description: 'Equity investments in listed companies',
        icon: 'trending-up',
        iconColor: '#00E676',
      },
      {
        id: 'mutual_funds',
        name: 'Mutual Funds',
        description: 'Professionally managed investment funds',
        icon: 'pie-chart',
        iconColor: '#448AFF',
      },
      {
        id: 'etf',
        name: 'Exchange Traded Funds',
        description: 'Nifty 50, Sensex & other ETFs',
        icon: 'stats-chart',
        iconColor: '#7C4DFF',
      },
      {
        id: 'reit',
        name: 'REIT',
        description: 'Real Estate Investment Trust',
        icon: 'business',
        iconColor: '#00BCD4',
      },
    ],
  },
  {
    id: 'fixed_income',
    title: 'Fixed Income',
    color: '#FF9100',
    items: [
      {
        id: 'fd',
        name: 'Fixed Deposit (FD)',
        description: 'Bank fixed deposits with guaranteed returns',
        icon: 'lock-closed',
        iconColor: '#FF6B81',
      },
      {
        id: 'corporate_deposit',
        name: 'Corporate Deposit',
        description: 'Company deposits with higher interest',
        icon: 'briefcase',
        iconColor: '#8D6E63',
      },
      {
        id: 'rd',
        name: 'Recurring Deposit (RD)',
        description: 'Monthly saving scheme with fixed returns',
        icon: 'calendar',
        iconColor: '#9C27B0',
      },
      {
        id: 'bonds',
        name: 'Bonds',
        description: 'Government or Corporate Bonds',
        icon: 'document-text',
        iconColor: '#14B8A6',
      },
    ],
  },
  {
    id: 'government',
    title: 'Government Schemes',
    color: '#00BCD4',
    items: [
      {
        id: 'ppf',
        name: 'PPF',
        description: 'Public Provident Fund',
        icon: 'home',
        iconColor: '#4A90D9',
      },
      {
        id: 'nps',
        name: 'NPS',
        description: 'National Pension Scheme',
        icon: 'mail-open',
        iconColor: '#10B981',
      },
      {
        id: 'epf',
        name: 'EPF',
        description: 'Employee Provident Fund',
        icon: 'briefcase',
        iconColor: '#4285F4',
      },
    ],
  },
  {
    id: 'others',
    title: 'Others',
    color: '#64748B',
    items: [
      {
        id: 'gold',
        name: 'Gold',
        description: 'Physical gold, gold ETF or Sovereign Gold Bond',
        icon: 'medal',
        iconColor: '#F59E0B',
      },
      {
        id: 'silver',
        name: 'Silver',
        description: 'Physical silver investments',
        icon: 'diamond',
        iconColor: '#9E9E9E',
      },
      {
        id: 'lic',
        name: 'LIC / Endowment',
        description: 'LIC Jeevan Anand, Money Back policies',
        icon: 'shield-checkmark',
        iconColor: '#2196F3',
      },
      {
        id: 'term_insurance',
        name: 'Term Insurance',
        description: 'Pure term life insurance plans',
        icon: 'person-circle',
        iconColor: '#7C4DFF',
      },
      {
        id: 'health_insurance',
        name: 'Health Insurance',
        description: 'Mediclaim / Family Floater policies',
        icon: 'people',
        iconColor: '#448AFF',
      },
      {
        id: 'motor_insurance',
        name: 'Motor Insurance',
        description: 'Car / Two-Wheeler insurance policies',
        icon: 'car-sport',
        iconColor: '#448AFF',
      },
      {
        id: 'vehicle',
        name: 'Vehicle / Asset',
        description: 'Car, two-wheeler or any other vehicle',
        icon: 'car',
        iconColor: '#7C4DFF',
      },
      {
        id: 'crypto',
        name: 'Crypto',
        description: 'Cryptocurrency (Bitcoin)',
        icon: 'logo-bitcoin',
        iconColor: '#F7931A',
      },
      {
        id: 'esop',
        name: 'ESOP',
        description: 'Company ESOP',
        icon: 'briefcase',
        iconColor: '#5B2FBF',
      },
      {
        id: 'private_equity',
        name: 'Private Equity',
        description: 'XYZ Private Equity Fund',
        icon: 'cash',
        iconColor: '#BE185D',
      },
      {
        id: 'aif',
        name: 'Alternative Investments',
        description: 'ABC AIF Fund',
        icon: 'layers',
        iconColor: '#06B6D4',
      },
    ],
  },
];

export default function InvestmentTypeSelectionScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Select Investment Type</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {INVESTMENT_GROUPS.map((group, groupIndex) => (
          <View key={group.id} style={styles.groupContainer}>
            {/* Group Header */}
            <View style={styles.groupHeader}>
              <View style={[styles.groupIndicator, { backgroundColor: group.color }]} />
              <Text style={[styles.groupTitle, { color: group.color }]}>{group.title}</Text>
            </View>

            {/* Group Items */}
            <View style={[styles.groupItems, { backgroundColor: colors.card }]}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    itemIndex === group.items.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    // Open the category-specific empty detail form
                    router.push(`/investments/new?type=${item.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[styles.itemIcon, { backgroundColor: item.iconColor + '20' }]}
                    >
                      <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Group Container
  groupContainer: { marginBottom: 24 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  groupIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Group Items
  groupItems: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';

// Dummy portfolio data
const PORTFOLIO_SUMMARY = {
  totalInvested: 1245000,
  currentValue: 1620000,
  gainLoss: 375000,
  gainLossPercent: 30.12,
};

// Dummy holdings data
const DUMMY_HOLDINGS = [
  {
    id: '1',
    company: 'Reliance Industries',
    quantity: 112,
    invested: 356000,
    current: 475000,
    buyPrice: 2987.45,
    currentPrice: 4241.07,
    gainLoss: 119000,
    gainLossPercent: 33.43,
    status: 'active',
  },
  {
    id: '2',
    company: 'Reliance Industries',
    quantity: 85,
    invested: 168000,
    current: 360425,
    buyPrice: 1976.47,
    currentPrice: 4241.07,
    gainLoss: 192425,
    gainLossPercent: 114.54,
    status: 'active',
  },
  {
    id: '3',
    company: 'TCS Consultancy',
    quantity: 64,
    invested: 230000,
    current: 264000,
    buyPrice: 3593.75,
    currentPrice: 4125.00,
    gainLoss: 34000,
    gainLossPercent: 14.78,
    status: 'active',
  },
  {
    id: '4',
    company: 'HDFC Bank NSE',
    quantity: 150,
    invested: 220000,
    current: 264000,
    buyPrice: 1466.67,
    currentPrice: 1760.00,
    gainLoss: 44000,
    gainLossPercent: 20.00,
    status: 'active',
  },
  {
    id: '5',
    company: 'Infosys Ltd. NSE',
    quantity: 45,
    invested: 191000,
    current: 216000,
    buyPrice: 4244.44,
    currentPrice: 4800.00,
    gainLoss: 25000,
    gainLossPercent: 13.09,
    status: 'active',
  },
  {
    id: '6',
    company: 'ITC Ltd.',
    quantity: 600,
    invested: 80000,
    current: 231000,
    buyPrice: 133.33,
    currentPrice: 385.00,
    gainLoss: -49000,
    gainLossPercent: -38.27,
    status: 'sold',
  },
];

type TabType = 'all' | 'active' | 'sold';

export default function SharesStocksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredHoldings = DUMMY_HOLDINGS.filter((holding) => {
    if (activeTab === 'all') return true;
    return holding.status === activeTab;
  });

  const activeCount = DUMMY_HOLDINGS.filter((h) => h.status === 'active').length;
  const soldCount = DUMMY_HOLDINGS.filter((h) => h.status === 'sold').length;

  const gainLossColor = PORTFOLIO_SUMMARY.gainLoss >= 0 ? '#00E676' : '#FF5252';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Shares / Stocks</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="funnel-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Portfolio Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Total Invested
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatINR(PORTFOLIO_SUMMARY.totalInvested)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Current Value
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatINR(PORTFOLIO_SUMMARY.currentValue)}
              </Text>
            </View>
          </View>

          <View style={[styles.gainLossCard, { backgroundColor: gainLossColor + '15' }]}>
            <Ionicons
              name={PORTFOLIO_SUMMARY.gainLoss >= 0 ? 'trending-up' : 'trending-down'}
              size={20}
              color={gainLossColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.gainLossLabel, { color: colors.textSecondary }]}>
                Total Gain/Loss
              </Text>
              <Text style={[styles.gainLossValue, { color: gainLossColor }]}>
                +{formatINR(PORTFOLIO_SUMMARY.gainLoss)}
              </Text>
            </View>
            <Text style={[styles.gainLossPercent, { color: gainLossColor }]}>
              +{PORTFOLIO_SUMMARY.gainLossPercent.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'all' && [styles.activeTab, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'all' ? colors.primary : colors.textSecondary },
              ]}
            >
              All ({DUMMY_HOLDINGS.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'active' && [styles.activeTab, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'active' ? colors.primary : colors.textSecondary },
              ]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'sold' && [styles.activeTab, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('sold')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'sold' ? colors.primary : colors.textSecondary },
              ]}
            >
              Sold ({soldCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Holdings List */}
        <View style={styles.holdingsList}>
          {filteredHoldings.map((holding) => {
            const isPositive = holding.gainLoss >= 0;
            const stockGainLossColor = isPositive ? '#00E676' : '#FF5252';

            return (
              <TouchableOpacity
                key={holding.id}
                style={[styles.holdingCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to stock detail screen
                }}
              >
                <View style={styles.holdingHeader}>
                  <View style={styles.holdingLeft}>
                    <View style={[styles.companyIcon, { backgroundColor: '#FF910020' }]}>
                      <Ionicons name="business" size={20} color="#FF9100" />
                    </View>
                    <View>
                      <Text style={[styles.companyName, { color: colors.text }]}>
                        {holding.company}
                      </Text>
                      <Text style={[styles.quantity, { color: colors.textSecondary }]}>
                        Qty: {holding.quantity} shares
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={[styles.currentValue, { color: colors.text }]}>
                      {formatINR(holding.current)}
                    </Text>
                    <View style={[styles.gainBadge, { backgroundColor: stockGainLossColor + '15' }]}>
                      <Ionicons
                        name={isPositive ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={stockGainLossColor}
                      />
                      <Text style={[styles.gainBadgeText, { color: stockGainLossColor }]}>
                        {isPositive ? '+' : ''}
                        {holding.gainLossPercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.holdingStats}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Invested
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatINR(holding.invested)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Buy Price
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ₹{holding.buyPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Current Price
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ₹{holding.currentPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Profit/Loss
                    </Text>
                    <Text style={[styles.statValue, { color: stockGainLossColor }]}>
                      {isPositive ? '+' : ''}
                      {formatINR(Math.abs(holding.gainLoss))}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.chevronBtn}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#6366F1' }]}
          onPress={() => {
            // Navigate to add stock screen
            router.push('/investments/add?type=stocks' as any);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Add Share / Stock</Text>
        </TouchableOpacity>
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
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  iconBtn: { padding: 4 },

  // Portfolio Summary
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: { flex: 1 },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginHorizontal: 16,
  },
  summaryLabel: { fontSize: 12, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  gainLossCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  gainLossLabel: { fontSize: 12, marginBottom: 4 },
  gainLossValue: { fontSize: 18, fontWeight: 'bold' },
  gainLossPercent: { fontSize: 16, fontWeight: '700' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Holdings List
  holdingsList: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  holdingCard: {
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  companyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  quantity: { fontSize: 12 },
  holdingRight: { alignItems: 'flex-end' },
  currentValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gainBadgeText: { fontSize: 12, fontWeight: '700' },
  holdingStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.05)',
  },
  statBox: { width: '48%' },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 'bold' },
  chevronBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

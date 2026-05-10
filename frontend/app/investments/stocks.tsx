import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';

type TabType = 'all' | 'active' | 'sold';

const TYPE_CONFIG: Record<string, { title: string; addLabel: string }> = {
  stocks: { title: 'Shares / Stocks', addLabel: 'Add Share / Stock' },
  mutual_funds: { title: 'Mutual Funds', addLabel: 'Add Mutual Fund' },
  etf: { title: 'ETFs', addLabel: 'Add ETF' },
  fd: { title: 'Fixed Deposits', addLabel: 'Add Fixed Deposit' },
  gold: { title: 'Gold', addLabel: 'Add Gold' },
  ppf: { title: 'PPF', addLabel: 'Add PPF' },
  nps: { title: 'NPS', addLabel: 'Add NPS' },
  epf: { title: 'EPF', addLabel: 'Add EPF' },
};

export default function SharesStocksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type: typeParam } = useLocalSearchParams();
  const investmentType = (typeParam as string) || 'stocks';
  const config = TYPE_CONFIG[investmentType] || TYPE_CONFIG.stocks;

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHoldings = useCallback(async () => {
    try {
      const res = await api.get('/investments', { params: { investment_type: investmentType } });
      setHoldings(res.data || []);
    } catch (e) {
      // silently keep previous list
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [investmentType]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHoldings();
    }, [loadHoldings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHoldings();
  };

  // Aggregate metrics on each holding
  const enrichedHoldings = holdings.map((h) => {
    const invested = h.invested_amount || 0;
    const current = h.current_value || 0;
    const gainLoss = current - invested;
    const gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
    const tsd = h.type_specific_data || {};
    return {
      ...h,
      gainLoss,
      gainLossPercent,
      quantity: tsd.quantity || tsd.units || 0,
      buyPrice: tsd.average_buy_price || tsd.purchase_price_per_gram || tsd.nav || 0,
      currentPrice: tsd.current_price || tsd.current_price_per_gram || tsd.nav || 0,
    };
  });

  const filteredHoldings = enrichedHoldings.filter((h) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return h.status === 'active' || !h.status;
    if (activeTab === 'sold') return h.status === 'closed' || h.status === 'matured';
    return true;
  });

  const activeCount = enrichedHoldings.filter((h) => h.status === 'active' || !h.status).length;
  const soldCount = enrichedHoldings.filter((h) => h.status === 'closed' || h.status === 'matured').length;

  const totalInvested = enrichedHoldings.reduce((acc, h) => acc + (h.invested_amount || 0), 0);
  const totalCurrent = enrichedHoldings.reduce((acc, h) => acc + (h.current_value || 0), 0);
  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const isPortfolioPositive = totalGainLoss >= 0;
  const portfolioColor = isPortfolioPositive ? '#00E676' : '#FF5252';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="stocks-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {enrichedHoldings.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]} testID="stocks-summary-card">
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Invested</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]} testID="stocks-total-invested">
                  {formatINR(totalInvested)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Current Value</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]} testID="stocks-current-value">
                  {formatINR(totalCurrent)}
                </Text>
              </View>
            </View>

            <View style={[styles.gainLossCard, { backgroundColor: portfolioColor + '15' }]}>
              <Ionicons
                name={isPortfolioPositive ? 'trending-up' : 'trending-down'}
                size={20}
                color={portfolioColor}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.gainLossLabel, { color: colors.textSecondary }]}>Total Gain/Loss</Text>
                <Text style={[styles.gainLossValue, { color: portfolioColor }]} testID="stocks-gain-loss">
                  {isPortfolioPositive ? '+' : '-'}
                  {formatINR(Math.abs(totalGainLoss))}
                </Text>
              </View>
              <Text style={[styles.gainLossPercent, { color: portfolioColor }]}>
                {isPortfolioPositive ? '+' : ''}
                {totalGainLossPercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        )}

        <View style={styles.tabs}>
          {(['all', 'active', 'sold'] as TabType[]).map((t) => {
            const labels: Record<TabType, string> = {
              all: `All (${enrichedHoldings.length})`,
              active: `Active (${activeCount})`,
              sold: `Sold (${soldCount})`,
            };
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tab,
                  activeTab === t && [styles.activeTab, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setActiveTab(t)}
                testID={`stocks-tab-${t}`}
              >
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.textSecondary }]}>
                  {labels[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.holdingsList}>
          {filteredHoldings.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No holdings yet
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Tap "{config.addLabel}" below to start tracking.
              </Text>
            </View>
          )}

          {filteredHoldings.map((holding) => {
            const stockColor = holding.gainLoss >= 0 ? '#00E676' : '#FF5252';
            const isPositive = holding.gainLoss >= 0;
            return (
              <TouchableOpacity
                key={holding.investment_id}
                style={[styles.holdingCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => router.push(`/investments/${holding.investment_id}` as any)}
                testID={`holding-${holding.investment_id}`}
              >
                <View style={styles.holdingHeader}>
                  <View style={styles.holdingLeft}>
                    <View style={[styles.companyIcon, { backgroundColor: '#FF910020' }]}>
                      <Ionicons name="business" size={20} color="#FF9100" />
                    </View>
                    <View>
                      <Text style={[styles.companyName, { color: colors.text }]}>{holding.name}</Text>
                      <Text style={[styles.quantity, { color: colors.textSecondary }]}>
                        Qty: {holding.quantity} {investmentType === 'stocks' ? 'shares' : 'units'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={[styles.currentValue, { color: colors.text }]}>
                      {formatINR(holding.current_value || 0)}
                    </Text>
                    <View style={[styles.gainBadge, { backgroundColor: stockColor + '15' }]}>
                      <Ionicons
                        name={isPositive ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={stockColor}
                      />
                      <Text style={[styles.gainBadgeText, { color: stockColor }]}>
                        {isPositive ? '+' : ''}
                        {holding.gainLossPercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.holdingStats}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invested</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatINR(holding.invested_amount || 0)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Buy Price</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ₹{(holding.buyPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current Price</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ₹{(holding.currentPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Profit/Loss</Text>
                    <Text style={[styles.statValue, { color: stockColor }]}>
                      {isPositive ? '+' : '-'}
                      {formatINR(Math.abs(holding.gainLoss))}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#6366F1' }]}
          onPress={() => router.push(`/investments/new?type=${investmentType}` as any)}
          activeOpacity={0.8}
          testID="stocks-add-btn"
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>{config.addLabel}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, marginLeft: 12 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  summaryRow: { flexDirection: 'row', marginBottom: 16 },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(128,128,128,0.1)', marginHorizontal: 16 },
  summaryLabel: { fontSize: 12, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  gainLossCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  gainLossLabel: { fontSize: 12, marginBottom: 4 },
  gainLossValue: { fontSize: 18, fontWeight: 'bold' },
  gainLossPercent: { fontSize: 16, fontWeight: '700' },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: '600' },

  holdingsList: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  holdingCard: {
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  companyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  companyName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  quantity: { fontSize: 12 },
  holdingRight: { alignItems: 'flex-end' },
  currentValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  gainBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
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

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

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
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

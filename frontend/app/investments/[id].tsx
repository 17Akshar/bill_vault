import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

type TabType = 'overview' | 'transactions' | 'notes';
type PeriodType = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TYPE_NAME: Record<string, string> = {
  stocks: 'Shares / Stocks',
  mutual_funds: 'Mutual Funds',
  etf: 'Exchange Traded Funds',
  bonds: 'Bonds',
  reit: 'REIT',
  fd: 'Fixed Deposit',
  ppf: 'PPF',
  nps: 'NPS',
  epf: 'EPF',
  gold: 'Gold',
  silver: 'Silver',
  crypto: 'Crypto',
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

// Build a price series from transactions (cumulative weighted average buy price)
const buildSeries = (transactions: any[], current: number, period: PeriodType): number[] => {
  if (!transactions || transactions.length === 0) return [current];

  const buys = transactions
    .filter((t) => t.transaction_type === 'buy')
    .map((t) => ({
      date: new Date(t.transaction_date),
      price: t.price_per_unit || 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (buys.length === 0) return [current, current];

  const now = Date.now();
  const periodMs: Record<PeriodType, number> = {
    '1M': 30 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
    ALL: Number.MAX_SAFE_INTEGER,
  };
  const cutoff = now - periodMs[period];
  const filtered = buys.filter((b) => b.date.getTime() >= cutoff);
  const series = (filtered.length > 0 ? filtered : buys).map((b) => b.price);
  series.push(current);
  return series;
};

const PerformanceChart = ({ data, color }: { data: number[]; color: string }) => {
  const chartWidth = width - 40;
  const chartHeight = 200;
  const padding = 20;

  if (data.length < 2) {
    return (
      <View style={[styles.chartContainer, { height: chartHeight, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#999', fontSize: 13 }}>Not enough data for chart</Text>
      </View>
    );
  }

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((value - minValue) / valueRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M${points.join(' L')}`;

  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = chartHeight - padding - (percent / 100) * (chartHeight - padding * 2);
          return (
            <Path
              key={`grid-${percent}`}
              d={`M${padding},${y} L${chartWidth - padding},${y}`}
              stroke="rgba(128,128,128,0.1)"
              strokeWidth={1}
            />
          );
        })}
        <Path d={pathData} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle
          cx={padding + (chartWidth - padding * 2)}
          cy={chartHeight - padding - ((data[data.length - 1] - minValue) / valueRange) * (chartHeight - padding * 2)}
          r={5}
          fill={color}
        />
      </Svg>
    </View>
  );
};

export default function InvestmentDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('ALL');
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInvestment = useCallback(async () => {
    try {
      const res = await api.get(`/investments/${id}`);
      setInvestment(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load investment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadInvestment();
    }, [loadInvestment])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      'Are you sure you want to delete this investment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/investments/${id}`);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Loading…</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!investment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const metrics = investment.metrics || {};
  const tsd = investment.type_specific_data || {};
  const transactions = investment.transactions || [];

  const isPositive = (metrics.gain_loss || 0) >= 0;
  const gainLossColor = isPositive ? '#00E676' : '#FF5252';
  const currentPrice = tsd.current_price || tsd.current_price_per_gram || tsd.nav || 0;
  const buyPrice = tsd.average_buy_price || tsd.purchase_price_per_gram || 0;
  const quantity = tsd.quantity || tsd.units || 0;

  const series = buildSeries(transactions, investment.current_value || 0, selectedPeriod);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="detail-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {investment.name}
        </Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push(`/investments/add?id=${id}` as any)}
          testID="detail-edit-btn"
        >
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.priceSection}>
          <Text style={[styles.currentPrice, { color: colors.text }]} testID="detail-current-value">
            {formatINR(investment.current_value || 0)}
          </Text>
          <View style={styles.priceChange}>
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={gainLossColor}
            />
            <Text style={[styles.priceChangeText, { color: gainLossColor }]} testID="detail-gain-loss">
              {isPositive ? '+' : '-'}
              {formatINR(Math.abs(metrics.gain_loss || 0))}
            </Text>
            <Text style={[styles.priceChangePercent, { color: gainLossColor }]} testID="detail-gain-loss-pct">
              ({isPositive ? '+' : ''}
              {(metrics.gain_loss_percentage || 0).toFixed(2)}%)
            </Text>
          </View>
          <Text style={[styles.priceSubtype, { color: colors.textSecondary }]}>
            {TYPE_NAME[investment.investment_type] || investment.investment_type}
          </Text>
        </View>

        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'transactions', label: `Transactions (${transactions.length})` },
            { key: 'notes', label: 'Notes' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && [styles.activeTab, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveTab(tab.key as TabType)}
              testID={`detail-tab-${tab.key}`}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Invested</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatINR(investment.invested_amount || 0)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Value</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatINR(investment.current_value || 0)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gain/Loss</Text>
                  <Text style={[styles.detailValue, { color: gainLossColor }]}>
                    {isPositive ? '+' : '-'}
                    {formatINR(Math.abs(metrics.gain_loss || 0))}
                  </Text>
                  <Text style={[styles.detailPercent, { color: gainLossColor }]}>
                    {isPositive ? '+' : ''}
                    {(metrics.gain_loss_percentage || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{quantity || '—'}</Text>
                </View>
                {buyPrice > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Buy Price</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      ₹{buyPrice.toFixed(2)}
                    </Text>
                  </View>
                )}
                {currentPrice > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Price</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      ₹{currentPrice.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Invested On</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(investment.purchase_date)}
                  </Text>
                </View>
                {(metrics.total_dividends || 0) > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dividends</Text>
                    <Text style={[styles.detailValue, { color: '#448AFF' }]}>
                      +{formatINR(metrics.total_dividends)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.performanceSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
              <View style={styles.periodSelector}>
                {(['1M', '3M', '6M', '1Y', 'ALL'] as PeriodType[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodBtn,
                      selectedPeriod === period && [styles.periodBtnActive, { backgroundColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                    testID={`period-${period}`}
                  >
                    <Text style={[styles.periodText, { color: selectedPeriod === period ? '#FFF' : colors.text }]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PerformanceChart data={series} color={gainLossColor} />
            </View>
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
            {transactions.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 40 }}>
                No transactions recorded yet.
              </Text>
            )}
            {transactions.map((txn: any) => (
              <View
                key={txn.transaction_id}
                style={[styles.transactionCard, { backgroundColor: colors.card }]}
                testID={`txn-${txn.transaction_id}`}
              >
                <View style={styles.txnHeader}>
                  <View style={[styles.txnTypeBadge, { backgroundColor: '#00E67620' }]}>
                    <Text style={{ color: '#00E676', fontSize: 12, fontWeight: '700' }}>
                      {(txn.transaction_type || '').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
                    {formatDate(txn.transaction_date)}
                  </Text>
                </View>
                <View style={styles.txnDetails}>
                  {txn.quantity > 0 && (
                    <View style={styles.txnDetailRow}>
                      <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>Quantity</Text>
                      <Text style={[styles.txnValue, { color: colors.text }]}>{txn.quantity}</Text>
                    </View>
                  )}
                  {txn.price_per_unit > 0 && (
                    <View style={styles.txnDetailRow}>
                      <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>Price</Text>
                      <Text style={[styles.txnValue, { color: colors.text }]}>
                        ₹{Number(txn.price_per_unit).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                    <Text style={[styles.txnValue, { color: colors.text }]}>
                      {formatINR(txn.amount || txn.total_amount || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.notesText, { color: investment.notes ? colors.text : colors.textSecondary }]}>
                {investment.notes || 'No notes added yet. Tap edit to add notes about this investment.'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF5252' }]}
            activeOpacity={0.8}
            onPress={handleDelete}
            testID="detail-delete-btn"
          >
            <Ionicons name="trash-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/investments/add?id=${id}` as any)}
            testID="detail-update-btn"
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
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
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, marginHorizontal: 12 },
  iconBtn: { padding: 4 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  priceSection: { alignItems: 'center', paddingVertical: 20 },
  currentPrice: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  priceChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceChangeText: { fontSize: 16, fontWeight: '700' },
  priceChangePercent: { fontSize: 14, fontWeight: '600' },
  priceSubtype: { fontSize: 13, marginTop: 6 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontWeight: '600' },

  tabContent: { paddingHorizontal: 20 },

  detailsCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  detailItem: { width: '47%' },
  detailLabel: { fontSize: 12, marginBottom: 6 },
  detailValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  detailPercent: { fontSize: 13, fontWeight: '600' },

  performanceSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  periodBtnActive: { borderColor: 'transparent' },
  periodText: { fontSize: 12, fontWeight: '600' },
  chartContainer: { marginBottom: 20 },

  transactionCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  txnTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  txnDate: { fontSize: 12 },
  txnDetails: { gap: 8 },
  txnDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  txnLabel: { fontSize: 13 },
  txnValue: { fontSize: 13, fontWeight: '600' },

  notesCard: { borderRadius: 14, padding: 20, minHeight: 100 },
  notesText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 40, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

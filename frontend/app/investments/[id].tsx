import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Dummy investment data
const DUMMY_INVESTMENT = {
  id: '1',
  name: 'Reliance Industries',
  type: 'Shares / Stocks',
  currentPrice: 2987.45,
  priceChange: 24.45,
  priceChangePercent: 0.86,
  totalInvested: 356000,
  currentValue: 475000,
  gainLoss: 119000,
  gainLossPercent: 33.43,
  quantity: 112,
  buyPrice: 2987.45,
  investedOn: '10 Jan 2023',
  lastUpdated: '24 May 2024',
};

// Dummy transactions
const DUMMY_TRANSACTIONS = [
  {
    id: '1',
    type: 'buy',
    date: '10 Jan 2023',
    quantity: 50,
    price: 2120.00,
    amount: 106000,
  },
  {
    id: '2',
    type: 'buy',
    date: '15 Mar 2023',
    quantity: 30,
    price: 2700.00,
    amount: 81000,
  },
  {
    id: '3',
    type: 'buy',
    date: '10 Aug 2023',
    quantity: 32,
    price: 2850.00,
    amount: 91200,
  },
];

// Dummy chart data points
const CHART_DATA = {
  '1D': [2950, 2960, 2955, 2970, 2965, 2980, 2975, 2987],
  '5D': [2900, 2920, 2910, 2940, 2930, 2960, 2950, 2987],
  '1M': [2800, 2850, 2820, 2880, 2860, 2920, 2900, 2987],
  '3M': [2600, 2700, 2650, 2750, 2800, 2850, 2900, 2987],
  '6M': [2400, 2500, 2600, 2550, 2700, 2800, 2900, 2987],
  '1Y': [2200, 2400, 2300, 2600, 2500, 2800, 2700, 2987],
  'ALL': [1900, 2100, 2000, 2400, 2200, 2600, 2800, 2987],
};

type TabType = 'overview' | 'transactions' | 'notes';
type PeriodType = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

// Performance Chart Component
const PerformanceChart = ({ data, period }: { data: number[]; period: string }) => {
  const chartWidth = width - 40;
  const chartHeight = 200;
  const padding = 20;

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const valueRange = maxValue - minValue;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
    const y =
      chartHeight - padding - ((value - minValue) / valueRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M${points.join(' L')}`;

  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = chartHeight - padding - (percent / 100) * (chartHeight - padding * 2);
          return (
            <Path
              key={percent}
              d={`M${padding},${y} L${chartWidth - padding},${y}`}
              stroke="rgba(128,128,128,0.1)"
              strokeWidth={1}
            />
          );
        })}

        {/* Chart line */}
        <Path d={pathData} stroke="#00E676" strokeWidth={2.5} fill="none" strokeLinecap="round" />

        {/* Last point indicator */}
        <Circle
          cx={padding + ((data.length - 1) / (data.length - 1)) * (chartWidth - padding * 2)}
          cy={
            chartHeight - padding - ((data[data.length - 1] - minValue) / valueRange) * (chartHeight - padding * 2)
          }
          r={5}
          fill="#00E676"
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

  const isPositive = DUMMY_INVESTMENT.priceChange >= 0;
  const priceChangeColor = isPositive ? '#00E676' : '#FF5252';
  const gainLossColor = DUMMY_INVESTMENT.gainLoss >= 0 ? '#00E676' : '#FF5252';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{DUMMY_INVESTMENT.name}</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Price Section */}
        <View style={styles.priceSection}>
          <Text style={[styles.currentPrice, { color: colors.text }]}>
            ₹{DUMMY_INVESTMENT.currentPrice.toFixed(2)}
          </Text>
          <View style={styles.priceChange}>
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={priceChangeColor}
            />
            <Text style={[styles.priceChangeText, { color: priceChangeColor }]}>
              {isPositive ? '+' : ''}₹{Math.abs(DUMMY_INVESTMENT.priceChange).toFixed(2)}
            </Text>
            <Text style={[styles.priceChangePercent, { color: priceChangeColor }]}>
              ({isPositive ? '+' : ''}
              {DUMMY_INVESTMENT.priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'notes', label: 'Notes' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && [styles.activeTab, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveTab(tab.key as TabType)}
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Investment Details Grid */}
            <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Total Invested
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatINR(DUMMY_INVESTMENT.totalInvested)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Current Value
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatINR(DUMMY_INVESTMENT.currentValue)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Gain/Loss
                  </Text>
                  <Text style={[styles.detailValue, { color: gainLossColor }]}>
                    +{formatINR(DUMMY_INVESTMENT.gainLoss)}
                  </Text>
                  <Text style={[styles.detailPercent, { color: gainLossColor }]}>
                    +{DUMMY_INVESTMENT.gainLossPercent.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shares</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {DUMMY_INVESTMENT.quantity}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Buy Price
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    ₹{DUMMY_INVESTMENT.buyPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Current Price
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    ₹{DUMMY_INVESTMENT.currentPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Invested On
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {DUMMY_INVESTMENT.investedOn}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Last Updated
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {DUMMY_INVESTMENT.lastUpdated}
                  </Text>
                </View>
              </View>
            </View>

            {/* Performance Section */}
            <View style={styles.performanceSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>

              {/* Period Selector */}
              <View style={styles.periodSelector}>
                {(['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'] as PeriodType[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodBtn,
                      selectedPeriod === period && [
                        styles.periodBtnActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        {
                          color:
                            selectedPeriod === period ? '#FFF' : colors.text,
                        },
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart */}
              <PerformanceChart data={CHART_DATA[selectedPeriod]} period={selectedPeriod} />
            </View>
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Buy Transactions</Text>
            {DUMMY_TRANSACTIONS.map((txn) => (
              <View key={txn.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
                <View style={styles.txnHeader}>
                  <View style={[styles.txnTypeBadge, { backgroundColor: '#00E67620' }]}>
                    <Text style={{ color: '#00E676', fontSize: 12, fontWeight: '700' }}>
                      {txn.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.txnDate, { color: colors.textSecondary }]}>{txn.date}</Text>
                </View>
                <View style={styles.txnDetails}>
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>
                      Quantity
                    </Text>
                    <Text style={[styles.txnValue, { color: colors.text }]}>
                      {txn.quantity} shares
                    </Text>
                  </View>
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>
                      Price
                    </Text>
                    <Text style={[styles.txnValue, { color: colors.text }]}>
                      ₹{txn.price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.txnDetailRow}>
                    <Text style={[styles.txnLabel, { color: colors.textSecondary }]}>
                      Total Amount
                    </Text>
                    <Text style={[styles.txnValue, { color: colors.text }]}>
                      {formatINR(txn.amount)}
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
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                No notes added yet. Tap edit to add notes about this investment.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#00E676' }]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Buy More</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF5252' }]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Sell</Text>
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

  // Price Section
  priceSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currentPrice: { fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceChangeText: { fontSize: 16, fontWeight: '700' },
  priceChangePercent: { fontSize: 14, fontWeight: '600' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
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

  // Tab Content
  tabContent: {
    paddingHorizontal: 20,
  },

  // Details Card
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: { fontSize: 12, marginBottom: 6 },
  detailValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  detailPercent: { fontSize: 13, fontWeight: '600' },

  // Performance Section
  performanceSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  periodBtnActive: {
    borderColor: 'transparent',
  },
  periodText: { fontSize: 12, fontWeight: '600' },

  // Chart
  chartContainer: {
    marginBottom: 20,
  },

  // Transactions
  transactionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  txnTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  txnDate: { fontSize: 12 },
  txnDetails: { gap: 8 },
  txnDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txnLabel: { fontSize: 13 },
  txnValue: { fontSize: 13, fontWeight: '600' },

  // Notes
  notesCard: {
    borderRadius: 14,
    padding: 20,
    minHeight: 100,
  },
  notesText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

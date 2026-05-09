import React from 'react';
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
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Dummy data for portfolio
const DUMMY_PORTFOLIO = {
  totalValue: 2875000,
  totalInvested: 2500000,
  totalGainLoss: 375000,
  gainLossPercentage: 15.0,
};

// Dummy data for investment categories
const DUMMY_CATEGORIES = [
  {
    id: '1',
    name: 'Shares / Stocks',
    icon: 'trending-up',
    color: '#00E676',
    invested: 1245000,
    current: 1620000,
    gainLoss: 375000,
    gainLossPercent: 30.12,
    percentage: 43.3,
  },
  {
    id: '2',
    name: 'Mutual Funds',
    icon: 'pie-chart',
    color: '#448AFF',
    invested: 475000,
    current: 620000,
    gainLoss: 145000,
    gainLossPercent: 30.53,
    percentage: 30.4,
  },
  {
    id: '3',
    name: 'Exchange Traded Funds',
    icon: 'stats-chart',
    color: '#7C4DFF',
    invested: 225000,
    current: 245000,
    gainLoss: 20000,
    gainLossPercent: 8.89,
    percentage: 7.8,
  },
  {
    id: '4',
    name: 'Fixed Deposit',
    icon: 'lock-closed',
    color: '#FF6B81',
    invested: 250000,
    current: 271875,
    gainLoss: 21875,
    gainLossPercent: 8.75,
    percentage: 8.7,
  },
  {
    id: '5',
    name: 'Gold',
    icon: 'diamond',
    color: '#FF9100',
    invested: 182000,
    current: 195000,
    gainLoss: 13000,
    gainLossPercent: 7.14,
    percentage: 6.3,
  },
  {
    id: '6',
    name: 'PPF',
    icon: 'shield-checkmark',
    color: '#00BCD4',
    invested: 56000,
    current: 60000,
    gainLoss: 4000,
    gainLossPercent: 7.14,
    percentage: 1.9,
  },
  {
    id: '7',
    name: 'NPS',
    icon: 'ribbon',
    color: '#4CAF50',
    invested: 42000,
    current: 45000,
    gainLoss: 3000,
    gainLossPercent: 7.14,
    percentage: 1.4,
  },
  {
    id: '8',
    name: 'EPF',
    icon: 'wallet',
    color: '#9C27B0',
    invested: 25000,
    current: 18125,
    gainLoss: -6875,
    gainLossPercent: -27.5,
    percentage: 0.6,
  },
];

// Simple donut chart component
const DonutChart = ({ data }: { data: any[] }) => {
  const size = 140;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;
  
  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        {data.map((item, index) => {
          const percentage = item.percentage / 100;
          const strokeDashoffset = circumference * (1 - percentage);
          const rotation = currentAngle;
          currentAngle += percentage * 360;

          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              rotation={rotation}
              origin={`${center}, ${center}`}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={styles.chartCenter}>
        <Text style={styles.chartCenterText}>Portfolio</Text>
      </View>
    </View>
  );
};

// Mini trend graph component
const MiniTrendGraph = ({ positive }: { positive: boolean }) => {
  const points = positive
    ? '0,20 10,15 20,18 30,12 40,8 50,10 60,5'
    : '0,5 10,8 20,6 30,12 40,15 50,13 60,20';

  return (
    <Svg width={60} height={25} viewBox="0 0 60 25">
      <Path
        d={`M${points}`}
        stroke={positive ? '#00E676' : '#FF5252'}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default function InvestmentsDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const gainLossColor = DUMMY_PORTFOLIO.totalGainLoss >= 0 ? '#00E676' : '#FF5252';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Investments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Portfolio Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Total Investment Value
              </Text>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>
                {formatINR(DUMMY_PORTFOLIO.totalValue)}
              </Text>
            </View>
            <DonutChart data={DUMMY_CATEGORIES} />
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Invested
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatINR(DUMMY_PORTFOLIO.totalInvested)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Gain/Loss
              </Text>
              <Text style={[styles.statValue, { color: gainLossColor }]}>
                +{formatINR(DUMMY_PORTFOLIO.totalGainLoss)}
              </Text>
              <Text style={[styles.statPercent, { color: gainLossColor }]}>
                +{DUMMY_PORTFOLIO.gainLossPercentage.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Investment Categories Section */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Investment Categories
          </Text>

          {DUMMY_CATEGORIES.map((category, index) => {
            const isPositive = category.gainLoss >= 0;
            const gainLossColor = isPositive ? '#00E676' : '#FF5252';

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.card },
                  index === DUMMY_CATEGORIES.length - 1 && { marginBottom: 0 },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to category details
                }}
              >
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}
                    >
                      <Ionicons name={category.icon as any} size={20} color={category.color} />
                    </View>
                    <View>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {category.name}
                      </Text>
                      <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                        {category.percentage}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <MiniTrendGraph positive={isPositive} />
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>
                </View>

                <View style={styles.categoryStats}>
                  <View style={styles.categoryStatItem}>
                    <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                      Invested
                    </Text>
                    <Text style={[styles.categoryStatValue, { color: colors.text }]}>
                      {formatINR(category.invested)}
                    </Text>
                  </View>
                  <View style={styles.categoryStatItem}>
                    <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                      Current
                    </Text>
                    <Text style={[styles.categoryStatValue, { color: colors.text }]}>
                      {formatINR(category.current)}
                    </Text>
                  </View>
                  <View style={styles.categoryStatItem}>
                    <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                      Gain/Loss
                    </Text>
                    <Text style={[styles.categoryStatValue, { color: gainLossColor }]}>
                      {isPositive ? '+' : ''}
                      {formatINR(Math.abs(category.gainLoss))}
                    </Text>
                    <Text style={[styles.categoryStatPercent, { color: gainLossColor }]}>
                      {isPositive ? '+' : ''}
                      {category.gainLossPercent.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add Investment Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#6366F1' }]}
          onPress={() => router.push('/investments/select-type' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Add Investment</Text>
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
  title: { fontSize: 24, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Portfolio Summary Card
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 13, marginBottom: 8 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold' },
  chartContainer: {
    position: 'relative',
    width: 140,
    height: 140,
  },
  chartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterText: { fontSize: 12, color: '#999', fontWeight: '600' },
  summaryStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    paddingTop: 16,
  },
  statItem: { flex: 1 },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginHorizontal: 16,
  },
  statLabel: { fontSize: 12, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statPercent: { fontSize: 14, fontWeight: '700' },

  // Categories Section
  categoriesSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  categoryPercent: { fontSize: 12, fontWeight: '600' },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.05)',
  },
  categoryStatItem: { flex: 1 },
  categoryStatLabel: { fontSize: 11, marginBottom: 4 },
  categoryStatValue: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  categoryStatPercent: { fontSize: 12, fontWeight: '600' },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

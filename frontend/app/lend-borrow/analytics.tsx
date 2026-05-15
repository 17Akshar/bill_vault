import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DUMMY_LEND_BORROW, MONTHLY_TREND_DATA } from './_data';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [periodFilter, setPeriodFilter] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const totalLent = DUMMY_LEND_BORROW
    .filter(e => e.type === 'lent')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBorrowed = DUMMY_LEND_BORROW
    .filter(e => e.type === 'borrowed')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOutstanding = DUMMY_LEND_BORROW.reduce((sum, e) => sum + e.remainingAmount, 0);

  const totalSettled = DUMMY_LEND_BORROW
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + e.amount, 0);

  const avgLentAmount = totalLent / (DUMMY_LEND_BORROW.filter(e => e.type === 'lent').length || 1);
  const avgBorrowedAmount = totalBorrowed / (DUMMY_LEND_BORROW.filter(e => e.type === 'borrowed').length || 1);

  const lentEntries = DUMMY_LEND_BORROW.filter(e => e.type === 'lent').sort((a, b) => b.amount - a.amount);
  const borrowedEntries = DUMMY_LEND_BORROW.filter(e => e.type === 'borrowed').sort((a, b) => b.amount - a.amount);

  const getBarHeight = (value: number, max: number) => {
    return (value / max) * 100;
  };

  const maxAmount = Math.max(...MONTHLY_TREND_DATA.map(d => Math.max(d.lent, d.borrowed)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Period Filter */}
        <View style={styles.filterTabs}>
          {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.tab, periodFilter === period && { backgroundColor: colors.primary }]}
              onPress={() => setPeriodFilter(period)}
            >
              <Text style={[styles.tabText, { color: periodFilter === period ? '#FFF' : colors.textSecondary }]}>
                {period === 'monthly' ? 'Monthly' : period === 'quarterly' ? 'Quarterly' : 'Yearly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="arrow-redo-outline" size={20} color="#22C55E" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Lent</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalLent / 1000).toFixed(0)}K</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-undo-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Borrowed</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalBorrowed / 1000).toFixed(0)}K</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalOutstanding / 1000).toFixed(0)}K</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Settled</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>₹{(totalSettled / 1000).toFixed(0)}K</Text>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Lent vs Borrowed Trend</Text>
          <View style={styles.chartContainer}>
            {MONTHLY_TREND_DATA.map((data, idx) => (
              <View key={idx} style={styles.barGroup}>
                <View style={styles.barsContainer}>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: getBarHeight(data.lent, maxAmount) }]}
                    />
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>₹{(data.lent / 1000).toFixed(0)}K</Text>
                  </View>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: getBarHeight(data.borrowed, maxAmount) }]}
                    />
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>₹{(data.borrowed / 1000).toFixed(0)}K</Text>
                  </View>
                </View>
                <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{data.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Lent */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Top Lent To</Text>
          {lentEntries.slice(0, 3).map((entry, idx) => (
            <View key={idx} style={[styles.rankItem, { borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: colors.border }]}>
              <View style={styles.rankInfo}>
                <View style={[styles.rankBadge, { backgroundColor: '#22C55E20' }]}>
                  <Text style={[styles.rankNumber, { color: '#22C55E' }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, { color: colors.text }]}>{entry.personName}</Text>
                  <Text style={[styles.rankStatus, { color: colors.textSecondary }]}>
                    {entry.status === 'completed' ? 'Settled' : entry.status === 'partial' ? 'Partial' : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rankAmount, { color: '#22C55E' }]}>₹{entry.amount.toLocaleString()}</Text>
                <Text style={[styles.rankOutstanding, { color: colors.textSecondary }]}>
                  Outstanding: ₹{entry.remainingAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Borrowed */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Top Borrowed From</Text>
          {borrowedEntries.slice(0, 3).map((entry, idx) => (
            <View key={idx} style={[styles.rankItem, { borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: colors.border }]}>
              <View style={styles.rankInfo}>
                <View style={[styles.rankBadge, { backgroundColor: '#EF444420' }]}>
                  <Text style={[styles.rankNumber, { color: '#EF4444' }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, { color: colors.text }]}>{entry.personName}</Text>
                  <Text style={[styles.rankStatus, { color: colors.textSecondary }]}>
                    {entry.status === 'completed' ? 'Settled' : entry.status === 'partial' ? 'Partial' : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rankAmount, { color: '#EF4444' }]}>₹{entry.amount.toLocaleString()}</Text>
                <Text style={[styles.rankOutstanding, { color: colors.textSecondary }]}>
                  Outstanding: ₹{entry.remainingAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Lent</Text>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>₹{(avgLentAmount / 1000).toFixed(0)}K</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Borrowed</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>₹{(avgBorrowedAmount / 1000).toFixed(0)}K</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Entries</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{DUMMY_LEND_BORROW.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Settlement Rate</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {((DUMMY_LEND_BORROW.filter(e => e.status === 'completed').length / DUMMY_LEND_BORROW.length) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  filterTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.1)' },
  tabText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 8 },
  barGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barsContainer: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 100 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, marginBottom: 8 },
  barLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2, width: '100%', textAlign: 'center' },
  monthLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  rankItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomColor: 'rgba(128,128,128,0.1)' },
  rankInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankNumber: { fontSize: 14, fontWeight: '700' },
  rankName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  rankStatus: { fontSize: 11 },
  rankAmount: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rankOutstanding: { fontSize: 10 },

  statRow: { flexDirection: 'row', gap: 16 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
});

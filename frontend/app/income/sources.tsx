import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DEMO_SOURCE_BREAKDOWN, DEMO_INCOMES, DEMO_ACCOUNTS } from './dummyData';

const { width: SW } = Dimensions.get('window');
const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

type SortKey = 'amount' | 'percentage' | 'growth';

// Extended sources including rental
const ALL_SOURCES = [
  ...DEMO_SOURCE_BREAKDOWN,
  { key: 'rental',    label: 'Rental Income', icon: 'home-outline',         color: '#FF9100', amount: 18000, percentage: 14, growth: 5,  frequency: 'Monthly' },
  { key: 'dividend',  label: 'Dividends',     icon: 'bar-chart-outline',    color: '#26C6DA', amount: 4500,  percentage: 4,  growth: 10, frequency: 'Quarterly' },
];

export default function IncomeSources() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('amount');

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const totalIncome = ALL_SOURCES.reduce((s, src) => s + src.amount, 0);
  const sorted = [...ALL_SOURCES].sort((a, b) => b[sortBy] - a[sortBy]);

  const recentFor = (key: string) =>
    DEMO_INCOMES.filter(e => e.category === key).slice(0, 2);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Income Sources</Text>
        <TouchableOpacity onPress={() => router.push('/income/add' as any)}>
          <Ionicons name="add-circle-outline" size={24} color={GREEN} />
        </TouchableOpacity>
      </View>

      {/* Summary Banner */}
      <View style={[styles.summaryBanner, { backgroundColor: CARD }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: GREEN }]}>{formatINR(totalIncome)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{ALL_SOURCES.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sources</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{DEMO_INCOMES.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
        </View>
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
        {(['amount', 'percentage', 'growth'] as SortKey[]).map(k => (
          <TouchableOpacity
            key={k}
            style={[styles.sortChip, sortBy === k && { backgroundColor: GREEN }]}
            onPress={() => setSortBy(k)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === k ? '#000' : colors.textSecondary }]}>
              {k === 'amount' ? 'Amount' : k === 'percentage' ? '%' : 'Growth'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {sorted.map((src, idx) => {
          const recent = recentFor(src.key);
          return (
            <View key={src.key} style={[styles.srcCard, { backgroundColor: CARD }]}>
              {/* Header */}
              <View style={styles.srcHeader}>
                <View style={[styles.rankBadge, { backgroundColor: `${src.color}22` }]}>
                  <Text style={[styles.rank, { color: src.color }]}>#{idx + 1}</Text>
                </View>
                <View style={[styles.srcIcon, { backgroundColor: `${src.color}22` }]}>
                  <Ionicons name={src.icon as any} size={22} color={src.color} />
                </View>
                <View style={styles.srcMeta}>
                  <Text style={[styles.srcName, { color: colors.text }]}>{src.label}</Text>
                  <Text style={[styles.srcFreq, { color: colors.textSecondary }]}>{src.frequency}</Text>
                </View>
                <View style={styles.srcRight}>
                  <Text style={[styles.srcAmt, { color: GREEN }]}>{formatINR(src.amount)}</Text>
                  <View style={styles.growthRow}>
                    <Ionicons name="arrow-up" size={11} color={GREEN} />
                    <Text style={[styles.srcGrowth, { color: GREEN }]}>{src.growth}%</Text>
                  </View>
                  <Text style={[styles.srcPct, { color: src.color }]}>{src.percentage}%</Text>
                </View>
              </View>

              {/* Progress */}
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${src.percentage}%`, backgroundColor: src.color }]} />
              </View>

              {/* Recent */}
              {recent.length > 0 && (
                <View style={styles.recentList}>
                  {recent.map(inc => {
                    const acc = DEMO_ACCOUNTS.find(a => a.account_id === inc.account_id);
                    return (
                      <TouchableOpacity
                        key={inc.income_id}
                        style={[styles.recentRow, { borderTopColor: colors.border }]}
                        onPress={() => router.push({ pathname: '/income/[id]' as any, params: { id: inc.income_id } })}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={[styles.recentSource, { color: colors.text }]}>{inc.source}</Text>
                          {acc && <Text style={[styles.recentAcc, { color: colors.textSecondary }]}>{acc.name}</Text>}
                        </View>
                        <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{inc.date}</Text>
                        <Text style={[styles.recentAmt, { color: GREEN }]}>+{formatINR(inc.amount)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  summaryBanner:  { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  summaryLabel:   { fontSize: 11, fontWeight: '500' },
  summaryDivider: { width: 1, marginVertical: 4 },
  sortRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  sortLabel:      { fontSize: 13, fontWeight: '500' },
  sortChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,230,118,0.12)' },
  sortChipText:   { fontSize: 12, fontWeight: '600' },
  scroll:         { paddingHorizontal: 20 },
  srcCard:        { borderRadius: 16, padding: 16, marginBottom: 12 },
  srcHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rankBadge:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rank:           { fontSize: 11, fontWeight: '800' },
  srcIcon:        { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  srcMeta:        { flex: 1 },
  srcName:        { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  srcFreq:        { fontSize: 12 },
  srcRight:       { alignItems: 'flex-end' },
  srcAmt:         { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  growthRow:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginVertical: 2 },
  srcGrowth:      { fontSize: 11, fontWeight: '700' },
  srcPct:         { fontSize: 12, fontWeight: '700' },
  progressBar:    { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill:   { height: 6, borderRadius: 3 },
  recentList:     {},
  recentRow:      { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  recentSource:   { fontSize: 13, fontWeight: '600' },
  recentAcc:      { fontSize: 11, marginTop: 1 },
  recentDate:     { flex: 1, fontSize: 11, textAlign: 'right', marginRight: 8 },
  recentAmt:      { fontSize: 13, fontWeight: '700' },
});

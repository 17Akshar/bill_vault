import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DEMO_CATEGORY_BREAKDOWN, DEMO_EXPENSES } from './_data';

const { width: SW } = Dimensions.get('window');
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

type SortKey = 'amount' | 'percentage' | 'count';

export default function ExpenseCategories() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('amount');

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const totalExpense = DEMO_CATEGORY_BREAKDOWN.reduce((s, c) => s + c.amount, 0);
  const sorted = [...DEMO_CATEGORY_BREAKDOWN].sort((a, b) => b[sortBy] - a[sortBy]);

  const recentByCat = (key: string) =>
    DEMO_EXPENSES.filter(e => e.category === key).slice(0, 2);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expense by Category</Text>
        <TouchableOpacity onPress={() => router.push('/expense/add' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="add-circle-outline" size={24} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryBanner, { backgroundColor: CARD }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: RED }]}>{formatINR(totalExpense)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{DEMO_CATEGORY_BREAKDOWN.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Categories</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{DEMO_EXPENSES.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
        </View>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
        {(['amount', 'percentage', 'count'] as SortKey[]).map(k => (
          <TouchableOpacity
            key={k}
            style={[styles.sortChip, sortBy === k && { backgroundColor: PURPLE }]}
            onPress={() => setSortBy(k)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === k ? '#FFF' : colors.textSecondary }]}>
              {k === 'amount' ? 'Amount' : k === 'percentage' ? '%' : 'Count'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {sorted.map((cat, idx) => {
          const recent = recentByCat(cat.key);
          return (
            <View key={cat.key} style={[styles.catCard, { backgroundColor: CARD }]}>
              {/* Category header */}
              <View style={styles.catHeader}>
                <View style={[styles.catRankBadge, { backgroundColor: `${cat.color}22` }]}>
                  <Text style={[styles.catRank, { color: cat.color }]}>#{idx + 1}</Text>
                </View>
                <View style={[styles.catIcon, { backgroundColor: `${cat.color}22` }]}>
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <View style={styles.catMeta}>
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.label}</Text>
                  <Text style={[styles.catCount, { color: colors.textSecondary }]}>{cat.count} transaction{cat.count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={[styles.catAmount, { color: RED }]}>{formatINR(cat.amount)}</Text>
                  <Text style={[styles.catPct, { color: cat.color }]}>{cat.percentage}%</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
              </View>

              {/* Recent transactions under this category */}
              {recent.length > 0 && (
                <View style={styles.recentList}>
                  {recent.map(exp => (
                    <TouchableOpacity
                      key={exp.id}
                      style={[styles.recentRow, { borderTopColor: colors.border }]}
                      onPress={() => router.push({ pathname: '/expense/[id]' as any, params: { id: exp.id } })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.recentTitle, { color: colors.text }]}>{exp.title}</Text>
                      <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{exp.date}</Text>
                      <Text style={[styles.recentAmt, { color: RED }]}>-{formatINR(exp.amount)}</Text>
                    </TouchableOpacity>
                  ))}
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
  sortChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(124,92,231,0.12)' },
  sortChipText:   { fontSize: 12, fontWeight: '600' },
  scroll:         { paddingHorizontal: 20 },
  catCard:        { borderRadius: 16, padding: 16, marginBottom: 12 },
  catHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catRankBadge:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catRank:        { fontSize: 11, fontWeight: '800' },
  catIcon:        { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catMeta:        { flex: 1 },
  catName:        { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  catCount:       { fontSize: 12 },
  catRight:       { alignItems: 'flex-end' },
  catAmount:      { fontSize: 16, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  catPct:         { fontSize: 12, fontWeight: '700' },
  progressBar:    { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill:   { height: 6, borderRadius: 3 },
  recentList:     {},
  recentRow:      { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  recentTitle:    { flex: 1, fontSize: 13, fontWeight: '500' },
  recentDate:     { fontSize: 11 },
  recentAmt:      { fontSize: 13, fontWeight: '700' },
});

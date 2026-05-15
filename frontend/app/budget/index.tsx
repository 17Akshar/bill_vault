import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import {
  DUMMY_BUDGET_CATEGORIES, DUMMY_TOTAL_BUDGET, DUMMY_INCOME,
  DUMMY_SAVINGS_GOALS, SMART_SUGGESTIONS,
} from './_data';

const { width: SW } = Dimensions.get('window');

const PERIODS = ['This Month', 'Last Month', 'This Year', 'Last Year'];

const ACTION_MENU = [
  { icon: 'pie-chart-outline',    label: 'Add Category Budget', color: '#7C4DFF', route: '/budget/add-category' },
  { icon: 'add-circle-outline',   label: 'Add Custom Category', color: '#448AFF', route: '/budget/add-custom-category' },
  { icon: 'wallet-outline',       label: 'Set Total Budget',    color: '#00C48C', route: '/budget/set-total' },
  { icon: 'flag-outline',         label: 'Set Savings Goal',    color: '#FF9100', route: '/budget/set-savings' },
  { icon: 'download-outline',     label: 'Import Previous Month', color: '#FF5252', route: '/budget/import-month' },
];

export default function BudgetDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [period, setPeriod] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const cats = DUMMY_BUDGET_CATEGORIES;
  const totalBudget = DUMMY_TOTAL_BUDGET.amount;
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const usagePct = Math.round((totalSpent / totalBudget) * 100);
  const income = DUMMY_INCOME;
  const savings = income - totalSpent;
  const savingsRate = Math.round((savings / income) * 100);

  const usageColor = usagePct > 100 ? '#FF5252' : usagePct > 80 ? '#FFB300' : '#00C48C';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Budget</Text>
        <TouchableOpacity onPress={() => router.push('/budget/insights' as any)} style={styles.iconBtn}>
          <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Period Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll} contentContainerStyle={styles.periodContent}>
          {PERIODS.map((p, i) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(i)}
              style={[styles.periodChip, { borderColor: colors.border }, i === period && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.periodText, { color: i === period ? '#FFF' : colors.textSecondary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Budget Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={[styles.overviewSub, { color: colors.textSecondary }]}>Total Budget</Text>
              <Text style={[styles.overviewTotal, { color: colors.text }]}>{formatINR(totalBudget)}</Text>
            </View>
            <View style={[styles.usageBadge, { backgroundColor: usageColor + '22' }]}>
              <Text style={[styles.usageText, { color: usageColor }]}>{usagePct}% Used</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${Math.min(usagePct, 100)}%`, backgroundColor: usageColor }]} />
          </View>

          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <View style={[styles.statDot, { backgroundColor: '#FF5252' }]} />
              <View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Spent</Text>
                <Text style={[styles.statValue, { color: '#FF5252' }]}>{formatINR(totalSpent)}</Text>
              </View>
            </View>
            <View style={styles.overviewStat}>
              <View style={[styles.statDot, { backgroundColor: '#00C48C' }]} />
              <View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.statValue, { color: totalRemaining >= 0 ? '#00C48C' : '#FF5252' }]}>
                  {formatINR(Math.abs(totalRemaining))}{totalRemaining < 0 ? ' over' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.overviewStat}>
              <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
              <View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining%</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {Math.max(0, 100 - usagePct)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Budget vs Expense Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget vs Expense</Text>

          <View style={styles.bveRow}>
            <View style={styles.bveCol}>
              <Text style={[styles.bveLabel, { color: colors.textSecondary }]}>Income</Text>
              <Text style={[styles.bveValue, { color: '#00C48C' }]}>{formatINR(income)}</Text>
              <View style={[styles.bveBar, { backgroundColor: colors.border }]}>
                <View style={[styles.bveFill, { width: '100%', backgroundColor: '#00C48C' }]} />
              </View>
            </View>
            <View style={styles.bveCol}>
              <Text style={[styles.bveLabel, { color: colors.textSecondary }]}>Expenses</Text>
              <Text style={[styles.bveValue, { color: '#FF5252' }]}>{formatINR(totalSpent)}</Text>
              <View style={[styles.bveBar, { backgroundColor: colors.border }]}>
                <View style={[styles.bveFill, { width: `${Math.min((totalSpent / income) * 100, 100)}%`, backgroundColor: '#FF5252' }]} />
              </View>
            </View>
            <View style={styles.bveCol}>
              <Text style={[styles.bveLabel, { color: colors.textSecondary }]}>Savings</Text>
              <Text style={[styles.bveValue, { color: '#448AFF' }]}>{formatINR(savings)}</Text>
              <View style={[styles.bveBar, { backgroundColor: colors.border }]}>
                <View style={[styles.bveFill, { width: `${(savings / income) * 100}%`, backgroundColor: '#448AFF' }]} />
              </View>
            </View>
          </View>

          <View style={[styles.savingsRateBox, { backgroundColor: colors.background }]}>
            <Ionicons name="trending-up" size={16} color="#00C48C" />
            <Text style={[styles.savingsRateText, { color: colors.text }]}>Savings Rate</Text>
            <Text style={[styles.savingsRateValue, { color: '#00C48C' }]}>{savingsRate}%</Text>
          </View>
        </View>

        {/* Category Summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Budgets</Text>
            <TouchableOpacity onPress={() => router.push('/budget/add-category' as any)}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCategory, { color: colors.textSecondary }]}>Category</Text>
            <Text style={[styles.thBudget, { color: colors.textSecondary }]}>Budget</Text>
            <Text style={[styles.thSpent, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.thLeft, { color: colors.textSecondary }]}>Left</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {cats.map((cat) => {
            const pct = Math.round((cat.spent / cat.budget) * 100);
            const barColor = pct > 100 ? '#FF5252' : pct > 80 ? '#FFB300' : '#00C48C';
            const left = cat.budget - cat.spent;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => router.push({ pathname: '/budget/category-detail', params: { key: cat.key } } as any)}
                activeOpacity={0.7}
              >
                <View style={styles.tableRow}>
                  <View style={styles.thCategoryCell}>
                    <View style={[styles.catIconSmall, { backgroundColor: cat.color + '22' }]}>
                      <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                    </View>
                    <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat.label}</Text>
                  </View>
                  <Text style={[styles.thBudget, { color: colors.textSecondary }]}>{formatINR(cat.budget, false)}</Text>
                  <Text style={[styles.thSpent, { color: '#FF5252' }]}>{formatINR(cat.spent, false)}</Text>
                  <Text style={[styles.thLeft, { color: left >= 0 ? '#00C48C' : '#FF5252' }]}>
                    {left < 0 ? '-' : ''}{formatINR(Math.abs(left), false)}
                  </Text>
                </View>
                <View style={[styles.miniBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.miniBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.miniBarLabel}>
                  <Text style={[styles.miniPct, { color: barColor }]}>{pct}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.addCatBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/budget/add-category' as any)}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addCatText, { color: colors.primary }]}>Add Category Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Insights Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Insights</Text>
          {SMART_SUGGESTIONS.slice(0, 2).map((s, i) => (
            <View key={i} style={[styles.insightRow, { backgroundColor: s.color + '12' }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
              <Text style={[styles.insightText, { color: colors.text }]}>{s.text}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.viewInsightsBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/budget/insights' as any)}
          >
            <Ionicons name="analytics-outline" size={18} color="#FFF" />
            <Text style={styles.viewInsightsBtnText}>View All Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Savings Goals */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings Goals</Text>
            <TouchableOpacity onPress={() => router.push('/budget/set-savings' as any)}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {DUMMY_SAVINGS_GOALS.map((g) => {
            const pct = Math.round((g.current_amount / g.target_amount) * 100);
            return (
              <View key={g.goal_id} style={[styles.goalCard, { backgroundColor: colors.background }]}>
                <View style={styles.goalTop}>
                  <Ionicons name="flag-outline" size={18} color="#FF9100" />
                  <Text style={[styles.goalName, { color: colors.text }]}>{g.name}</Text>
                  <Text style={[styles.goalPct, { color: pct >= 100 ? '#00C48C' : '#FF9100' }]}>{pct}%</Text>
                </View>
                <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 100 ? '#00C48C' : '#FF9100' }]} />
                </View>
                <View style={styles.goalBottom}>
                  <Text style={[styles.goalCurrent, { color: colors.textSecondary }]}>{formatINR(g.current_amount)} saved</Text>
                  <Text style={[styles.goalTarget, { color: colors.textSecondary }]}>of {formatINR(g.target_amount)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowMenu(true)}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Action Menu Modal */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.actionMenu, { backgroundColor: colors.card }]}>
            <View style={styles.menuHandle} />
            <Text style={[styles.menuTitle, { color: colors.text }]}>Budget Actions</Text>
            {ACTION_MENU.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, { backgroundColor: colors.background }]}
                onPress={() => { setShowMenu(false); router.push(item.route as any); }}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  periodScroll: { marginBottom: 4 },
  periodContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  periodText: { fontSize: 13, fontWeight: '600' },

  overviewCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 12 },
  overviewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  overviewSub: { fontSize: 12, marginBottom: 4 },
  overviewTotal: { fontSize: 28, fontWeight: '900' },
  usageBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  usageText: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 5 },
  overviewStats: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 10, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700' },

  sectionCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionLink: { fontSize: 13, fontWeight: '600' },

  bveRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  bveCol: { flex: 1 },
  bveLabel: { fontSize: 11, marginBottom: 4 },
  bveValue: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  bveBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bveFill: { height: '100%', borderRadius: 3 },
  savingsRateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  savingsRateText: { flex: 1, fontSize: 13, fontWeight: '600' },
  savingsRateValue: { fontSize: 15, fontWeight: '800' },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  thCategory: { flex: 1.8, fontSize: 11, fontWeight: '600' },
  thBudget: { width: 68, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  thSpent: { width: 68, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  thLeft: { width: 68, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  divider: { height: 1, marginVertical: 6 },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  thCategoryCell: { flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIconSmall: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 12, fontWeight: '600', flex: 1 },
  miniBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 2, marginHorizontal: 2 },
  miniBarFill: { height: '100%', borderRadius: 2 },
  miniBarLabel: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  miniPct: { fontSize: 10, fontWeight: '600' },

  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderRadius: 12, height: 40, marginTop: 10,
    borderStyle: 'dashed',
  },
  addCatText: { fontSize: 13, fontWeight: '600' },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 12, marginBottom: 8 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18 },
  viewInsightsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, height: 44, gap: 8, marginTop: 4,
  },
  viewInsightsBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  goalCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalName: { flex: 1, fontSize: 14, fontWeight: '600' },
  goalPct: { fontSize: 13, fontWeight: '700' },
  goalBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: '100%', borderRadius: 3 },
  goalBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  goalCurrent: { fontSize: 11 },
  goalTarget: { fontSize: 11 },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionMenu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 8 },
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#888', alignSelf: 'center', marginBottom: 16 },
  menuTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  menuIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
});

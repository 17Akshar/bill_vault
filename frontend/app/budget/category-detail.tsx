import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR, EXPENSE_CATEGORIES } from '../../utils/formatINR';
import { DUMMY_BUDGET_CATEGORIES, CAT_COLORS } from './_data';

const DUMMY_TRANSACTIONS = [
  { id: 't1', merchant: 'Swiggy',      amount: 850,  date: '15 May 2024' },
  { id: 't2', merchant: 'Zomato',      amount: 1200, date: '14 May 2024' },
  { id: 't3', merchant: 'Dominos',     amount: 750,  date: '12 May 2024' },
  { id: 't4', merchant: 'Big Basket',  amount: 2300, date: '10 May 2024' },
  { id: 't5', merchant: 'McDonald\'s', amount: 540,  date: '8 May 2024' },
  { id: 't6', merchant: 'Restaurant',  amount: 1800, date: '5 May 2024' },
  { id: 't7', merchant: 'Starbucks',   amount: 600,  date: '3 May 2024' },
];

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ key?: string }>();

  const catKey = params.key || 'food';
  const catMeta = EXPENSE_CATEGORIES.find(c => c.key === catKey);
  const budgetData = DUMMY_BUDGET_CATEGORIES.find(c => c.key === catKey) ?? DUMMY_BUDGET_CATEGORIES[0];
  const catColor = CAT_COLORS[catKey] || colors.primary;

  const pct = Math.round((budgetData.spent / budgetData.budget) * 100);
  const barColor = pct > 100 ? '#FF5252' : pct > 80 ? '#FFB300' : '#00C48C';
  const remaining = budgetData.budget - budgetData.spent;
  const dailyBudget = Math.round(budgetData.budget / 31);
  const dailySpent = Math.round(budgetData.spent / 15);

  const handleDelete = () => {
    Alert.alert(
      'Delete Budget',
      `Remove budget for ${catMeta?.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Category Budget</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Category Header Card */}
        <View style={[styles.catHeader, { backgroundColor: catColor + '18' }]}>
          <View style={[styles.catIcon, { backgroundColor: catColor + '30' }]}>
            <Ionicons name={catMeta?.icon as any || 'ellipsis-horizontal-outline'} size={32} color={catColor} />
          </View>
          <Text style={[styles.catName, { color: catColor }]}>{catMeta?.label || catKey}</Text>
          <Text style={[styles.catBudgetType, { color: colors.textSecondary }]}>Monthly Budget</Text>

          {/* Main progress */}
          <View style={styles.mainProgress}>
            <Text style={[styles.spentAmt, { color: catColor }]}>{formatINR(budgetData.spent)}</Text>
            <Text style={[styles.ofText, { color: colors.textSecondary }]}> of </Text>
            <Text style={[styles.budgetAmt, { color: colors.text }]}>{formatINR(budgetData.budget)}</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: catColor + '30' }]}>
            <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
          </View>

          <View style={[styles.pctBadge, { backgroundColor: barColor + '20' }]}>
            <Text style={[styles.pctText, { color: barColor }]}>{pct}% used</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.card }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.statValue, { color: remaining >= 0 ? '#00C48C' : '#FF5252' }]}>
              {remaining < 0 ? '-' : ''}{formatINR(Math.abs(remaining))}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Budget</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(dailyBudget)}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Avg</Text>
            <Text style={[styles.statValue, { color: dailySpent > dailyBudget ? '#FF5252' : '#00C48C' }]}>
              {formatINR(dailySpent)}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: barColor + '12' }]}>
          <Ionicons
            name={pct > 100 ? 'alert-circle' : pct > 80 ? 'warning' : 'checkmark-circle'}
            size={20}
            color={barColor}
          />
          <Text style={[styles.statusText, { color: barColor }]}>
            {pct > 100
              ? `Over budget by ${formatINR(Math.abs(remaining))}`
              : pct > 80
              ? `Warning: ${100 - pct}% budget remaining`
              : `On track — ${formatINR(remaining)} left for the month`}
          </Text>
        </View>

        {/* Transactions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
            <Text style={[styles.txCount, { color: colors.textSecondary }]}>{DUMMY_TRANSACTIONS.length} this month</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {DUMMY_TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txDot, { backgroundColor: catColor + '22' }]}>
                <Ionicons name={catMeta?.icon as any || 'receipt-outline'} size={14} color={catColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txMerchant, { color: colors.text }]}>{tx.merchant}</Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: '#FF5252' }]}>−{formatINR(tx.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, flex: 1 }]}
            onPress={() => router.push({ pathname: '/budget/add-category', params: { edit: catKey } } as any)}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Budget</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF525215', flex: 1 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#FF5252" />
            <Text style={[styles.actionBtnText, { color: '#FF5252' }]}>Delete Budget</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  catHeader: { marginHorizontal: 20, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 12 },
  catIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  catName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  catBudgetType: { fontSize: 12, marginBottom: 16 },
  mainProgress: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  spentAmt: { fontSize: 24, fontWeight: '900' },
  ofText: { fontSize: 14 },
  budgetAmt: { fontSize: 18, fontWeight: '700' },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 5 },
  pctBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  pctText: { fontSize: 14, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, marginBottom: 10 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statDivider: { width: 1 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  statusText: { flex: 1, fontSize: 13, fontWeight: '600' },

  sectionCard: { marginHorizontal: 20, borderRadius: 18, padding: 18, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  txCount: { fontSize: 12 },
  divider: { height: 1, marginVertical: 12 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  txDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  txMerchant: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, height: 48 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
});

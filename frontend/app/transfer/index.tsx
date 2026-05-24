import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';
import api from '../../utils/api';

const { width: SW } = Dimensions.get('window');
const PURPLE = '#7C5CE7';
const GREEN  = '#00E676';
const RED    = '#EF4444';

type Period = 'month' | 'quarter' | 'year';

const STATS: Record<Period, { net: number; moneyIn: number; moneyOut: number; isOutflow: boolean }> = {
  month:   { net: 25000,  moneyIn: 75000,   moneyOut: 100000, isOutflow: true  },
  quarter: { net: 15000,  moneyIn: 225000,  moneyOut: 210000, isOutflow: false },
  year:    { net: 80000,  moneyIn: 900000,  moneyOut: 820000, isOutflow: false },
};

const DEMO_TRANSFERS = [
  { id: 't1', fromAbbr: 'IC', fromName: 'ICICI Bank •••• 5678', toName: 'SBI Bank •••• 4321',  amount: 10000,  date: '2024-06-23T10:30:00', color: '#7C5CE7' },
  { id: 't2', fromAbbr: 'SB', fromName: 'Salary Account',      toName: 'HDFC Bank •••• 1234',  amount: 50000,  date: '2024-06-23T09:15:00', color: '#2979FF' },
  { id: 't3', fromAbbr: 'PC', fromName: 'Paytm Wallet',        toName: 'HDFC Bank •••• 1234',  amount: 2000,   date: '2024-06-22T20:45:00', color: '#00C896' },
  { id: 't4', fromAbbr: 'AX', fromName: 'Axis Bank •••• 7890', toName: 'ICICI Bank •••• 5678', amount: 5000,   date: '2024-06-22T17:20:00', color: '#FF9100' },
];

function formatDT(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy, hh:mm aa'); } catch { return iso; }
}

export default function TransferDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [period, setPeriod]     = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [transfers, setTransfers] = useState(DEMO_TRANSFERS);

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const stats = STATS[period];

  const donutData = [
    { value: stats.moneyIn,  color: PURPLE,  label: 'In'  },
    { value: stats.moneyOut, color: RED,     label: 'Out' },
  ];
  const donutTotal = stats.moneyIn + stats.moneyOut;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get('/transfers').catch(() => ({ data: [] }));
      if (res.data?.length) setTransfers(res.data);
    } finally { setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="menu-outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transfer</Text>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="filter-outline" size={22} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* Period Tabs */}
      <View style={[styles.tabRow, { backgroundColor: CARD, borderColor: colors.border }]}>
        {(['month', 'quarter', 'year'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && styles.tabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, { color: period === p ? '#FFF' : colors.textSecondary }]}>
              {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={PURPLE} />}
      >

        {/* Net Transfer Card */}
        <View style={[styles.netCard, { backgroundColor: CARD }]}>
          <View style={styles.netLeft}>
            <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Transfer</Text>
            <Text style={[styles.netAmount, { color: colors.text }]}>{formatINR(stats.net)}</Text>
            <View style={[styles.netBadge, { backgroundColor: `${stats.isOutflow ? RED : GREEN}22` }]}>
              <Ionicons name="swap-horizontal" size={13} color={stats.isOutflow ? RED : GREEN} />
              <Text style={[styles.netBadgeText, { color: stats.isOutflow ? RED : GREEN }]}>
                {stats.isOutflow ? 'Net Outflow' : 'Net Inflow'}
              </Text>
            </View>
          </View>
          <View style={styles.netRight}>
            <DonutChart
              data={donutData}
              size={120}
              strokeWidth={18}
              centerValue={formatINR(donutTotal)}
              centerLabel="Total"
              centerColor={PURPLE}
            />
          </View>
        </View>

        {/* Money In / Out */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: CARD }]}>
            <View style={[styles.statIcon, { backgroundColor: `${GREEN}22` }]}>
              <Ionicons name="arrow-down" size={18} color={GREEN} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Money In</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(stats.moneyIn)}</Text>
            <View style={[styles.statBar, { backgroundColor: colors.border }]}>
              <View style={[styles.statBarFill, { backgroundColor: GREEN, width: `${Math.round((stats.moneyIn / donutTotal) * 100)}%` as any }]} />
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: CARD }]}>
            <View style={[styles.statIcon, { backgroundColor: `${RED}22` }]}>
              <Ionicons name="arrow-up" size={18} color={RED} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Money Out</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(stats.moneyOut)}</Text>
            <View style={[styles.statBar, { backgroundColor: colors.border }]}>
              <View style={[styles.statBarFill, { backgroundColor: RED, width: `${Math.round((stats.moneyOut / donutTotal) * 100)}%` as any }]} />
            </View>
          </View>
        </View>

        {/* Recent Transfers */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transfers</Text>
          <TouchableOpacity>
            <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.listCard, { backgroundColor: CARD }]}>
          {transfers.map((t, i) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.txnRow, i < transfers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.txnAvatar, { backgroundColor: `${t.color}22` }]}>
                <Text style={[styles.txnAbbr, { color: t.color }]}>{t.fromAbbr}</Text>
              </View>
              <View style={styles.txnMeta}>
                <Text style={[styles.txnFrom, { color: colors.text }]}>{t.fromName}</Text>
                <Text style={[styles.txnTo, { color: colors.textSecondary }]}>To {t.toName}</Text>
                <Text style={[styles.txnDate, { color: colors.textSecondary }]}>{formatDT(t.date)}</Text>
              </View>
              <View style={styles.txnRight}>
                <Text style={[styles.txnAmt, { color: RED }]}>₹{(t.amount / 1000).toFixed(0)},000</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: PURPLE }]}
            onPress={() => router.push('/transfer/add' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.btnPrimaryText}>New Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: CARD, borderColor: colors.border }]} activeOpacity={0.8}>
            <Text style={[styles.btnSecondaryText, { color: colors.text }]}>View All Transfers</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  tabRow:       { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1 },
  tab:          { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive:    { backgroundColor: PURPLE },
  tabText:      { fontSize: 13, fontWeight: '600' },
  scroll:       { paddingHorizontal: 20, paddingTop: 4 },
  netCard:      { borderRadius: 18, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  netLeft:      { flex: 1 },
  netLabel:     { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  netAmount:    { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10 },
  netBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  netBadgeText: { fontSize: 12, fontWeight: '700' },
  netRight:     { alignItems: 'center' },
  statRow:      { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard:     { flex: 1, borderRadius: 16, padding: 16 },
  statIcon:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel:    { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  statValue:    { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  statBar:      { height: 4, borderRadius: 2, overflow: 'hidden' },
  statBarFill:  { height: 4, borderRadius: 2 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll:      { fontSize: 13, fontWeight: '600' },
  listCard:     { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  txnRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txnAvatar:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txnAbbr:      { fontSize: 14, fontWeight: '800' },
  txnMeta:      { flex: 1 },
  txnFrom:      { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txnTo:        { fontSize: 12, marginBottom: 2 },
  txnDate:      { fontSize: 11 },
  txnRight:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txnAmt:       { fontSize: 14, fontWeight: '700' },
  btnRow:       { flexDirection: 'row', gap: 12, marginBottom: 8 },
  btnPrimary:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  btnPrimaryText:   { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnSecondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  btnSecondaryText: { fontSize: 14, fontWeight: '600' },
});

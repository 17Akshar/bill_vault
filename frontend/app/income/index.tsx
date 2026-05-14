import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-gifted-charts';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';

const { width: SW } = Dimensions.get('window');

const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREEN       = '#51DB7A';
const GREY        = '#8B8B8B';

const CAT_COLORS = [GREEN, '#26C6DA', PURPLE, '#FFB300', '#FF9100', '#E91E8C', '#448AFF', '#66BB6A'];

function catMeta(key: string, idx: number) {
  const k = (key || '').toLowerCase().trim();
  const cat = INCOME_CATEGORIES.find(c => c.key === k);
  return {
    icon: (cat?.icon as any) || 'cash-outline',
    color: CAT_COLORS[idx % CAT_COLORS.length],
    label: cat?.label || (key || 'Other'),
  };
}

export default function IncomeDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [date, setDate]       = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<{ total: number; categories: any[] }>({ total: 0, categories: [] });
  const [prevTotal, setPrevTotal] = useState(0);

  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  const fetchData = useCallback(async () => {
    try {
      const prev = subMonths(date, 1);
      const [incRes, bdRes, prevRes] = await Promise.all([
        api.get(`/income?month=${m}&year=${y}`),
        api.get(`/analytics/income-breakdown?month=${m}&year=${y}`),
        api.get(`/income?month=${prev.getMonth() + 1}&year=${prev.getFullYear()}`),
      ]);
      setIncomes(incRes.data || []);
      setBreakdown(bdRes.data || { total: 0, categories: [] });
      setPrevTotal((prevRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0));
    } catch {
      setIncomes([]); setBreakdown({ total: 0, categories: [] }); setPrevTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [m, y, date]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  const total       = breakdown.total || 0;
  const txCount     = incomes.length;
  const avgPerEntry = txCount > 0 ? Math.round(total / txCount) : 0;
  const pctVsLast   = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0;
  const positive    = pctVsLast >= 0;

  const recent = incomes.slice(0, 5);
  const cats   = (breakdown.categories || []).map((c: any, i: number) => ({ ...c, ...catMeta(c.category, i) }));
  const donutData = cats.map((c: any) => ({ value: c.amount, color: c.color }));

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Income</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{format(date, 'MMMM yyyy')} · your money in</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/income/analytics')} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-analytics-btn">
          <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={PURPLE} />}
      >
        {/* Month navigator */}
        <View style={s.monthRow}>
          <TouchableOpacity onPress={() => setDate(subMonths(date, 1))} style={[s.monthBtn, { backgroundColor: CARD_BG }]} testID="income-month-prev">
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.monthLabel, { color: colors.text }]}>{format(date, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setDate(addMonths(date, 1))} style={[s.monthBtn, { backgroundColor: CARD_BG }]} testID="income-month-next">
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }} testID="income-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <>
            {/* Hero card — Total Income */}
            <LinearGradient
              colors={[PURPLE_DARK, PURPLE]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.hero}
              testID="income-hero"
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>TOTAL INCOME</Text>
                {prevTotal > 0 && (
                  <View style={s.heroPill}>
                    <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{Math.abs(pctVsLast).toFixed(1)}%</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 }}>
                {formatINR(total)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{format(date, 'MMMM yyyy')}</Text>
              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatLabel}>Entries</Text>
                  <Text style={s.heroStatVal}>{txCount}</Text>
                </View>
                <View style={[s.heroStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={s.heroStatLabel}>Avg / Entry</Text>
                  <Text style={s.heroStatVal}>{formatINR(avgPerEntry)}</Text>
                </View>
                <View style={[s.heroStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={s.heroStatLabel}>Sources</Text>
                  <Text style={s.heroStatVal}>{cats.length}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Action shortcuts */}
            <View style={s.actionsRow}>
              {[
                { icon: 'add-circle',         label: 'Add',       route: '/income/add',        color: GREEN,  testID: 'income-action-add' },
                { icon: 'repeat',             label: 'Recurring', route: '/income/recurring',  color: PURPLE, testID: 'income-action-recurring' },
                { icon: 'pricetags',          label: 'Sources',   route: '/income/sources',    color: '#26C6DA', testID: 'income-action-sources' },
                { icon: 'analytics',          label: 'Analytics', route: '/income/analytics',  color: '#FFB300', testID: 'income-action-analytics' },
              ].map(a => (
                <TouchableOpacity
                  key={a.label}
                  onPress={() => router.push(a.route as any)}
                  style={[s.actionCard, { backgroundColor: CARD_BG }]}
                  activeOpacity={0.8}
                  testID={a.testID}
                >
                  <View style={[s.actionIcon, { backgroundColor: a.color + '22' }]}>
                    <Ionicons name={a.icon as any} size={20} color={a.color} />
                  </View>
                  <Text style={[s.actionLabel, { color: colors.text }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* By Source donut */}
            {cats.length > 0 ? (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-by-source">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>By Source</Text>
                  <TouchableOpacity onPress={() => router.push('/income/analytics')} testID="income-by-source-view-all">
                    <Text style={[s.viewAll, { color: PURPLE }]}>Analytics →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', marginTop: 6 }}>
                  <PieChart
                    data={donutData}
                    donut
                    radius={92}
                    innerRadius={64}
                    backgroundColor={CARD_BG}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Total</Text>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 }}>
                          {formatINR(total).replace('.00', '')}
                        </Text>
                      </View>
                    )}
                  />
                </View>
                <View style={s.legend}>
                  {cats.map((c: any) => (
                    <View key={c.category} style={s.legendItem} testID={`income-cat-legend-${c.category}`}>
                      <View style={[s.legendDot, { backgroundColor: c.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.legendName, { color: colors.text }]} numberOfLines={1}>{c.label}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{c.count} entries</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.legendAmt, { color: colors.text }]}>{formatINR(c.amount)}</Text>
                        <Text style={{ color: c.color, fontSize: 11, fontWeight: '800' }}>{c.percentage}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[s.empty, { backgroundColor: CARD_BG }]} testID="income-empty">
                <Ionicons name="cash-outline" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 12 }}>No income this month</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
                  Track every rupee you receive. Tap "Add" to log your first entry.
                </Text>
                <TouchableOpacity onPress={() => router.push('/income/add')} style={s.emptyBtn} testID="income-empty-add">
                  <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtnInner}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Add Income</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent income */}
            {recent.length > 0 && (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-recent-list">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
                  {incomes.length > recent.length && (
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{incomes.length} total</Text>
                  )}
                </View>
                {recent.map((it: any, i: number) => {
                  const meta = catMeta(it.category, INCOME_CATEGORIES.findIndex(c => c.key === it.category));
                  return (
                    <TouchableOpacity
                      key={it.income_id}
                      onPress={() => router.push({ pathname: '/income/add', params: { id: it.income_id } } as any)}
                      style={[s.txnRow, i < recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
                      activeOpacity={0.7}
                      testID={`income-recent-row-${i}`}
                    >
                      <View style={[s.txnIcon, { backgroundColor: meta.color + '22' }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.txnName, { color: colors.text }]} numberOfLines={1}>{it.source || meta.label}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                          {meta.label} · {it.date ? format(parseISO(it.date), 'dd MMM') : ''}
                          {(it.labels || []).includes('recurring') ? ' · Recurring' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.txnAmt, { color: GREEN }]}>+{formatINR(it.amount)}</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fabWrap} activeOpacity={0.85} onPress={() => router.push('/income/add')} testID="income-fab">
        <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fab}>
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  monthRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  monthBtn:  { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  monthLabel:{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  hero:      { borderRadius: 20, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroStats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  heroStat:  { flex: 1, paddingHorizontal: 10, alignItems: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroStatVal: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 4, letterSpacing: -0.2 },

  actionsRow:{ flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionCard:{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8 },
  actionIcon:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  card:      { borderRadius: 18, padding: 18, marginBottom: 16 },
  sectionHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  viewAll:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  legend:    { marginTop: 18 },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName:{ fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  legendAmt: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },

  empty:     { padding: 32, borderRadius: 18, alignItems: 'center', marginBottom: 16 },
  emptyBtn:  { marginTop: 16, borderRadius: 999, overflow: 'hidden' },
  emptyBtnInner:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10 },

  txnRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  txnIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnName:   { fontSize: 13, fontWeight: '800', letterSpacing: -0.1 },
  txnAmt:    { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  fabWrap:   { position: 'absolute', right: 18, bottom: 24, shadowColor: PURPLE, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fab:       { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});

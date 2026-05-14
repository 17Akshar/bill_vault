import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

// ─── Palette ──────────────────────────────────────────────────────────────────
const GREEN       = '#51DB7A';
const RED         = '#FF4A4A';
const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREY        = '#8B8B8B';

type Period = 'month' | 'quarter' | 'year';

// ─── Category / source icon + color map ───────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: string; color: string }> = {
  food:          { icon: 'fast-food-outline',    color: '#FF6B6B' },
  transport:     { icon: 'car-outline',          color: '#4DABF7' },
  shopping:      { icon: 'bag-handle-outline',   color: '#B197FC' },
  entertainment: { icon: 'film-outline',         color: '#FFB300' },
  bills:         { icon: 'receipt-outline',      color: '#26C6DA' },
  utilities:     { icon: 'flash-outline',        color: '#FFB300' },
  health:        { icon: 'medkit-outline',       color: '#66BB6A' },
  education:     { icon: 'school-outline',       color: '#4DABF7' },
  investment:    { icon: 'trending-up-outline',  color: '#8E2DE2' },
  income:        { icon: 'briefcase-outline',    color: '#51DB7A' },
  salary:        { icon: 'briefcase-outline',    color: '#51DB7A' },
  freelance:     { icon: 'laptop-outline',       color: '#26C6DA' },
  travel:        { icon: 'airplane-outline',     color: '#FF9100' },
  groceries:     { icon: 'cart-outline',         color: '#66BB6A' },
  rent:          { icon: 'home-outline',         color: '#4DABF7' },
  insurance:     { icon: 'shield-outline',       color: '#26C6DA' },
  gift:          { icon: 'gift-outline',         color: '#E91E8C' },
  other:         { icon: 'ellipsis-horizontal',  color: GREY      },
};
const FALLBACK_COLORS = [PURPLE, '#26C6DA', GREEN, '#FF9100', '#FFB300', '#E91E8C', RED, '#448AFF', '#66BB6A'];
function configFor(name: string, idx: number) {
  const key = (name || '').toLowerCase().trim();
  return CAT_CONFIG[key] || { icon: 'ellipsis-horizontal' as any, color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length] };
}

// ─── Reusable category row ────────────────────────────────────────────────────
type Row = { name: string; amount: number; txns: number; icon: any; color: string };

function CategoryRow({
  row, total, isLast, isInflow, colors, isDark, testID,
}: {
  row: Row; total: number; isLast: boolean; isInflow: boolean;
  colors: any; isDark: boolean; testID: string;
}) {
  const pct = total > 0 ? (row.amount / total) * 100 : 0;
  return (
    <View
      style={[
        s.row,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
        },
      ]}
      testID={testID}
    >
      <View style={[s.rowIcon, { backgroundColor: row.color + '22' }]}>
        <Ionicons name={row.icon} size={18} color={row.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={[s.rowName, { color: colors.text }]} numberOfLines={1}>{row.name}</Text>
          <Text style={[s.rowAmt, { color: isInflow ? GREEN : RED }]}>
            {isInflow ? '+' : '-'}{formatINR(row.amount)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: row.color }} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', minWidth: 70, textAlign: 'right' }}>
            {pct.toFixed(1)}% · {row.txns} txn
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CashFlowDetailsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const res = await api.get(`/insights/cashflow?period=${period}&month=${m}&year=${y}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  // ── Derived UI rows ──
  const totals    = data?.totals || {};
  const totalIn   = Number(totals.inflow  || 0);
  const totalOut  = Number(totals.outflow || 0);
  const net       = Number(totals.net     || 0);
  const positive  = net >= 0;
  const inPct     = Number(totals.in_share_pct  || 0);
  const outPct    = Number(totals.out_share_pct || 0);
  const label     = data?.label || '';

  const inflowRows: Row[] = (data?.inflow_by_source || []).map((r: any, i: number) => {
    const cfg = configFor(r.source, i);
    return { name: r.source || 'Other Income', amount: Number(r.amount || 0), txns: Number(r.count || 0), icon: cfg.icon, color: cfg.color };
  });
  const outflowRows: Row[] = (data?.outflow_by_category || []).map((r: any, i: number) => {
    const cfg = configFor(r.category, i);
    return { name: r.category || 'Other', amount: Number(r.amount || 0), txns: Number(r.count || 0), icon: cfg.icon, color: cfg.color };
  });

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.iconBtn, { backgroundColor: CARD_BG }]}
          testID="cashflow-details-back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Cash Flow Details</Text>
          {!!label && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{label}</Text>}
        </View>
        <View style={[s.iconBtn, { backgroundColor: 'transparent' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 }}>
        {/* ── Period Tabs ───────────────────────────────── */}
        <View style={[s.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="cashflow-details-period-tabs">
          {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
            const active = period === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setPeriod(k as Period)}
                style={[s.periodBtn, active && { backgroundColor: PURPLE }]}
                activeOpacity={0.85}
                testID={`cashflow-details-period-${k}`}
              >
                <Text style={[s.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>
                  {l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }} testID="cashflow-details-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : !data ? (
          <View style={[s.emptyCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-empty">
            <Ionicons name="swap-vertical-outline" size={40} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 10 }}>No cash flow data</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Add income & expense transactions to see your cash flow breakdown.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Net Cash Flow Hero ───────────────────────── */}
            <LinearGradient
              colors={positive ? [PURPLE_DARK, PURPLE] : ['#B71C1C', '#E91E8C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroCard}
              testID="cashflow-details-net-hero"
            >
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Net Cash Flow</Text>
              <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 }}>
                {positive ? '+' : '-'}{formatINR(Math.abs(net))}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{label}</Text>

              {/* In vs Out stacked bar */}
              <View style={s.stackBarWrap}>
                <View style={{ flex: inPct || 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.85)' }} />
                <View style={{ flex: outPct || 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.35)' }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' }} />
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>Inflow {inPct.toFixed(1)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' }} />
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>Outflow {outPct.toFixed(1)}%</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── Total Inflow / Outflow stat row ──────────── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={[s.statCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-total-inflow">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: GREEN + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-down" size={15} color={GREEN} />
                  </View>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
                </View>
                <Text style={[s.statValue, { color: GREEN }]}>{formatINR(totalIn)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{inflowRows.length} sources</Text>
              </View>

              <View style={[s.statCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-total-outflow">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: RED + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-up" size={15} color={RED} />
                  </View>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
                </View>
                <Text style={[s.statValue, { color: RED }]}>{formatINR(totalOut)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{outflowRows.length} categories</Text>
              </View>
            </View>

            {/* ── Cash In (Inflow) ─────────────────────────── */}
            <View style={[s.groupCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-inflow-group">
              <View style={s.groupHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: GREEN + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trending-down" size={16} color={GREEN} />
                  </View>
                  <View>
                    <Text style={[s.groupTitle, { color: colors.text }]}>Cash In</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>Money received</Text>
                  </View>
                </View>
                <Text style={[s.groupTotal, { color: GREEN }]}>{formatINR(totalIn)}</Text>
              </View>

              {inflowRows.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, paddingVertical: 14, textAlign: 'center' }}>No inflow this period.</Text>
              ) : inflowRows.map((row, i) => (
                <CategoryRow
                  key={row.name + i}
                  row={row}
                  total={totalIn}
                  isLast={i === inflowRows.length - 1}
                  isInflow
                  colors={colors}
                  isDark={isDark}
                  testID={`cashflow-details-inflow-${i}`}
                />
              ))}
            </View>

            {/* ── Cash Out (Outflow) ───────────────────────── */}
            <View style={[s.groupCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-outflow-group">
              <View style={s.groupHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: RED + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trending-up" size={16} color={RED} />
                  </View>
                  <View>
                    <Text style={[s.groupTitle, { color: colors.text }]}>Cash Out</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>Money spent</Text>
                  </View>
                </View>
                <Text style={[s.groupTotal, { color: RED }]}>{formatINR(totalOut)}</Text>
              </View>

              {outflowRows.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, paddingVertical: 14, textAlign: 'center' }}>No outflow this period.</Text>
              ) : outflowRows.map((row, i) => (
                <CategoryRow
                  key={row.name + i}
                  row={row}
                  total={totalOut}
                  isLast={i === outflowRows.length - 1}
                  isInflow={false}
                  colors={colors}
                  isDark={isDark}
                  testID={`cashflow-details-outflow-${i}`}
                />
              ))}
            </View>

            {/* ── Footer summary ───────────────────────────── */}
            <View style={[s.footerCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-footer-summary">
              <View style={s.footerRow}>
                <Text style={[s.footerLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
                <Text style={[s.footerVal, { color: GREEN }]}>+{formatINR(totalIn)}</Text>
              </View>
              <View style={s.footerRow}>
                <Text style={[s.footerLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
                <Text style={[s.footerVal, { color: RED }]}>-{formatINR(totalOut)}</Text>
              </View>
              <View style={[s.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />
              <View style={s.footerRow}>
                <Text style={[s.footerLabel, { color: colors.text, fontWeight: '700' }]}>Net Cash Flow</Text>
                <Text style={[s.footerVal, { color: positive ? GREEN : RED, fontSize: 18 }]}>
                  {positive ? '+' : '-'}{formatINR(Math.abs(net))}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },

  heroCard:    { borderRadius: 18, padding: 20, marginBottom: 16, overflow: 'hidden' },
  stackBarWrap:{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 16 },

  statCard:    { flex: 1, borderRadius: 16, padding: 14, gap: 8 },
  statLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  statValue:   { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },

  groupCard:   { borderRadius: 18, padding: 16, marginBottom: 16 },
  groupHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  groupTitle:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  groupTotal:  { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName:     { fontSize: 13, fontWeight: '800', textTransform: 'capitalize', letterSpacing: -0.1 },
  rowAmt:      { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },

  footerCard:  { borderRadius: 18, padding: 18 },
  footerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  footerLabel: { fontSize: 13, fontWeight: '600' },
  footerVal:   { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  footerDivider:{ height: 1, marginVertical: 8 },

  emptyCard:   { padding: 32, borderRadius: 18, alignItems: 'center', marginTop: 10 },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const RED         = '#FF4A4A';
const GREEN       = '#51DB7A';
const GREY        = '#8B8B8B';

type Period = 'month' | 'quarter' | 'year';

// ─── Category icon + color map ────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: string; color: string }> = {
  food:          { icon: 'fast-food-outline',    color: '#FF6B6B' },
  transport:     { icon: 'car-outline',          color: '#4DABF7' },
  shopping:      { icon: 'bag-handle-outline',   color: '#B197FC' },
  entertainment: { icon: 'film-outline',         color: '#FFB300' },
  bills:         { icon: 'receipt-outline',      color: '#26C6DA' },
  utilities:     { icon: 'flash-outline',        color: '#FFB300' },
  health:        { icon: 'medkit-outline',       color: '#66BB6A' },
  education:     { icon: 'school-outline',       color: '#4DABF7' },
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SpendingByCategoryScreen() {
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
      const res = await api.get(`/insights/spending?period=${period}&month=${m}&year=${y}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const CARD_BG  = isDark ? '#1C1C2E' : colors.card;

  const label     = data?.label || '';
  const total     = Number(data?.total || 0);
  const vsLastPct = Number(data?.vs_previous || 0);
  const declined  = vsLastPct < 0;
  const txnCount  = Number(data?.txn_count || 0);

  // ── Build category cards ──
  const merchants: any[] = data?.top_merchants || [];
  const categories = (data?.categories || []).map((c: any, i: number) => {
    const name = c.category || 'Other';
    const cfg  = configFor(name, i);
    const amt  = Number(c.amount || 0);
    const txns = Number(c.count  || 0);
    const pct  = Number(c.percentage || 0);
    const avg  = txns > 0 ? Math.round(amt / txns) : 0;
    const topMerchants = merchants
      .filter((m: any) => (m.category || '').toLowerCase() === name.toLowerCase())
      .slice(0, 3)
      .map((m: any) => m.merchant);
    return { name, amount: amt, pct, txns, avg, icon: cfg.icon, color: cfg.color, top_merchants: topMerchants };
  });

  const donutData = categories.map((c: any) => ({ value: c.amount, color: c.color }));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.iconBtn, { backgroundColor: CARD_BG }]}
          testID="spending-cat-back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Spending by Category</Text>
          {!!label && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{label}</Text>}
        </View>
        <View style={[s.iconBtn, { backgroundColor: 'transparent' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 }}>
        {/* ── Period Tabs ───────────────────────────────── */}
        <View style={[s.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="spending-cat-period-tabs">
          {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
            const active = period === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setPeriod(k as Period)}
                style={[s.periodBtn, active && { backgroundColor: PURPLE }]}
                activeOpacity={0.85}
                testID={`spending-cat-period-${k}`}
              >
                <Text style={[s.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>
                  {l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }} testID="spending-cat-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : !data || total === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: CARD_BG }]} testID="spending-cat-empty">
            <Ionicons name="pie-chart-outline" size={40} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 10 }}>No spending yet</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Add expense transactions to see your spending breakdown by category.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Donut + Total Spending ─────────────────────── */}
            <View style={[s.donutCard, { backgroundColor: CARD_BG }]} testID="spending-cat-donut">
              <View style={{ alignItems: 'center' }}>
                <PieChart
                  data={donutData}
                  donut
                  radius={108}
                  innerRadius={74}
                  backgroundColor={CARD_BG}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500' }}>Total Spending</Text>
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 }}>
                        {formatINR(total).replace('.00', '')}
                      </Text>
                      {vsLastPct !== 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                          <Ionicons name={declined ? 'arrow-down' : 'arrow-up'} size={10} color={declined ? GREEN : RED} />
                          <Text style={{ color: declined ? GREEN : RED, fontSize: 11, fontWeight: '700' }}>
                            {Math.abs(vsLastPct).toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>

              {/* Legend - 2 col */}
              <View style={s.legendGrid}>
                {categories.map((c: any) => (
                  <View key={c.name} style={s.legendItem}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                    <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 11, textTransform: 'capitalize' }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{c.pct.toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Section title ─────────────────────────────── */}
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{categories.length} categories</Text>
            </View>

            {/* ── Category cards ────────────────────────────── */}
            {categories.map((c: any, i: number) => (
              <View
                key={c.name + i}
                style={[s.catCard, { backgroundColor: CARD_BG }]}
                testID={`spending-cat-row-${i}`}
              >
                <View style={s.catTop}>
                  <View style={[s.catIcon, { backgroundColor: c.color + '22' }]}>
                    <Ionicons name={c.icon} size={20} color={c.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.catName, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[s.catMeta, { color: colors.textSecondary }]}>
                      {c.txns} txns · avg {formatINR(c.avg)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.catAmt, { color: colors.text }]}>{formatINR(c.amount)}</Text>
                    <View style={[s.pctPill, { backgroundColor: c.color + '22' }]}>
                      <Text style={{ color: c.color, fontSize: 11, fontWeight: '800' }}>{c.pct.toFixed(1)}%</Text>
                    </View>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(c.pct, 100)}%`, height: '100%', backgroundColor: c.color, borderRadius: 3 }} />
                  </View>
                </View>

                {/* Top merchants pills */}
                {c.top_merchants.length > 0 && (
                  <View style={s.merchantsRow}>
                    <Ionicons name="storefront-outline" size={11} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginRight: 4 }}>Top:</Text>
                    {c.top_merchants.map((m: string, mi: number) => (
                      <View key={m + mi} style={[s.merchantPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* ── Footer total ──────────────────────────────── */}
            <LinearGradient
              colors={[PURPLE_DARK, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.footerCard}
            >
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Spending · {label}</Text>
              <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 }}>
                {formatINR(total)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                across {categories.length} categories ·  {txnCount} transactions
              </Text>
            </LinearGradient>
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

  donutCard:   { borderRadius: 18, padding: 20, marginBottom: 16, alignItems: 'center' },
  legendGrid:  { flexDirection: 'row', flexWrap: 'wrap', width: '100%', marginTop: 18 },
  legendItem:  { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },

  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  catCard:     { borderRadius: 16, padding: 16, marginBottom: 12 },
  catTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon:     { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:     { fontSize: 14, fontWeight: '800', textTransform: 'capitalize', letterSpacing: -0.1 },
  catMeta:     { fontSize: 11, marginTop: 3 },
  catAmt:      { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  pctPill:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, marginTop: 5 },

  merchantsRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13, flexWrap: 'wrap' },
  merchantPill:{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },

  footerCard:  { borderRadius: 18, padding: 20, marginTop: 8, marginBottom: 4 },

  emptyCard:   { padding: 32, borderRadius: 18, alignItems: 'center', marginTop: 10 },
});

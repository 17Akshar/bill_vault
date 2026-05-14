import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';

const { width: SW } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const RED         = '#FF4A4A';
const GREY        = '#8B8B8B';

type Period = 'month' | 'quarter' | 'year';

// ─── Dummy data ───────────────────────────────────────────────────────────────
type Cat = {
  name: string;
  amount: number;
  pct: number;
  txns: number;
  avg: number;
  icon: any;
  color: string;
  top_merchants: string[];
};

const DUMMY: Record<Period, { label: string; total: number; vs_last_pct: number; categories: Cat[] }> = {
  month: {
    label: 'May 2026',
    total: 75000,
    vs_last_pct: -5.3,
    categories: [
      { name: 'Food',          amount: 22500, pct: 30.0, txns: 28, avg:   803, icon: 'fast-food-outline',   color: '#FF6B6B', top_merchants: ['Swiggy', 'Zomato', 'Cafe'] },
      { name: 'Transport',     amount: 12000, pct: 16.0, txns: 19, avg:   631, icon: 'car-outline',         color: '#4DABF7', top_merchants: ['Uber', 'Petrol', 'Metro'] },
      { name: 'Shopping',      amount: 15000, pct: 20.0, txns: 11, avg:  1363, icon: 'bag-handle-outline',  color: '#B197FC', top_merchants: ['Amazon', 'Flipkart', 'Big Bazaar'] },
      { name: 'Entertainment', amount:  8500, pct: 11.3, txns:  7, avg:  1214, icon: 'film-outline',        color: '#FFB300', top_merchants: ['Netflix', 'BookMyShow', 'Spotify'] },
      { name: 'Bills',         amount: 11500, pct: 15.3, txns:  8, avg:  1438, icon: 'receipt-outline',     color: '#26C6DA', top_merchants: ['Electricity', 'Internet', 'Mobile'] },
      { name: 'Others',        amount:  5500, pct:  7.4, txns: 14, avg:   392, icon: 'ellipsis-horizontal', color: GREY,     top_merchants: ['Gift', 'Pharmacy', 'Misc'] },
    ],
  },
  quarter: {
    label: 'Q2 2026',
    total: 232000,
    vs_last_pct: 8.4,
    categories: [
      { name: 'Food',          amount: 68500, pct: 29.5, txns: 85, avg:  806, icon: 'fast-food-outline',   color: '#FF6B6B', top_merchants: ['Swiggy', 'Zomato', 'Cafe'] },
      { name: 'Transport',     amount: 37000, pct: 16.0, txns: 58, avg:  638, icon: 'car-outline',         color: '#4DABF7', top_merchants: ['Uber', 'Petrol', 'Metro'] },
      { name: 'Shopping',      amount: 48000, pct: 20.7, txns: 32, avg: 1500, icon: 'bag-handle-outline',  color: '#B197FC', top_merchants: ['Amazon', 'Flipkart', 'Myntra'] },
      { name: 'Entertainment', amount: 24500, pct: 10.6, txns: 22, avg: 1114, icon: 'film-outline',        color: '#FFB300', top_merchants: ['Netflix', 'BookMyShow', 'Spotify'] },
      { name: 'Bills',         amount: 36000, pct: 15.5, txns: 24, avg: 1500, icon: 'receipt-outline',     color: '#26C6DA', top_merchants: ['Electricity', 'Internet', 'Mobile'] },
      { name: 'Others',        amount: 18000, pct:  7.7, txns: 41, avg:  439, icon: 'ellipsis-horizontal', color: GREY,     top_merchants: ['Gift', 'Pharmacy', 'Misc'] },
    ],
  },
  year: {
    label: 'FY 2026',
    total: 918500,
    vs_last_pct: 12.1,
    categories: [
      { name: 'Food',          amount: 268000, pct: 29.2, txns: 342, avg:  784, icon: 'fast-food-outline',   color: '#FF6B6B', top_merchants: ['Swiggy', 'Zomato', 'Cafe'] },
      { name: 'Transport',     amount: 142000, pct: 15.5, txns: 234, avg:  607, icon: 'car-outline',         color: '#4DABF7', top_merchants: ['Uber', 'Petrol', 'Metro'] },
      { name: 'Shopping',      amount: 198000, pct: 21.6, txns: 124, avg: 1597, icon: 'bag-handle-outline',  color: '#B197FC', top_merchants: ['Amazon', 'Flipkart', 'Myntra'] },
      { name: 'Entertainment', amount:  96000, pct: 10.5, txns:  86, avg: 1116, icon: 'film-outline',        color: '#FFB300', top_merchants: ['Netflix', 'BookMyShow', 'Spotify'] },
      { name: 'Bills',         amount: 142500, pct: 15.5, txns:  96, avg: 1484, icon: 'receipt-outline',     color: '#26C6DA', top_merchants: ['Electricity', 'Internet', 'Mobile'] },
      { name: 'Others',        amount:  72000, pct:  7.8, txns: 160, avg:  450, icon: 'ellipsis-horizontal', color: GREY,     top_merchants: ['Gift', 'Pharmacy', 'Misc'] },
    ],
  },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SpendingByCategoryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');

  const d        = DUMMY[period];
  const declined = d.vs_last_pct < 0;
  const CARD_BG  = isDark ? '#1C1C2E' : colors.card;

  const donutData = d.categories.map(c => ({
    value: c.amount,
    color: c.color,
  }));

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
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{d.label}</Text>
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
                    {formatINR(d.total).replace('.00', '')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <Ionicons name={declined ? 'arrow-down' : 'arrow-up'} size={10} color={declined ? '#51DB7A' : RED} />
                    <Text style={{ color: declined ? '#51DB7A' : RED, fontSize: 11, fontWeight: '700' }}>
                      {Math.abs(d.vs_last_pct).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>

          {/* Legend - 2 col */}
          <View style={s.legendGrid}>
            {d.categories.map(c => (
              <View key={c.name} style={s.legendItem}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{c.name}</Text>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{c.pct.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Section title ─────────────────────────────── */}
        <View style={s.sectionHead}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{d.categories.length} categories</Text>
        </View>

        {/* ── Category cards ────────────────────────────── */}
        {d.categories.map((c, i) => (
          <View
            key={c.name}
            style={[s.catCard, { backgroundColor: CARD_BG }]}
            testID={`spending-cat-row-${i}`}
          >
            {/* Top row: icon + name + amount */}
            <View style={s.catTop}>
              <View style={[s.catIcon, { backgroundColor: c.color + '22' }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.catName, { color: colors.text }]}>{c.name}</Text>
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
            <View style={s.merchantsRow}>
              <Ionicons name="storefront-outline" size={11} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginRight: 4 }}>Top:</Text>
              {c.top_merchants.map((m, mi) => (
                <View key={m} style={[s.merchantPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Footer total ──────────────────────────────── */}
        <LinearGradient
          colors={[PURPLE_DARK, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.footerCard}
        >
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Spending · {d.label}</Text>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 }}>
            {formatINR(d.total)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
            across {d.categories.length} categories ·  {d.categories.reduce((s, c) => s + c.txns, 0)} transactions
          </Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:     { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  periodBtn:     { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  periodBtnText: { fontSize: 12, fontWeight: '700' },

  donutCard:   { borderRadius: 16, padding: 18, marginBottom: 14, alignItems: 'center' },
  legendGrid:  { flexDirection: 'row', flexWrap: 'wrap', width: '100%', marginTop: 18 },
  legendItem:  { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },

  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  catCard:     { borderRadius: 14, padding: 14, marginBottom: 10 },
  catTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:     { fontSize: 14, fontWeight: '700' },
  catMeta:     { fontSize: 11, marginTop: 2 },
  catAmt:      { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  pctPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },

  merchantsRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  merchantPill:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  footerCard:  { borderRadius: 16, padding: 18, marginTop: 8, marginBottom: 4 },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';

const { width: SW } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const GREEN       = '#51DB7A';
const RED         = '#FF4A4A';
const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREY        = '#8B8B8B';

type Period = 'month' | 'quarter' | 'year';

// ─── Dummy data ───────────────────────────────────────────────────────────────
type Row = { name: string; amount: number; txns: number; icon: any; color: string };

const DUMMY: Record<Period, { label: string; inflow: Row[]; outflow: Row[] }> = {
  month: {
    label: 'May 2026',
    inflow: [
      { name: 'Salary',       amount: 85000, txns:  1, icon: 'briefcase-outline',   color: GREEN  },
      { name: 'Freelance',    amount: 28000, txns:  3, icon: 'laptop-outline',      color: '#26C6DA' },
      { name: 'Other Income', amount: 12000, txns:  4, icon: 'cash-outline',        color: '#FFB300' },
    ],
    outflow: [
      { name: 'Food',      amount: 22500, txns: 28, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport', amount: 12000, txns: 19, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',  amount: 15000, txns: 11, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Bills',     amount: 11500, txns:  8, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',    amount: 14000, txns: 21, icon: 'ellipsis-horizontal', color: GREY     },
    ],
  },
  quarter: {
    label: 'Q2 2026',
    inflow: [
      { name: 'Salary',       amount: 255000, txns:  3, icon: 'briefcase-outline',   color: GREEN  },
      { name: 'Freelance',    amount:  72000, txns:  8, icon: 'laptop-outline',      color: '#26C6DA' },
      { name: 'Other Income', amount:  31000, txns: 11, icon: 'cash-outline',        color: '#FFB300' },
    ],
    outflow: [
      { name: 'Food',      amount: 68500, txns:  85, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport', amount: 37000, txns:  58, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',  amount: 48000, txns:  32, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Bills',     amount: 36000, txns:  24, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',    amount: 42500, txns:  63, icon: 'ellipsis-horizontal', color: GREY     },
    ],
  },
  year: {
    label: 'FY 2026',
    inflow: [
      { name: 'Salary',       amount: 1020000, txns: 12, icon: 'briefcase-outline',   color: GREEN  },
      { name: 'Freelance',    amount:  248000, txns: 32, icon: 'laptop-outline',      color: '#26C6DA' },
      { name: 'Other Income', amount:  114000, txns: 41, icon: 'cash-outline',        color: '#FFB300' },
    ],
    outflow: [
      { name: 'Food',      amount: 268000, txns: 342, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport', amount: 142000, txns: 234, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',  amount: 198000, txns: 124, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Bills',     amount: 142500, txns:  96, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',    amount: 168000, txns: 246, icon: 'ellipsis-horizontal', color: GREY     },
    ],
  },
};

const sum = (rows: Row[]) => rows.reduce((s, r) => s + r.amount, 0);

// ─── Reusable category row ────────────────────────────────────────────────────
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
          <Text style={[s.rowName, { color: colors.text }]}>{row.name}</Text>
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

  const d           = DUMMY[period];
  const totalIn     = sum(d.inflow);
  const totalOut    = sum(d.outflow);
  const net         = totalIn - totalOut;
  const positive    = net >= 0;
  const inOutRatio  = totalIn + totalOut;
  const inPct       = inOutRatio > 0 ? (totalIn  / inOutRatio) * 100 : 0;
  const outPct      = inOutRatio > 0 ? (totalOut / inOutRatio) * 100 : 0;
  const CARD_BG     = isDark ? '#1C1C2E' : colors.card;

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
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{d.label}</Text>
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
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{d.label}</Text>

          {/* In vs Out stacked bar */}
          <View style={s.stackBarWrap}>
            <View style={{ flex: inPct || 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.85)' }} />
            <View style={{ flex: outPct || 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.35)' }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' }} />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>Inflow {inPct.toFixed(1)}%</Text>
              </View>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' }} />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>Outflow {outPct.toFixed(1)}%</Text>
              </View>
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
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{d.inflow.length} sources</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: CARD_BG }]} testID="cashflow-details-total-outflow">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: RED + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-up" size={15} color={RED} />
              </View>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
            </View>
            <Text style={[s.statValue, { color: RED }]}>{formatINR(totalOut)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{d.outflow.length} categories</Text>
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

          {d.inflow.map((row, i) => (
            <CategoryRow
              key={row.name}
              row={row}
              total={totalIn}
              isLast={i === d.inflow.length - 1}
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

          {d.outflow.map((row, i) => (
            <CategoryRow
              key={row.name}
              row={row}
              total={totalOut}
              isLast={i === d.outflow.length - 1}
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

  heroCard:    { borderRadius: 16, padding: 18, marginBottom: 14, overflow: 'hidden' },
  stackBarWrap:{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 16 },

  statCard:    { flex: 1, borderRadius: 14, padding: 14, gap: 8 },
  statLabel:   { fontSize: 11, fontWeight: '600' },
  statValue:   { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  groupCard:   { borderRadius: 16, padding: 14, marginBottom: 14 },
  groupHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  groupTitle:  { fontSize: 15, fontWeight: '700' },
  groupTotal:  { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName:     { fontSize: 13, fontWeight: '700' },
  rowAmt:      { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },

  footerCard:  { borderRadius: 16, padding: 16 },
  footerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  footerLabel: { fontSize: 13, fontWeight: '600' },
  footerVal:   { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  footerDivider:{ height: 1, marginVertical: 6 },
});

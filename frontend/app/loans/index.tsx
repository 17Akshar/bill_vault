/**
 * LoansDashboardScreen — UI with dummy data only (no API calls)
 * Matches reference design exactly.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Indian rupee format (no decimals) ───────────────────────────────────────
function fmtINR(n: number): string {
  const abs = Math.round(Math.abs(n));
  const s = abs.toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
}

// ─── Dummy data ───────────────────────────────────────────────────────────────
const SUMMARY = {
  totalOutstanding: 1245300,
  totalPaid:        1254700,
  totalInterest:     391580,
  monthlyEmi:         53350,
};

const LOANS = [
  {
    id:          '1',
    title:       'Home Loan - HDFC',
    lender:      'HDFC Bank',
    type:        'home',
    outstanding: 825000,
    emi:         32750,
    nextEmiDate: '18 May 2024',
    status:      'Active',
    paidPct:     55,
    color:       '#5B4FFF',
    icon:        'home' as const,
  },
  {
    id:          '2',
    title:       'Car Loan - SBI',
    lender:      'SBI Bank',
    type:        'car',
    outstanding: 315300,
    emi:         12750,
    nextEmiDate: '25 May 2024',
    status:      'Active',
    paidPct:     57,
    color:       '#22C55E',
    icon:        'car' as const,
  },
  {
    id:          '3',
    title:       'Personal Loan - ICICI',
    lender:      'ICICI Bank',
    type:        'personal',
    outstanding: 105000,
    emi:         7850,
    nextEmiDate: '10 Jun 2024',
    status:      'Active',
    paidPct:     58,
    color:       '#F97316',
    icon:        'person' as const,
  },
];

// ─── Stat card (one of 4 in summary row) ─────────────────────────────────────
const STAT_META = [
  { key: 'totalOutstanding', label: 'Total Outstanding', color: '#5B4FFF', iconName: 'trending-down-outline' },
  { key: 'totalPaid',        label: 'Total Paid',        color: '#22C55E', iconName: 'checkmark-circle-outline' },
  { key: 'totalInterest',    label: 'Total Interest',    color: '#F97316', iconName: 'calculator-outline' },
  { key: 'monthlyEmi',       label: 'Monthly EMI',       color: '#3B82F6', iconName: 'calendar-outline' },
] as const;

function StatCard({
  label, value, color, iconName, isLast, colors,
}: { label: string; value: number; color: string; iconName: string; isLast: boolean; colors: any }) {
  return (
    <View style={[st.wrap, !isLast && { borderRightWidth: 1, borderRightColor: colors.border }]}>
      <Text style={[st.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
      <Text style={[st.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {fmtINR(value)}
      </Text>
      <View style={[st.iconPill, { backgroundColor: color + '18' }]}>
        <Ionicons name={iconName as any} size={12} color={color} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:     { flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'flex-start' },
  label:    { fontSize: 10, fontWeight: '500', marginBottom: 6, lineHeight: 13 },
  value:    { fontSize: 14, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  iconPill: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── Loan card ────────────────────────────────────────────────────────────────
function LoanCard({ loan, colors, onPress }: { loan: typeof LOANS[0]; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      testID={`loan-card-${loan.id}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={[lc.card, { backgroundColor: colors.card }]}
    >
      {/* ── Row 1: icon + title + badge + menu ── */}
      <View style={lc.headerRow}>
        <View style={[lc.iconBox, { backgroundColor: loan.color + '22' }]}>
          <Ionicons name={loan.icon} size={26} color={loan.color} />
        </View>

        <View style={lc.titleBlock}>
          <Text style={[lc.titleText, { color: colors.text }]} numberOfLines={1}>
            {loan.title}
          </Text>
        </View>

        <View style={lc.badgeRow}>
          <View style={lc.activeBadge}>
            <Text style={lc.activeBadgeText}>{loan.status}</Text>
          </View>
          <TouchableOpacity
            testID={`loan-menu-${loan.id}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Row 2: Outstanding + EMI ── */}
      <View style={lc.statsRow}>
        <View style={lc.statBlock}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
          <Text style={lc.outstandingValue}>{fmtINR(loan.outstanding)}</Text>
        </View>
        <View style={[lc.statBlock, { alignItems: 'flex-end' }]}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>EMI Amount</Text>
          <Text style={[lc.emiValue, { color: colors.text }]}>{fmtINR(loan.emi)}</Text>
        </View>
      </View>

      {/* ── Row 3: Next EMI date + Progress ── */}
      <View style={lc.bottomRow}>
        <View style={lc.dateBlock}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>Next EMI Date</Text>
          <Text style={[lc.emiDateText, { color: colors.text }]}>{loan.nextEmiDate}</Text>
        </View>
        <View style={lc.progressBlock}>
          <Text style={[lc.pctText, { color: colors.textSecondary }]}>
            {loan.paidPct}% Completed
          </Text>
          <View style={[lc.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[lc.progressFill, { width: `${loan.paidPct}%` as any, backgroundColor: '#3B5BFF' }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const lc = StyleSheet.create({
  card: {
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  // Row 1
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox:      { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleBlock:   { flex: 1 },
  titleText:    { fontSize: 16, fontWeight: '700' },
  badgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge:  { backgroundColor: '#DCFCE7', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  activeBadgeText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  // Row 2
  statsRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBlock:        { gap: 4 },
  statLabel:        { fontSize: 11 },
  outstandingValue: { fontSize: 18, fontWeight: '800', color: '#5B4FFF' },
  emiValue:         { fontSize: 17, fontWeight: '600' },
  // Row 3
  bottomRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dateBlock:    { gap: 4 },
  emiDateText:  { fontSize: 14, fontWeight: '700' },
  progressBlock: { flex: 1, marginLeft: 20, alignItems: 'flex-end', gap: 5 },
  pctText:       { fontSize: 11 },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 5, borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoansDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [sortLabel] = useState('Next EMI Date');
  const [dateRange]  = useState('01 Apr 2024 – 30 Apr 2024');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>

      {/* ═══ HEADER ════════════════════════════════════════════════════════════ */}
      <View style={[s.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          testID="loans-back-btn"
          onPress={() => router.back()}
          style={s.headerIconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>Loans &amp; EMIs</Text>

        <TouchableOpacity
          testID="add-loan-btn"
          style={s.addLoanBtn}
          onPress={() => router.push('/loans/add' as any)}
        >
          <Ionicons name="add" size={15} color="#5B4FFF" />
          <Text style={s.addLoanText}>Add Loan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >

        {/* ═══ SUMMARY CARD ══════════════════════════════════════════════════ */}
        <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
          <View style={s.summaryRow}>
            {STAT_META.map((meta, i) => (
              <StatCard
                key={meta.key}
                label={meta.label}
                value={SUMMARY[meta.key]}
                color={meta.color}
                iconName={meta.iconName}
                isLast={i === STAT_META.length - 1}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* ═══ DATE FILTER ═══════════════════════════════════════════════════ */}
        <View style={[s.dateRow, { backgroundColor: colors.card }]}>
          <View style={s.dateLeft}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[s.dateText, { color: colors.text }]}>{dateRange}</Text>
            <Ionicons name="chevron-down" size={15} color={colors.textSecondary} />
          </View>
          <TouchableOpacity style={[s.filterIconBtn, { borderColor: colors.border }]}>
            <Ionicons name="funnel-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ═══ LOANS SECTION HEADER ══════════════════════════════════════════ */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Your Loans</Text>
          <TouchableOpacity style={s.sortBtn} testID="loans-sort-btn">
            <Text style={s.sortBtnText}>Sort: {sortLabel}</Text>
            <Ionicons name="swap-vertical" size={14} color="#5B4FFF" />
          </TouchableOpacity>
        </View>

        {/* ═══ LOAN CARDS ════════════════════════════════════════════════════ */}
        {LOANS.map(loan => (
          <LoanCard
            key={loan.id}
            loan={loan}
            colors={colors}
            onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.id } } as any)}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Screen-level styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 10,
  },
  headerIconBtn: { padding: 4 },
  headerTitle:   { flex: 1, fontSize: 20, fontWeight: '800' },
  addLoanBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1.5, borderColor: '#5B4FFF',
  },
  addLoanText: { color: '#5B4FFF', fontSize: 13, fontWeight: '700' },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  /* Summary card */
  summaryCard: {
    borderRadius: 18, marginBottom: 14,
    paddingHorizontal: 6, paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  summaryRow: { flexDirection: 'row' },

  /* Date filter */
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  dateText: { fontSize: 14, fontWeight: '500', flex: 1 },
  filterIconBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText:  { color: '#5B4FFF', fontSize: 13, fontWeight: '600' },
});

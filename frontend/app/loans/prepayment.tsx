/**
 * PrepaymentScreen — UI only with dummy calculations.
 * Matches the provided reference design exactly.
 * No backend integration.
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

// ─── Dummy seed data (matches reference design) ──────────────────────────────
const DUMMY = {
  loanName:           'Home Loan - HDFC',
  outstanding:        825000,
  emi:                32750,
  remainingMonths:    240,     // 20 years
  // Dummy scale factors calibrated so a ₹1,00,000 prepayment produces
  // values close to the reference design (Interest Saved ₹1,36,780,
  // New Tenure 17 Years 3 Months).
  interestSaveRatio:  1.3678,
  monthsSavedPerEmi:  11,
  emiReductionRatio:  0.04,    // ~4% EMI reduction per ₹1L
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  if (!isFinite(n) || isNaN(n)) n = 0;
  const sign = n < 0 ? '-' : '';
  const abs  = Math.round(Math.abs(n));
  const s    = abs.toString();
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${rest},${last3}`;
}

function fmtMonths(m: number): string {
  if (!isFinite(m) || m <= 0) return '—';
  const y  = Math.floor(m / 12);
  const mm = Math.round(m % 12);
  if (y === 0) return `${mm} Months`;
  if (mm === 0) return `${y} Years`;
  return `${y} Years ${mm} Months`;
}

function fmtMonthYear(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Reusable bits ────────────────────────────────────────────────────────────
function SummaryRow({
  label, value, valueColor, colors, isLast,
}: { label: string; value: string; valueColor?: string; colors: any; isLast?: boolean }) {
  return (
    <View style={[sr.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <Text style={[sr.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[sr.value, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:14 },
  label: { fontSize:14, fontWeight:'500' },
  value: { fontSize:14, fontWeight:'700' },
});

// ─── Option Card (Reduce Tenure / Reduce EMI) ────────────────────────────────
function OptionCard({
  selected, icon, title, subtitle, onPress, colors, testID,
}: {
  selected: boolean; icon: any; title: string; subtitle: string;
  onPress: () => void; colors: any; testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        oc.card,
        {
          borderColor:     selected ? '#5B4FFF' : colors.border,
          backgroundColor: selected ? '#5B4FFF0A' : colors.card,
        },
      ]}
    >
      {/* radio */}
      <View style={oc.radioRow}>
        <View style={[oc.radio, { borderColor: selected ? '#5B4FFF' : '#9CA3AF' }]}>
          {selected && <View style={oc.radioDot} />}
        </View>
        <View style={[oc.iconWrap, { backgroundColor: selected ? '#5B4FFF' : '#5B4FFF18' }]}>
          <Ionicons name={icon} size={18} color={selected ? '#FFF' : '#5B4FFF'} />
        </View>
      </View>

      <Text style={[oc.title, { color: selected ? '#5B4FFF' : colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[oc.sub, { color: colors.textSecondary }]} numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}
const oc = StyleSheet.create({
  card:     { flex:1, borderWidth:1.5, borderRadius:16, padding:14, gap:10, minHeight:130 },
  radioRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  radio:    {
    width:18, height:18, borderRadius:9, borderWidth:2,
    alignItems:'center', justifyContent:'center',
  },
  radioDot: { width:8, height:8, borderRadius:4, backgroundColor:'#5B4FFF' },
  iconWrap: { width:32, height:32, borderRadius:11, alignItems:'center', justifyContent:'center' },
  title:    { fontSize:14, fontWeight:'700' },
  sub:      { fontSize:11, lineHeight:15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PrepaymentScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Dummy state
  const [amount,     setAmount]     = useState('100000');
  const [prepayDate, setPrepayDate] = useState(new Date('2024-04-27'));
  const [option,     setOption]     = useState<'tenure' | 'emi'>('tenure');

  // ── Dummy calculations (proportional to prepayment) ──
  const calc = useMemo(() => {
    const prepay  = parseFloat((amount || '0').replace(/,/g, '')) || 0;
    const oldMonths = DUMMY.remainingMonths;

    // months saved scales with prepayment (~33 months saved for ₹1L on reference loan)
    const monthsSaved = Math.min(
      oldMonths,
      Math.round((prepay / DUMMY.emi) * DUMMY.monthsSavedPerEmi),
    );
    const newMonths   = option === 'tenure' ? Math.max(0, oldMonths - monthsSaved) : oldMonths;

    // EMI reduction scales linearly with prepayment (~4% reduction per ₹1L)
    const reductionPct = (prepay / 100000) * DUMMY.emiReductionRatio;
    const newEmi       = option === 'emi'
      ? Math.max(0, DUMMY.emi * (1 - Math.min(0.95, reductionPct)))
      : DUMMY.emi;

    // Interest saved (calibrated to match reference at ₹1L → ₹1,36,780)
    const interestSaved = Math.round(prepay * DUMMY.interestSaveRatio);

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (option === 'tenure' ? newMonths : oldMonths));

    return {
      interestSaved,
      newTenureMonths: option === 'tenure' ? newMonths : oldMonths,
      newEndDate:      endDate,
      newEmi,
      isEmiChanged:    option === 'emi',
      isTenureChanged: option === 'tenure',
    };
  }, [amount, option]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity
            testID="prepay-back"
            onPress={() => router.back()}
            style={s.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Prepayment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── Outstanding Balance card ── */}
          <View style={[s.balanceCard, { backgroundColor: '#5B4FFF0F', borderColor: '#5B4FFF28' }]}>
            <View style={s.balanceRow}>
              <View style={s.balanceIcon}>
                <Ionicons name="wallet-outline" size={20} color="#5B4FFF" />
              </View>
              <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
            </View>
            <Text style={s.balanceValue} testID="outstanding-balance">{fmtINR(DUMMY.outstanding)}</Text>
            <Text style={[s.balanceSub, { color: colors.textSecondary }]}>{DUMMY.loanName}</Text>
          </View>

          {/* ── Prepayment Details ── */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Prepayment Details</Text>
          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Prepayment Amount</Text>
              <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="cash-outline" size={16} color="#5B4FFF" />
                <Text style={[s.prefix, { color: colors.textSecondary }]}>₹</Text>
                <TextInput
                  testID="prepay-amount-input"
                  style={[s.input, { color: colors.text }]}
                  placeholder="1,00,000"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={s.col}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Prepayment Date</Text>
              <CrossPlatformPicker
                value={prepayDate}
                onChange={setPrepayDate}
                mode="date"
                label="Select Date"
                colors={colors}
              />
            </View>
          </View>

          {/* ── Choose an Option ── */}
          <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Choose an Option</Text>
          <View style={s.twoCol}>
            <OptionCard
              testID="option-tenure"
              selected={option === 'tenure'}
              icon="timer-outline"
              title="Reduce Tenure"
              subtitle="I want to reduce my loan tenure"
              onPress={() => setOption('tenure')}
              colors={colors}
            />
            <OptionCard
              testID="option-emi"
              selected={option === 'emi'}
              icon="repeat-outline"
              title="Reduce EMI"
              subtitle="I want to reduce my EMI amount"
              onPress={() => setOption('emi')}
              colors={colors}
            />
          </View>

          {/* ── Summary ── */}
          <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Summary</Text>
          <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SummaryRow
              label="Interest Saved"
              value={fmtINR(calc.interestSaved)}
              valueColor="#22C55E"
              colors={colors}
            />
            <SummaryRow
              label={calc.isTenureChanged ? 'New Tenure' : 'Tenure (Unchanged)'}
              value={fmtMonths(calc.newTenureMonths)}
              colors={colors}
            />
            <SummaryRow
              label="New End Date"
              value={fmtMonthYear(calc.newEndDate)}
              colors={colors}
            />
            <SummaryRow
              label={calc.isEmiChanged ? 'Updated EMI Amount' : 'EMI Amount (Unchanged)'}
              value={fmtINR(calc.newEmi)}
              colors={colors}
              isLast
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Footer / Proceed button ── */}
        <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            testID="prepay-proceed-btn"
            style={s.proceedBtn}
            activeOpacity={0.85}
          >
            <Text style={s.proceedText}>Proceed</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', marginRight: 40 },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

  /* Balance card */
  balanceCard: {
    borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 22,
  },
  balanceRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  balanceIcon:  {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#5B4FFF18',
    alignItems: 'center', justifyContent: 'center',
  },
  balanceLabel: { fontSize: 13, fontWeight: '500' },
  balanceValue: { fontSize: 30, fontWeight: '800', color: '#5B4FFF', marginBottom: 4, letterSpacing: -0.5 },
  balanceSub:   { fontSize: 12 },

  /* Section title */
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

  /* Fields */
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  col:    { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 7 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.2, borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 11, minHeight: 48,
  },
  prefix: { fontSize: 14, fontWeight: '600' },
  input:  { flex: 1, fontSize: 15 },

  /* Summary card */
  summaryCard: {
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1,
  },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24, borderTopWidth: 1,
  },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#5B4FFF', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#5B4FFF', shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  proceedText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

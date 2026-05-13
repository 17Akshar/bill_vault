/**
 * PrepaymentScreen
 * Matches the reference design: enter amount, choose Reduce Tenure / Reduce EMI,
 * see calculated interest savings, then confirm.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

function calcRemainingMonths(principal: number, emi: number, monthlyRate: number): number {
  if (monthlyRate <= 0 || emi <= 0 || principal <= 0) return 0;
  if (emi <= principal * monthlyRate) return 999;
  try {
    const n = -Math.log(1 - (principal * monthlyRate) / emi) / Math.log(1 + monthlyRate);
    return Math.max(0, Math.round(n));
  } catch { return 0; }
}

function calcNewEmi(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate <= 0) return months > 0 ? principal / months : 0;
  const r = monthlyRate;
  const n = months;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function formatMonths(months: number): string {
  if (months >= 999) return '—';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} Months`;
  if (m === 0) return `${y} Years`;
  return `${y} Yrs ${m} Months`;
}

export default function PrepaymentScreen() {
  const router = useRouter();
  const { loan_id } = useLocalSearchParams<{ loan_id: string }>();
  const { colors } = useTheme();

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [prepayDate, setPrepayDate] = useState(new Date());
  const [option, setOption] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!loan_id) return;
    api.get(`/loans/${loan_id}`)
      .then(r => setLoan(r.data))
      .catch(() => Alert.alert('Error', 'Failed to load loan'))
      .finally(() => setLoading(false));
  }, [loan_id]);

  // Derived calculations
  const outstanding = parseFloat(loan?.outstanding_amount || '0');
  const emi = parseFloat(loan?.emi_amount || '0');
  const annualRate = parseFloat(loan?.interest_rate || '0');
  const monthlyRate = annualRate / 100 / 12;
  const prepayAmount = parseFloat(amount.replace(/,/g, '') || '0');
  const newOutstanding = Math.max(0, outstanding - prepayAmount);

  const oldMonths = calcRemainingMonths(outstanding, emi, monthlyRate);
  const newMonths = option === 'reduce_tenure'
    ? calcRemainingMonths(newOutstanding, emi, monthlyRate)
    : oldMonths;
  const newEmi = option === 'reduce_emi'
    ? calcNewEmi(newOutstanding, monthlyRate, oldMonths)
    : emi;

  const oldTotalCost = oldMonths * emi;
  const newTotalCost = option === 'reduce_tenure' ? newMonths * emi : oldMonths * newEmi;
  const interestSaved = Math.max(0,
    (oldTotalCost - outstanding) - (newTotalCost - newOutstanding)
  );

  // New end date
  const newEndDate = (() => {
    const months = option === 'reduce_tenure' ? newMonths : oldMonths;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return months >= 999 ? '—' : `${d.toLocaleString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
  })();

  const handleProceed = async () => {
    if (!prepayAmount || prepayAmount <= 0) {
      Alert.alert('Invalid', 'Enter a valid prepayment amount'); return;
    }
    if (prepayAmount > outstanding) {
      Alert.alert('Invalid', 'Prepayment cannot exceed outstanding balance'); return;
    }
    setSaving(true);
    try {
      await api.post(`/loans/${loan_id}/prepayment`, {
        amount: prepayAmount,
        date: prepayDate.toISOString(),
        prepayment_type: option,
        notes: notes || null,
      });
      Alert.alert('Success', 'Prepayment recorded successfully', [
        { text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); } },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to record prepayment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity testID="prepay-back" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Prepayment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Outstanding Balance */}
        <View style={[s.balanceCard, { backgroundColor: '#6C47FF14' }]}>
          <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
          <Text style={s.balanceValue}>{formatINR(outstanding)}</Text>
          {loan?.name && (
            <Text style={[s.balanceName, { color: colors.textSecondary }]}>{loan.name}</Text>
          )}
        </View>

        {/* Prepayment Details */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Prepayment Details</Text>
          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Prepayment Amount</Text>
              <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="cash-outline" size={16} color="#6C47FF" />
                <TextInput
                  testID="prepay-amount"
                  style={[s.input, { color: colors.text }]}
                  placeholder="Enter amount"
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
                value={prepayDate} onChange={setPrepayDate}
                mode="date" label="Date" colors={colors}
              />
            </View>
          </View>
          {notes !== undefined && (
            <View style={{ marginTop: 12 }}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
              <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  placeholder="Add notes"
                  placeholderTextColor={colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          )}
        </View>

        {/* Choose Option */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Choose an Option</Text>
          <View style={s.optionRow}>
            {/* Reduce Tenure */}
            <TouchableOpacity
              testID="option-reduce-tenure"
              style={[s.optionCard, { borderColor: colors.border, backgroundColor: colors.background },
                option === 'reduce_tenure' && { borderColor: '#6C47FF', backgroundColor: '#6C47FF0A' }]}
              onPress={() => setOption('reduce_tenure')}
            >
              <View style={[s.optionRadio, option === 'reduce_tenure' && { borderColor: '#6C47FF' }]}>
                {option === 'reduce_tenure' && <View style={s.optionRadioDot} />}
              </View>
              <Ionicons name="timer-outline" size={22} color={option === 'reduce_tenure' ? '#6C47FF' : colors.textSecondary} />
              <Text style={[s.optionTitle, { color: option === 'reduce_tenure' ? '#6C47FF' : colors.text }]}>
                Reduce Tenure
              </Text>
              <Text style={[s.optionSubtitle, { color: colors.textSecondary }]}>
                I want to reduce my loan tenure
              </Text>
            </TouchableOpacity>

            {/* Reduce EMI */}
            <TouchableOpacity
              testID="option-reduce-emi"
              style={[s.optionCard, { borderColor: colors.border, backgroundColor: colors.background },
                option === 'reduce_emi' && { borderColor: '#6C47FF', backgroundColor: '#6C47FF0A' }]}
              onPress={() => setOption('reduce_emi')}
            >
              <View style={[s.optionRadio, option === 'reduce_emi' && { borderColor: '#6C47FF' }]}>
                {option === 'reduce_emi' && <View style={s.optionRadioDot} />}
              </View>
              <Ionicons name="repeat-outline" size={22} color={option === 'reduce_emi' ? '#6C47FF' : colors.textSecondary} />
              <Text style={[s.optionTitle, { color: option === 'reduce_emi' ? '#6C47FF' : colors.text }]}>
                Reduce EMI
              </Text>
              <Text style={[s.optionSubtitle, { color: colors.textSecondary }]}>
                I want to reduce my EMI amount
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        {prepayAmount > 0 && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Summary</Text>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Interest Saved</Text>
              <Text style={[s.summaryValue, { color: '#22C55E' }]}>{formatINR(interestSaved)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                {option === 'reduce_tenure' ? 'New Tenure' : 'New EMI Amount'}
              </Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {option === 'reduce_tenure' ? formatMonths(newMonths) : formatINR(newEmi)}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>New End Date</Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>{newEndDate}</Text>
            </View>
            <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                {option === 'reduce_tenure' ? 'EMI Amount (Unchanged)' : 'Tenure (Unchanged)'}
              </Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {option === 'reduce_tenure' ? formatINR(emi) : formatMonths(oldMonths)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Proceed Button */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="prepay-proceed-btn"
          style={[s.proceedBtn, saving && { opacity: 0.7 }]}
          onPress={handleProceed}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.proceedBtnText}>Proceed</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 120 },

  balanceCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  balanceLabel: { fontSize: 13, marginBottom: 4 },
  balanceValue: { fontSize: 26, fontWeight: '800', color: '#6C47FF', marginBottom: 4 },
  balanceName: { fontSize: 13 },

  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, gap: 8,
  },
  input: { flex: 1, fontSize: 15 },

  optionRow: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1, borderWidth: 1.5, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6,
  },
  optionRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  optionRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C47FF' },
  optionTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  optionSubtitle: { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.12)',
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1,
  },
  proceedBtn: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  proceedBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_TOTAL_BUDGET } from './_data';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const QUICK_AMOUNTS = [10000, 25000, 50000, 75000, 100000, 150000, 200000];

export default function SetTotalBudgetScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const tb = DUMMY_TOTAL_BUDGET;
  const [period, setPeriod] = useState<'monthly' | 'yearly'>(tb.period);
  const [amount, setAmount] = useState(tb.amount.toString());
  const [startMonth, setStartMonth] = useState('May');
  const [autoCarry, setAutoCarry] = useState(tb.auto_carry_forward);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const parsedAmt = parseFloat(amount) || 0;
  const yearlyEquiv = period === 'monthly' ? parsedAmt * 12 : parsedAmt;
  const monthlyEquiv = period === 'yearly' ? parsedAmt / 12 : parsedAmt;

  const handleSave = () => {
    if (!amount || parsedAmt <= 0) { Alert.alert('Required', 'Please enter a valid budget amount'); return; }
    Alert.alert(
      'Budget Updated',
      `Total ${period} budget set to ${formatINR(parsedAmt)}.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Set Total Budget</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Summary preview */}
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="wallet-outline" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {period === 'monthly' ? 'Monthly Budget' : 'Yearly Budget'}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {parsedAmt > 0 ? formatINR(parsedAmt) : '—'}
              </Text>
              {parsedAmt > 0 && (
                <Text style={[styles.summaryEquiv, { color: colors.textSecondary }]}>
                  ≈ {period === 'monthly' ? `${formatINR(yearlyEquiv)}/year` : `${formatINR(monthlyEquiv)}/month`}
                </Text>
              )}
            </View>
          </View>

          {/* Budget Period */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Period</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.periodRow}>
              {(['monthly', 'yearly'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodChip, { borderColor: colors.border }, period === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setPeriod(p)}
                >
                  <Ionicons
                    name={p === 'monthly' ? 'calendar-outline' : 'albums-outline'}
                    size={16}
                    color={period === p ? '#FFF' : colors.textSecondary}
                  />
                  <Text style={[styles.periodText, { color: period === p ? '#FFF' : colors.textSecondary }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Total Budget Amount */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Total Budget Amount
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickChip, { borderColor: colors.border }, amount === a.toString() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setAmount(a.toString())}
                  >
                    <Text style={[styles.quickText, { color: amount === a.toString() ? '#FFF' : colors.textSecondary }]}>
                      ₹{a >= 100000 ? `${a / 100000}L` : a >= 1000 ? `${a / 1000}K` : a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Start Month */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Start Month</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowMonthPicker(!showMonthPicker)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.fieldValue, { color: colors.text }]}>{startMonth} 2024</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            {showMonthPicker && (
              <View style={[styles.monthPicker, { backgroundColor: colors.background }]}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthItem, m === startMonth && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => { setStartMonth(m); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.monthText, { color: m === startMonth ? colors.primary : colors.text }]}>{m}</Text>
                    {m === startMonth && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Auto Carry Forward */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Auto Carry Forward</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                  Unspent budget carries over to the next month
                </Text>
              </View>
              <Switch
                value={autoCarry}
                onValueChange={setAutoCarry}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="save-outline" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Save Budget</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 18, marginBottom: 12 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '900' },
  summaryEquiv: { fontSize: 12, marginTop: 2 },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  periodRow: { flexDirection: 'row', gap: 10 },
  periodChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  periodText: { fontSize: 14, fontWeight: '600' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, height: 56,
  },
  rupee: { fontSize: 24, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickText: { fontSize: 13, fontWeight: '600' },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
    padding: 14, borderWidth: 1,
  },
  fieldValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  monthPicker: { borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  monthItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthText: { fontSize: 14, fontWeight: '500' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleDesc: { fontSize: 12, marginTop: 2 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

/**
 * LoanTransactionScreen
 * Shows EMI payment history and prepayments for a loan.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { format, parseISO, isValid } from 'date-fns';

function safeDate(v: any, fmt = 'dd MMM yyyy'): string {
  if (!v) return '—';
  try { const d = typeof v === 'string' ? parseISO(v) : v; return isValid(d) ? format(d, fmt) : '—'; }
  catch { return '—'; }
}

type TabKey = 'all' | 'emi' | 'prepayment';

export default function LoanTransactionScreen() {
  const router = useRouter();
  const { loan_id, loan_name, mode } = useLocalSearchParams<{
    loan_id: string; loan_name: string; mode?: string;
  }>();
  const { colors } = useTheme();

  const [tab, setTab] = useState<TabKey>('all');
  const [txns, setTxns] = useState<any[]>([]);
  const [prepays, setPrepays] = useState<any[]>([]);
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mark EMI modal
  const [showMarkEmi, setShowMarkEmi] = useState(mode === 'mark_emi');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiDate, setEmiDate] = useState(new Date());
  const [emiNotes, setEmiNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!loan_id) return;
    try {
      const [txnRes, loanRes] = await Promise.all([
        api.get(`/loans/${loan_id}/transactions`),
        api.get(`/loans/${loan_id}`),
      ]);
      setTxns(txnRes.data.transactions || []);
      setPrepays(txnRes.data.prepayments || []);
      setLoan(loanRes.data);
      if (loanRes.data?.emi_amount) setEmiAmount(String(loanRes.data.emi_amount));
    } catch { }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, [loan_id]));

  const handleMarkEmi = async () => {
    if (!emiAmount) { Alert.alert('Required', 'Enter EMI amount'); return; }
    setSaving(true);
    try {
      await api.post(`/loans/${loan_id}/transactions`, {
        amount: parseFloat(emiAmount),
        payment_date: emiDate.toISOString(),
        payment_type: 'emi',
        notes: emiNotes || null,
      });
      setShowMarkEmi(false);
      load();
      Alert.alert('Success', 'EMI payment marked as paid');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const allItems = [
    ...txns.map(t => ({ ...t, _kind: 'emi', _date: t.payment_date })),
    ...prepays.map(p => ({ ...p, _kind: 'prepay', _date: p.date })),
  ].sort((a, b) => new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime());

  const filtered = tab === 'all' ? allItems : allItems.filter(i => i._kind === (tab === 'emi' ? 'emi' : 'prepay'));

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'emi', label: 'EMI Payments' },
    { key: 'prepayment', label: 'Prepayments' },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity testID="txn-back" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {loan_name || 'Loan'} — History
        </Text>
        <TouchableOpacity
          testID="txn-mark-emi"
          style={s.addBtn}
          onPress={() => setShowMarkEmi(true)}
        >
          <Ionicons name="add" size={18} color="#6C47FF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            testID={`txn-tab-${t.key}`}
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, { color: tab === t.key ? '#6C47FF' : colors.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Row */}
      {loan && (
        <View style={[s.summaryStrip, { backgroundColor: colors.card }]}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Outstanding</Text>
            <Text style={[s.summaryValue, { color: '#EF4444' }]}>{formatINR(parseFloat(loan.outstanding_amount) || 0)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>EMI/month</Text>
            <Text style={[s.summaryValue, { color: '#6C47FF' }]}>{formatINR(parseFloat(loan.emi_amount) || 0)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[s.summaryValue, { color: colors.text }]}>{allItems.length}</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Tap + to mark an EMI as paid
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item._kind}-${idx}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isEmi = item._kind === 'emi';
            return (
              <View style={[s.txnCard, { backgroundColor: colors.card }]}>
                <View style={[s.txnIcon, { backgroundColor: isEmi ? '#22C55E18' : '#6C47FF18' }]}>
                  <Ionicons
                    name={isEmi ? 'checkmark-circle' : 'arrow-down-circle'}
                    size={22}
                    color={isEmi ? '#22C55E' : '#6C47FF'}
                  />
                </View>
                <View style={s.txnInfo}>
                  <Text style={[s.txnTitle, { color: colors.text }]}>
                    {isEmi ? 'EMI Payment' : 'Prepayment'}
                  </Text>
                  <Text style={[s.txnDate, { color: colors.textSecondary }]}>
                    {safeDate(item._date)}
                  </Text>
                  {item.notes && (
                    <Text style={[s.txnNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}
                  {item.interest_saved > 0 && (
                    <Text style={s.interestSaved}>
                      Saved {formatINR(item.interest_saved)} in interest
                    </Text>
                  )}
                </View>
                <Text style={[s.txnAmount, { color: isEmi ? '#22C55E' : '#6C47FF' }]}>
                  {formatINR(item.amount)}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Mark EMI Modal */}
      <Modal visible={showMarkEmi} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.card }]}>
            <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Mark EMI as Paid</Text>
              <TouchableOpacity onPress={() => setShowMarkEmi(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 14 }}>
              <View>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>EMI Amount</Text>
                <View style={[s.formInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[{ color: colors.textSecondary, marginRight: 4 }]}>₹</Text>
                  <TextInput
                    testID="mark-emi-amount"
                    style={[{ flex: 1, fontSize: 16, color: colors.text }]}
                    value={emiAmount}
                    onChangeText={setEmiAmount}
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
              <View>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Payment Date</Text>
                <CrossPlatformPicker
                  value={emiDate} onChange={setEmiDate}
                  mode="date" label="Payment Date" colors={colors}
                />
              </View>
              <TouchableOpacity
                testID="confirm-mark-emi"
                style={[s.markEmiBtn, saving && { opacity: 0.7 }]}
                onPress={handleMarkEmi}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.markEmiBtnText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  addBtn: { padding: 8 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6C47FF' },
  tabText: { fontSize: 13, fontWeight: '600' },
  summaryStrip: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 3 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(128,128,128,0.2)', marginVertical: 4 },
  txnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 10,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnTitle: { fontSize: 14, fontWeight: '600' },
  txnDate: { fontSize: 12, marginTop: 2 },
  txnNotes: { fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '700' },
  interestSaved: { color: '#22C55E', fontSize: 11, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 18, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  formLabel: { fontSize: 12, marginBottom: 6 },
  formInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  markEmiBtn: {
    backgroundColor: '#6C47FF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  markEmiBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

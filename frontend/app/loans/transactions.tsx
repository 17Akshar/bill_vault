/**
 * LoanTransactionScreen
 * ------------------------
 * Shows complete loan history:
 *  - EMI payments  (with principal / interest split + running outstanding)
 *  - Prepayments
 *  - Charges (processing fee + other charges derived from the loan record)
 *
 * Filter pills: All · EMI · Prepayment · Charges
 *
 * Each EMI row shows: Date · EMI amount · Principal paid · Interest paid · Outstanding balance
 *
 * Reuses (does NOT modify):
 *  - GET  /api/loans/{id}            loan record
 *  - GET  /api/loans/{id}/transactions  EMI + prepayment history
 *  - POST /api/loans/{id}/transactions  mark EMI paid
 *  - CrossPlatformPicker
 */
import React, { useState, useCallback, useMemo } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'emi' | 'prepayment' | 'charges';

type TxnItem =
  | {
      kind: 'emi';
      id: string;
      date: string;
      amount: number;
      principal: number;
      interest: number;
      outstanding: number;
      notes?: string | null;
    }
  | {
      kind: 'prepayment';
      id: string;
      date: string;
      amount: number;
      outstanding: number;
      prepayment_type?: string;
      interest_saved?: number;
      notes?: string | null;
    }
  | {
      kind: 'charges';
      id: string;
      date: string;
      amount: number;
      label: string;
      notes?: string | null;
    };

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'emi',        label: 'EMI' },
  { key: 'prepayment', label: 'Prepayment' },
  { key: 'charges',    label: 'Charges' },
];

// Per-kind colour + icon meta
const KIND_META: Record<TxnItem['kind'], { color: string; bg: string; icon: any; label: string }> = {
  emi:        { color: '#22C55E', bg: '#DCFCE7', icon: 'checkmark-circle', label: 'EMI Payment' },
  prepayment: { color: '#5B4FFF', bg: '#E0E0FF', icon: 'arrow-down-circle',label: 'Prepayment' },
  charges:    { color: '#F97316', bg: '#FEDFC9', icon: 'receipt',          label: 'Charges' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeDate(v: any, fmt = 'dd MMM yyyy'): string {
  if (!v) return '—';
  try {
    const d = typeof v === 'string' ? parseISO(v) : v;
    return isValid(d) ? format(d, fmt) : '—';
  } catch { return '—'; }
}

/**
 * Build the unified timeline with per-EMI principal / interest split.
 *  - Walks EMI + Prepayment events chronologically (oldest first).
 *  - Starts balance at `principal_amount`.
 *  - For each EMI:   interest = balance × monthlyRate, principal = amount − interest
 *  - For each prepay: balance -= amount
 *  - The final EMI rows are flipped into newest-first order for display.
 */
function buildTimeline(
  loan: any,
  rawTxns: any[],
  rawPrepays: any[],
): { rows: TxnItem[]; charges: TxnItem[] } {
  const principal     = parseFloat(loan?.principal_amount) || 0;
  const monthlyRate   = ((parseFloat(loan?.interest_rate) || 0) / 100) / 12;

  // Sort oldest -> newest for the running-balance pass
  const events: { type: 'emi' | 'prepayment'; raw: any; date: string }[] = [
    ...rawTxns.map(t => ({ type: 'emi' as const, raw: t, date: t.payment_date })),
    ...rawPrepays.map(p => ({ type: 'prepayment' as const, raw: p, date: p.date })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let balance = principal;
  const computed: TxnItem[] = [];

  for (const ev of events) {
    if (ev.type === 'emi') {
      const amt       = parseFloat(ev.raw.amount) || 0;
      // Prefer server-computed split (new schema). Fall back to local
      // amortisation walk for legacy rows that lack these fields.
      const serverHas = ev.raw.principal_paid != null && ev.raw.interest_paid != null;
      const interest      = serverHas
        ? Math.max(0, parseFloat(ev.raw.interest_paid) || 0)
        : Math.max(0, Math.min(amt, balance * monthlyRate));
      const principalPaid = serverHas
        ? Math.max(0, parseFloat(ev.raw.principal_paid) || 0)
        : Math.max(0, amt - interest);
      balance = ev.raw.outstanding_after != null
        ? Math.max(0, parseFloat(ev.raw.outstanding_after) || 0)
        : Math.max(0, balance - principalPaid);
      computed.push({
        kind: 'emi',
        id:   ev.raw.loan_txn_id || ev.raw.id || `emi-${ev.raw.payment_date}`,
        date: ev.raw.payment_date,
        amount: amt,
        principal: principalPaid,
        interest,
        outstanding: balance,
        notes: ev.raw.notes,
      });
    } else {
      const amt = parseFloat(ev.raw.amount) || 0;
      balance = Math.max(0, balance - amt);
      computed.push({
        kind: 'prepayment',
        id:   ev.raw.prepay_id || ev.raw.id || `prepay-${ev.raw.date}`,
        date: ev.raw.date,
        amount: amt,
        outstanding: balance,
        prepayment_type: ev.raw.prepayment_type,
        interest_saved:  parseFloat(ev.raw.interest_saved) || 0,
        notes: ev.raw.notes,
      });
    }
  }

  // Newest-first for display
  const rows = computed.reverse();

  // Charges from the loan record itself (one-time, on loan start date)
  const charges: TxnItem[] = [];
  const startDate = loan?.start_date || new Date().toISOString();
  const procFee   = parseFloat(loan?.processing_fee) || 0;
  const otherFee  = parseFloat(loan?.other_charges)  || 0;
  if (procFee > 0) {
    charges.push({
      kind: 'charges', id: 'charge-proc', date: startDate,
      amount: procFee, label: 'Processing Fee',
    });
  }
  if (otherFee > 0) {
    charges.push({
      kind: 'charges', id: 'charge-other', date: startDate,
      amount: otherFee, label: 'Other Charges',
    });
  }

  return { rows, charges };
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({
  label, active, onPress, colors, testID, count,
}: { label: string; active: boolean; onPress: () => void; colors: any; testID?: string; count?: number }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        fp.pill,
        active
          ? { backgroundColor: '#5B4FFF', borderColor: '#5B4FFF' }
          : { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[fp.text, { color: active ? '#FFF' : colors.text }]}>
        {label}{typeof count === 'number' ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}
const fp = StyleSheet.create({
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.2, marginRight: 8,
  },
  text: { fontSize: 13, fontWeight: '700' },
});

// ─── Stat (used in the small breakdown row inside each EMI card) ──────────────
function StatCell({ label, value, valueColor, colors }: any) {
  return (
    <View style={sc.cell}>
      <Text style={[sc.label, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text style={[sc.value, { color: valueColor || colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  cell:  { flex: 1, gap: 3 },
  label: { fontSize: 10, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '700' },
});

// ─── Transaction Card ────────────────────────────────────────────────────────
function TxnCard({ item, colors }: { item: TxnItem; colors: any }) {
  const meta = KIND_META[item.kind];

  return (
    <View style={[tc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Row 1 — icon + label + amount + date */}
      <View style={tc.headerRow}>
        <View style={[tc.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[tc.title, { color: colors.text }]} numberOfLines={1}>
            {item.kind === 'charges' ? (item as any).label : meta.label}
            {item.kind === 'prepayment' && (item as any).prepayment_type === 'reduce_emi' && (
              <Text style={[tc.subtag, { color: colors.textSecondary }]}>  · Reduce EMI</Text>
            )}
            {item.kind === 'prepayment' && (item as any).prepayment_type === 'reduce_tenure' && (
              <Text style={[tc.subtag, { color: colors.textSecondary }]}>  · Reduce Tenure</Text>
            )}
          </Text>
          <Text style={[tc.date, { color: colors.textSecondary }]} numberOfLines={1}>
            {safeDate(item.date)}
          </Text>
        </View>
        <Text style={[tc.amount, { color: meta.color }]} numberOfLines={1}>
          {formatINR(item.amount)}
        </Text>
      </View>

      {/* Row 2 — kind-specific breakdown */}
      {item.kind === 'emi' && (
        <View style={[tc.breakdown, { borderTopColor: colors.border }]}>
          <StatCell label="Principal" value={formatINR(item.principal)} valueColor="#22C55E" colors={colors} />
          <View style={[tc.divider, { backgroundColor: colors.border }]} />
          <StatCell label="Interest"  value={formatINR(item.interest)}  valueColor="#F97316" colors={colors} />
          <View style={[tc.divider, { backgroundColor: colors.border }]} />
          <StatCell label="Outstanding" value={formatINR(item.outstanding)} valueColor="#5B4FFF" colors={colors} />
        </View>
      )}

      {item.kind === 'prepayment' && (
        <View style={[tc.breakdown, { borderTopColor: colors.border }]}>
          <StatCell label="Outstanding"  value={formatINR(item.outstanding)} valueColor="#5B4FFF" colors={colors} />
          <View style={[tc.divider, { backgroundColor: colors.border }]} />
          <StatCell
            label="Interest Saved"
            value={(item as any).interest_saved > 0 ? formatINR((item as any).interest_saved) : '—'}
            valueColor="#22C55E"
            colors={colors}
          />
        </View>
      )}

      {item.kind === 'charges' && !!item.notes && (
        <View style={[tc.notesRow, { borderTopColor: colors.border }]}>
          <Text style={[tc.notes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>
        </View>
      )}
    </View>
  );
}
const tc = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:  {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  title:  { fontSize: 14, fontWeight: '700' },
  subtag: { fontSize: 11, fontWeight: '500' },
  date:   { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  breakdown: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 12, marginTop: 12, borderTopWidth: 1, gap: 8,
  },
  divider: { width: 1, height: 22, marginHorizontal: 4 },

  notesRow: { paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
  notes:    { fontSize: 12, fontStyle: 'italic' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoanTransactionScreen() {
  const router = useRouter();
  const { loan_id, loan_name, mode } = useLocalSearchParams<{
    loan_id: string; loan_name: string; mode?: string;
  }>();
  const { colors } = useTheme();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [loan,   setLoan]   = useState<any>(null);
  const [rawTxns,    setRawTxns]    = useState<any[]>([]);
  const [rawPrepays, setRawPrepays] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Mark EMI modal state
  const [showMarkEmi, setShowMarkEmi] = useState(mode === 'mark_emi');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiDate,   setEmiDate]   = useState(new Date());
  const [emiNotes,  setEmiNotes]  = useState('');
  const [saving,    setSaving]    = useState(false);

  // ── Load data ──
  const load = async () => {
    if (!loan_id) return;
    try {
      const [txnRes, loanRes] = await Promise.all([
        api.get(`/loans/${loan_id}/transactions`),
        api.get(`/loans/${loan_id}`),
      ]);
      setRawTxns(txnRes.data.transactions || []);
      setRawPrepays(txnRes.data.prepayments || []);
      setLoan(loanRes.data);
      if (loanRes.data?.emi_amount && !emiAmount) setEmiAmount(String(loanRes.data.emi_amount));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(useCallback(() => { load(); }, [loan_id]));

  // ── Build timeline ──
  const { rows, charges } = useMemo(
    () => buildTimeline(loan, rawTxns, rawPrepays),
    [loan, rawTxns, rawPrepays],
  );

  const counts = useMemo(() => ({
    all:        rows.length + charges.length,
    emi:        rows.filter(r => r.kind === 'emi').length,
    prepayment: rows.filter(r => r.kind === 'prepayment').length,
    charges:    charges.length,
  }), [rows, charges]);

  const items = useMemo(() => {
    let combined: TxnItem[] = [];
    switch (filter) {
      case 'emi':        combined = rows.filter(r => r.kind === 'emi'); break;
      case 'prepayment': combined = rows.filter(r => r.kind === 'prepayment'); break;
      case 'charges':    combined = [...charges]; break;
      default:           combined = [...rows, ...charges];
    }
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rows, charges, filter]);

  // ── Mark EMI ──
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
      setEmiNotes('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="txn-back" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {loan_name || 'Loan'} — History
          </Text>
          {loan?.lender && (
            <Text style={[s.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {loan.lender}
            </Text>
          )}
        </View>
        <TouchableOpacity
          testID="txn-mark-emi"
          style={s.markEmiHeaderBtn}
          onPress={() => setShowMarkEmi(true)}
        >
          <Ionicons name="add" size={14} color="#FFF" />
          <Text style={s.markEmiHeaderText}>Mark EMI</Text>
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {loan && (
        <View style={[s.summaryStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Outstanding</Text>
            <Text style={[s.summaryValue, { color: '#5B4FFF' }]} numberOfLines={1}>
              {formatINR(parseFloat(loan.outstanding_amount) || 0)}
            </Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>EMI / month</Text>
            <Text style={[s.summaryValue, { color: colors.text }]} numberOfLines={1}>
              {formatINR(parseFloat(loan.emi_amount) || 0)}
            </Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Entries</Text>
            <Text style={[s.summaryValue, { color: colors.text }]} numberOfLines={1}>{counts.all}</Text>
          </View>
        </View>
      )}

      {/* Filter pills */}
      <View style={s.filtersWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={f => f.key}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <FilterPill
              testID={`txn-filter-${item.key}`}
              label={item.label}
              count={counts[item.key]}
              active={filter === item.key}
              onPress={() => setFilter(item.key)}
              colors={colors}
            />
          )}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#5B4FFF" />
        </View>
      ) : items.length === 0 ? (
        <View style={s.empty} testID="txn-empty-state">
          <View style={s.emptyIcon}>
            <Ionicons name="receipt-outline" size={42} color="#5B4FFF" />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            {filter === 'all'
              ? 'Tap "Mark EMI" to record your first EMI payment.'
              : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} entries to show.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          renderItem={({ item }) => <TxnCard item={item} colors={colors} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Mark EMI Modal */}
      <Modal visible={showMarkEmi} transparent animationType="slide" onRequestClose={() => setShowMarkEmi(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowMarkEmi(false)} />
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
                <Text style={{ color: colors.textSecondary, marginRight: 4 }}>₹</Text>
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
            <View>
              <Text style={[s.formLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
              <View style={[s.formInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  testID="mark-emi-notes"
                  style={[{ flex: 1, fontSize: 14, color: colors.text }]}
                  value={emiNotes}
                  onChangeText={setEmiNotes}
                  placeholder="Add a note"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
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
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub:   { fontSize: 12, marginTop: 1 },
  markEmiHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 22, backgroundColor: '#5B4FFF',
  },
  markEmiHeaderText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  summaryStrip: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 4,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, borderWidth: 1,
  },
  summaryItem:    { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  summaryLabel:   { fontSize: 11, marginBottom: 4 },
  summaryValue:   { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  summaryDivider: { width: 1, marginVertical: 4 },

  filtersWrap: { paddingVertical: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#5B4FFF14',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  overlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.45)' },
  sheet:   {
    position:'absolute', bottom:0, left:0, right:0,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 30,
  },
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
    backgroundColor: '#5B4FFF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  markEmiBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

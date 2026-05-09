import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONT_WEIGHTS,
  SHADOWS,
} from '../constants/theme';
import { CurrencyInput } from '../components/CurrencyInput';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface LoanDetailScreenProps {
  navigation: any;
  route?: any;
}

interface Payment {
  _id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

interface LoanDetail {
  _id: string;
  person_name: string;
  type: 'lent' | 'borrowed';
  purpose: string;
  amount: number;
  total_paid: number;
  remaining_amount: number;
  start_date: string;
  due_date?: string;
  interest_rate: number;
  notes?: string;
  status: string;
  payments: Payment[];
}

const TABS = ['Overview', 'Payments', 'Notes'] as const;

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  active: { text: 'Active', color: '#03A9F4', bg: '#03A9F422' },
  partial: { text: 'Partially Repaid', color: COLORS.warning, bg: COLORS.warning + '22' },
  settled: { text: 'Fully Repaid', color: COLORS.success, bg: COLORS.success + '22' },
};

const METHOD_COLORS: Record<string, string> = {
  cash: COLORS.success,
  bank: '#03A9F4',
  upi: '#9C27B0',
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const LoanDetailScreen: React.FC<LoanDetailScreenProps> = ({ navigation, route }) => {
  const loanId: string = route?.params?.loanId;
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('USD');

  // Add payment modal state
  const [paymentModal, setPaymentModal] = useState(false);
  const [pAmount, setPAmount] = useState<number>(0);
  const [pDate, setPDate] = useState<Date>(new Date());
  const [pMethod, setPMethod] = useState<'cash' | 'bank' | 'upi'>('cash');
  const [pNotes, setPNotes] = useState('');
  const [showPDate, setShowPDate] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, b] = await Promise.all([api.getLoan(loanId), api.getBudget().catch(() => null)]);
      setLoan(l);
      if (b?.currency) setCurrency(b.currency);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = () => {
    Alert.alert('Delete loan?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteLoan(loanId);
            navigation?.goBack?.();
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          }
        },
      },
    ]);
  };

  const handleAddPayment = async () => {
    if (!pAmount || pAmount <= 0) {
      Alert.alert('Validation', 'Enter a valid amount.');
      return;
    }
    setSavingPayment(true);
    try {
      await api.addLoanPayment(loanId, {
        amount: Number(pAmount),
        date: pDate.toISOString(),
        method: pMethod,
        notes: pNotes.trim() || null,
      });
      setPaymentModal(false);
      setPAmount(0);
      setPNotes('');
      setPDate(new Date());
      setPMethod('cash');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = (pid: string) => {
    Alert.alert('Delete payment?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteLoanPayment(loanId, pid);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          }
        },
      },
    ]);
  };

  if (loading || !loan) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const isLent = loan.type === 'lent';
  const accent = isLent ? COLORS.success : COLORS.error;
  const statusInfo = STATUS_LABELS[loan.status] || STATUS_LABELS.active;
  const progress = loan.amount > 0 ? (loan.total_paid / loan.amount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {loan.person_name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: accent }]}>
            {loan.purpose} ({isLent ? 'Lent' : 'Borrowed'})
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            navigation?.navigate?.('AddLoan', { loan: loan })
          }
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'Overview' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Loan Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>
                    Amount {isLent ? 'Lent' : 'Borrowed'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: accent }]}>
                    {formatCurrency(loan.amount, currency)}
                  </Text>

                  <Text style={[styles.summaryLabel, { marginTop: SPACING.md }]}>
                    Amount {isLent ? 'Received' : 'Repaid'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    {formatCurrency(loan.total_paid, currency)}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Start Date</Text>
                  <Text style={styles.summaryValue}>{formatDate(loan.start_date)}</Text>

                  <Text style={[styles.summaryLabel, { marginTop: SPACING.md }]}>Due Date</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                    {formatDate(loan.due_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.remainingPill}>
                <Text style={styles.summaryLabel}>Remaining Amount</Text>
                <Text style={styles.remainingValue}>
                  {formatCurrency(loan.remaining_amount, currency)}
                </Text>
              </View>

              <View style={{ marginTop: SPACING.md }}>
                <ProgressBar progress={progress} height={8} color={accent} />
                <Text style={styles.progressText}>
                  {Math.round(progress)}% repaid
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.summaryLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.text}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.summaryLabel}>Interest</Text>
                <Text style={styles.summaryValue}>
                  {loan.interest_rate > 0 ? `${loan.interest_rate}%` : '0% (No Interest)'}
                </Text>
              </View>
            </View>

            {loan.payments.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Recent Payments</Text>
                  <TouchableOpacity onPress={() => setActiveTab('Payments')}>
                    <Text style={styles.viewAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                {loan.payments.slice(0, 3).map((p) => (
                  <View key={p._id} style={styles.paymentRow}>
                    <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
                    <Text style={[styles.paymentAmount, { color: COLORS.success }]}>
                      {formatCurrency(p.amount, currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={() => setPaymentModal(true)}
                activeOpacity={0.85}
              >
                <Feather name="credit-card" size={16} color={COLORS.primary} />
                <Text style={styles.actionBtnTextOutline}>Record Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnFilled]}
                onPress={handleDelete}
                activeOpacity={0.85}
              >
                <Feather name="trash-2" size={16} color={COLORS.white} />
                <Text style={styles.actionBtnTextFilled}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'Payments' && (
          <>
            <View style={styles.paymentTopRow}>
              <View style={[styles.miniCard, { backgroundColor: accent + '15' }]}>
                <Text style={styles.miniLabel}>
                  Total {isLent ? 'Lent' : 'Borrowed'}
                </Text>
                <Text style={[styles.miniValue, { color: accent }]}>
                  {formatCurrency(loan.amount, currency)}
                </Text>
              </View>
              <View style={[styles.miniCard, { backgroundColor: COLORS.primary + '15' }]}>
                <Text style={styles.miniLabel}>Remaining</Text>
                <Text style={[styles.miniValue, { color: COLORS.primary }]}>
                  {formatCurrency(loan.remaining_amount, currency)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Payment History</Text>
                <TouchableOpacity onPress={() => setPaymentModal(true)}>
                  <Text style={styles.viewAll}>+ Add Payment</Text>
                </TouchableOpacity>
              </View>
              {loan.payments.length === 0 ? (
                <Text style={styles.emptyText}>No payments yet</Text>
              ) : (
                loan.payments.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    style={styles.paymentItem}
                    onLongPress={() => handleDeletePayment(p._id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
                      {p.notes ? (
                        <Text style={styles.paymentNotes} numberOfLines={1}>
                          {p.notes}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.paymentAmount, { color: COLORS.success }]}>
                      {formatCurrency(p.amount, currency)}
                    </Text>
                    <View
                      style={[
                        styles.methodBadge,
                        { backgroundColor: (METHOD_COLORS[p.method] || COLORS.primary) + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          { color: METHOD_COLORS[p.method] || COLORS.primary },
                        ]}
                      >
                        {p.method.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={[styles.miniCard, { backgroundColor: COLORS.success + '15', marginTop: SPACING.md }]}>
              <Text style={styles.miniLabel}>Total {isLent ? 'Received' : 'Repaid'}</Text>
              <Text style={[styles.miniValue, { color: COLORS.success }]}>
                {formatCurrency(loan.total_paid, currency)}
              </Text>
            </View>
          </>
        )}

        {activeTab === 'Notes' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>
              {loan.notes && loan.notes.trim().length > 0
                ? loan.notes
                : 'No notes added.'}
            </Text>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal visible={paymentModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity
                onPress={() => setPaymentModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount*</Text>
            <CurrencyInput
              value={pAmount}
              onChangeValue={(v) => v >= 0 && setPAmount(v)}
              currency={currency}
            />

            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowPDate(true)}>
              <Text style={styles.dropdownText}>{formatDate(pDate.toISOString())}</Text>
              <Feather name="calendar" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {showPDate && (
              <DateTimePicker
                value={pDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowPDate(Platform.OS === 'ios');
                  if (d) setPDate(d);
                }}
              />
            )}

            <Text style={styles.label}>Method</Text>
            <View style={styles.methodRow}>
              {(['cash', 'bank', 'upi'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodPill,
                    pMethod === m && {
                      backgroundColor: (METHOD_COLORS[m] || COLORS.primary) + '22',
                      borderColor: METHOD_COLORS[m] || COLORS.primary,
                    },
                  ]}
                  onPress={() => setPMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodPillText,
                      pMethod === m && { color: METHOD_COLORS[m] || COLORS.primary },
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes (Optional)</Text>
            <View style={[styles.inputBox, { minHeight: 64 }]}>
              <TextInput
                value={pNotes}
                onChangeText={setPNotes}
                placeholder="Add notes..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                style={{ flex: 1, color: COLORS.textPrimary, textAlignVertical: 'top' }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, savingPayment && { opacity: 0.7 }]}
              onPress={handleAddPayment}
              disabled={savingPayment}
              activeOpacity={0.85}
            >
              {savingPayment ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: { fontSize: FONT_SIZES.xs, marginTop: 2 },
  editText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },
  scrollContent: { padding: SPACING.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  viewAll: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  summaryGrid: { flexDirection: 'row', marginTop: SPACING.sm },
  summaryCol: { flex: 1 },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  remainingPill: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  remainingValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginTop: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentDate: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  paymentAmount: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },
  paymentNotes: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  methodBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  methodText: { fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  actionBtnFilled: { backgroundColor: COLORS.error },
  actionBtnTextOutline: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
  },
  actionBtnTextFilled: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
  },
  paymentTopRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  miniCard: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  miniLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  miniValue: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, marginTop: 4 },
  notesText: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, lineHeight: 22 },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inputBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dropdownText: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  methodRow: { flexDirection: 'row', gap: SPACING.sm },
  methodPill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  methodPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  saveBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

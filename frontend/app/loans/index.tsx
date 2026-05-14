import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO, isValid } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Loan type metadata ────────────────────────────────────────────────────────
const LOAN_TYPES = [
  { key: 'home',      label: 'Home',      icon: 'home-outline',       color: '#448AFF' },
  { key: 'car',       label: 'Car',        icon: 'car-outline',        color: '#00E676' },
  { key: 'personal',  label: 'Personal',   icon: 'person-outline',     color: '#7C4DFF' },
  { key: 'education', label: 'Education',  icon: 'school-outline',     color: '#FFB300' },
  { key: 'gold',      label: 'Gold',       icon: 'diamond-outline',    color: '#FF9100' },
  { key: 'mortgage',  label: 'Mortgage',   icon: 'business-outline',   color: '#26C6DA' },
  { key: 'business',  label: 'Business',   icon: 'briefcase-outline',  color: '#EF5350' },
  { key: 'vehicle',   label: 'Vehicle',    icon: 'bicycle-outline',    color: '#66BB6A' },
  { key: 'other',     label: 'Other',      icon: 'ellipsis-horizontal', color: '#8E8EA0' },
];

const getLoanType = (key: string) => LOAN_TYPES.find(t => t.key === key) || LOAN_TYPES[8];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeDate(raw: any): Date | null {
  if (!raw) return null;
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return isValid(d) ? d : null;
  } catch { return null; }
}

function fmtDate(raw: any, fmt = 'd MMM yyyy') {
  const d = safeDate(raw);
  return d ? format(d, fmt) : '—';
}

function pct(v: number, total: number) {
  if (!total) return 0;
  return Math.min(Math.max((v / total) * 100, 0), 100);
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ progress, color, height = 8 }: { progress: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 800, useNativeDriver: false }).start();
  }, [progress]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <Animated.View
        style={{
          height, borderRadius: height / 2, backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ─── Mini stat pill ───────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 10, padding: 10, marginHorizontal: 3 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600', marginBottom: 3, letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 13, color, fontWeight: '700' }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Analytics row ────────────────────────────────────────────────────────────
function AnalyticsRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.aRow}>
      <Text style={[styles.aLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.aValue, { color: color || colors.text }]}>{value}</Text>
        {sub ? <Text style={[styles.aSub, { color: colors.textSecondary }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LoansScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', loan_type: 'home', lender_name: '', interest_rate: '',
    principal_amount: '', emi_amount: '', tenure_months: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // ── Data loading ──
  const load = useCallback(async () => {
    try {
      const res = await api.get('/loans');
      setLoans(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // ── Add loan ──
  const handleAdd = async () => {
    if (!form.name.trim() || !form.principal_amount || !form.tenure_months) {
      Alert.alert('Required', 'Enter loan name, principal amount and tenure');
      return;
    }
    setSaving(true);
    try {
      await api.post('/loans', {
        name: form.name.trim(),
        loan_type: form.loan_type,
        lender_name: form.lender_name.trim() || null,
        principal_amount: parseFloat(form.principal_amount),
        interest_rate: parseFloat(form.interest_rate) || 0,
        emi_amount: form.emi_amount ? parseFloat(form.emi_amount) : null, // auto-compute if blank
        tenure_months: parseInt(form.tenure_months),
        start_date: form.start_date,
        notes: form.notes.trim() || null,
      });
      setShowAdd(false);
      setForm({ name: '', loan_type: 'home', lender_name: '', interest_rate: '', principal_amount: '', emi_amount: '', tenure_months: '', start_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add loan');
    } finally { setSaving(false); }
  };

  const handleDelete = (loan: any) => {
    Alert.alert('Delete Loan', `Remove "${loan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/loans/${loan.loan_id}`); load(); }
          catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  // ── Summary aggregates ──
  const totalOutstanding = loans.reduce((s, l) => s + (l.outstanding_amount || 0), 0);
  const totalEMI = loans.reduce((s, l) => s + (l.emi_amount || 0), 0);
  const totalPrincipal = loans.reduce((s, l) => s + (l.principal_amount || 0), 0);
  const avgCompletion = loans.length
    ? loans.reduce((s, l) => {
        const paid = (l.principal_amount || 0) - (l.outstanding_amount || 0);
        return s + pct(paid, l.principal_amount || 1);
      }, 0) / loans.length
    : 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="loans-back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Loans & EMIs</Text>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          data-testid="loans-add-btn"
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={loans}
        keyExtractor={i => i.loan_id}
        contentContainerStyle={[styles.listContent, loans.length === 0 && styles.emptyContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loans.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              {/* ── Portfolio summary card ── */}
              <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                <View style={styles.summaryTop}>
                  <View>
                    <Text style={styles.summaryCardLabel}>Total Outstanding</Text>
                    <Text style={styles.summaryCardValue}>{formatINR(totalOutstanding)}</Text>
                  </View>
                  <View style={[styles.summaryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{loans.length} Loan{loans.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatLabel}>Monthly EMI</Text>
                    <Text style={styles.summaryStatValue}>{formatINR(totalEMI)}</Text>
                  </View>
                  <View style={[styles.summaryStatDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatLabel}>Total Principal</Text>
                    <Text style={styles.summaryStatValue}>{formatINR(totalPrincipal)}</Text>
                  </View>
                  <View style={[styles.summaryStatDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatLabel}>Avg. Repaid</Text>
                    <Text style={styles.summaryStatValue}>{avgCompletion.toFixed(0)}%</Text>
                  </View>
                </View>
                {/* Overall progress */}
                <View style={{ marginTop: 14 }}>
                  <ProgressBar progress={pct(totalPrincipal - totalOutstanding, totalPrincipal)} color="rgba(255,255,255,0.85)" height={6} />
                </View>
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>YOUR LOANS</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <LoanCard
          loan={item}
          colors={colors}
          isDark={isDark}
          onDelete={() => handleDelete(item)}
          onViewDetail={() => router.push(`/loans/${item.loan_id}` as any)}
          onRemind={() => router.push({ pathname: '/reminders', params: { type: 'loan_emi', related_id: item.loan_id, title: `${item.name} EMI`, description: `EMI: ${formatINR(item.emi_amount)}` } } as any)}
        />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="document-text-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Loans Added</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Track your home, car, personal loans and monitor repayment progress</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyAddText}>Add Your First Loan</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Add Loan Modal ── */}
      <AddLoanModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
        saving={saving}
        form={form}
        setForm={setForm}
        colors={colors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ─── Loan Card Component ──────────────────────────────────────────────────────
function LoanCard({ loan, colors, isDark, onDelete, onViewDetail, onRemind }: any) {
  const lt = getLoanType(loan.loan_type);
  const principal = loan.principal_amount || 0;
  const outstanding = loan.outstanding_amount || 0;
  const paid = principal - outstanding;
  const progress = pct(paid, principal);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#bbb' }]}
      onPress={onViewDetail}
      activeOpacity={0.88}
      testID={`loan-card-${loan.loan_id}`}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.loanIcon, { backgroundColor: lt.color + '22' }]}>
          <Ionicons name={lt.icon as any} size={22} color={lt.color} />
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={[styles.loanName, { color: colors.text }]} numberOfLines={1}>{loan.name}</Text>
          <Text style={[styles.loanMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {lt.label}{loan.lender_name ? ` · ${loan.lender_name}` : ''} · {loan.interest_rate}% p.a.
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status, lt.color) + '22' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(loan.status, lt.color) }]}>{loan.status || 'active'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </View>

      {/* Primary metrics row */}
      <View style={styles.metricsRow}>
        <StatPill label="Outstanding" value={formatINR(outstanding)} color="#FF5252" bg="rgba(255,82,82,0.1)" />
        <StatPill label="EMI / Month" value={formatINR(loan.emi_amount)} color="#FFB300" bg="rgba(255,179,0,0.1)" />
        <StatPill label="Repaid" value={`${progress.toFixed(0)}%`} color={colors.success} bg={colors.success + '18'} />
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 12, marginBottom: 6 }}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Paid {formatINR(paid)}</Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{loan.tenure_months - (loan.emis_paid || 0)} months left</Text>
        </View>
        <ProgressBar progress={progress} color={lt.color} height={7} />
      </View>

      {/* Next EMI date */}
      {loan.next_emi_date && (
        <View style={[styles.nextEMIRow, { borderTopColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.nextEMIText, { color: colors.textSecondary }]}>
            Next EMI: <Text style={{ color: colors.text, fontWeight: '600' }}>{fmtDate(loan.next_emi_date)}</Text>
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={e => { e.stopPropagation?.(); onRemind(); }} style={[styles.remindBtn, { borderColor: colors.primary + '55' }]} testID={`loan-remind-${loan.loan_id}`}>
            <Ionicons name="notifications-outline" size={12} color={colors.primary} />
            <Text style={[styles.remindText, { color: colors.primary }]}>Remind</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Card actions */}
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.cardAction} onPress={e => { e.stopPropagation?.(); onDelete(); }} testID={`loan-delete-${loan.loan_id}`}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
          <Text style={[styles.cardActionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
        <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.cardAction} onPress={onViewDetail}>
          <Ionicons name="analytics-outline" size={15} color={colors.primary} />
          <Text style={[styles.cardActionText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Analytics panel ─────────────────────────────────────────────────────────
function AnalyticsPanel({ data, lt, colors, isDark }: any) {
  const completionPct = data.completion_percentage || 0;
  const emiInfo = data.emi_tracking || {};
  const prepayInfo = data.prepayment_impact || {};
  const breakdown = data.payment_breakdown || {};

  return (
    <View>
      {/* Completion progress */}
      <View style={[styles.analyticsSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 14, marginBottom: 14 }]}>
        <View style={styles.completionHeader}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Loan Completion</Text>
          <Text style={[styles.completionPct, { color: lt.color }]}>{completionPct.toFixed(1)}%</Text>
        </View>
        <ProgressBar progress={completionPct} color={lt.color} height={10} />
        <View style={styles.completionStats}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.cStatVal, { color: colors.success }]}>{formatINR(data.principal_paid || 0)}</Text>
            <Text style={[styles.cStatLabel, { color: colors.textSecondary }]}>Principal Paid</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.cStatVal, { color: '#FF5252' }]}>{formatINR(data.outstanding_balance || 0)}</Text>
            <Text style={[styles.cStatLabel, { color: colors.textSecondary }]}>Outstanding</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.cStatVal, { color: colors.text }]}>{emiInfo.emis_remaining || 0}</Text>
            <Text style={[styles.cStatLabel, { color: colors.textSecondary }]}>EMIs Left</Text>
          </View>
        </View>
      </View>

      {/* Interest analytics */}
      <SectionLabel title="INTEREST ANALYTICS" colors={colors} />
      <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
        <AnalyticsRow label="Interest Paid" value={formatINR(data.interest_paid || 0)} color={colors.danger} />
        <Divider colors={colors} />
        <AnalyticsRow label="Interest Remaining" value={formatINR(data.interest_remaining || 0)} color="#FF9100" />
        <Divider colors={colors} />
        <AnalyticsRow
          label="Original Total Interest"
          value={formatINR(data.original_total_interest || 0)}
          color={colors.textSecondary}
        />
        <Divider colors={colors} />
        <AnalyticsRow
          label="Interest Saved"
          value={`${formatINR(data.interest_saved || 0)}`}
          sub={prepayInfo.total_prepayments_count > 0 ? 'via prepayments' : 'no prepayments yet'}
          color={data.interest_saved > 0 ? colors.success : colors.textSecondary}
        />
      </View>

      {/* EMI tracking */}
      <SectionLabel title="EMI TRACKING" colors={colors} />
      <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
        <AnalyticsRow label="EMI Amount" value={formatINR(emiInfo.emi_amount || 0)} />
        <Divider colors={colors} />
        <AnalyticsRow label="EMIs Completed" value={`${emiInfo.emis_paid || 0} of ${emiInfo.tenure_months || 0}`} color={colors.success} />
        <Divider colors={colors} />
        <AnalyticsRow label="EMIs Remaining" value={`${emiInfo.emis_remaining || 0} months`} color="#FF9100" />
        <Divider colors={colors} />
        <AnalyticsRow label="Next EMI Due" value={fmtDate(emiInfo.next_emi_date)} color={colors.primary} />
      </View>

      {/* Payment breakdown */}
      <SectionLabel title="PAYMENT BREAKDOWN" colors={colors} />
      <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
        <AnalyticsRow label="Total Paid So Far" value={formatINR(breakdown.total_paid || 0)} />
        <Divider colors={colors} />
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { flex: breakdown.principal_pct || 50, backgroundColor: lt.color }]} />
          <View style={[styles.breakdownFill, { flex: breakdown.interest_pct || 50, backgroundColor: colors.danger }]} />
        </View>
        <View style={styles.breakdownLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: lt.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Principal {(breakdown.principal_pct || 0).toFixed(0)}%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Interest {(breakdown.interest_pct || 0).toFixed(0)}%</Text>
          </View>
        </View>
        <Divider colors={colors} />
        <AnalyticsRow label="Total Loan Cost" value={formatINR(data.total_loan_cost || 0)} color={colors.textSecondary} />
      </View>

      {/* Prepayment impact */}
      {prepayInfo.total_prepayments_count > 0 && (
        <>
          <SectionLabel title="PREPAYMENT IMPACT" colors={colors} />
          <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
            <AnalyticsRow label="Total Prepaid" value={formatINR(prepayInfo.total_prepaid_amount || 0)} color={colors.success} />
            <Divider colors={colors} />
            <AnalyticsRow label="Prepayments Made" value={`${prepayInfo.total_prepayments_count}`} />
            <Divider colors={colors} />
            <AnalyticsRow label="Penalty Paid" value={formatINR(prepayInfo.penalty_paid || 0)} color={colors.danger} />
            <Divider colors={colors} />
            <AnalyticsRow label="Tenure Saved" value={`${prepayInfo.tenure_saved_months || 0} months`} color={colors.success} />
            <Divider colors={colors} />
            <AnalyticsRow label="Interest Saved" value={formatINR(data.interest_saved || 0)} color={colors.success} />
          </View>
        </>
      )}
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />;
}

function getStatusColor(status: string, fallback: string) {
  if (status === 'closed' || status === 'prepaid') return '#22C55E';
  if (status === 'defaulted') return '#EF4444';
  if (status === 'transferred') return '#FFB300';
  return fallback;
}

// ─── Add Loan Modal ───────────────────────────────────────────────────────────
function AddLoanModal({ visible, onClose, onSave, saving, form, setForm, colors, isDark }: any) {
  const fields = [
    { label: 'Loan Name *', key: 'name', placeholder: 'e.g. SBI Home Loan', kb: 'default' },
    { label: 'Lender / Bank', key: 'lender_name', placeholder: 'e.g. State Bank of India', kb: 'default' },
    { label: 'Principal Amount *', key: 'principal_amount', placeholder: '5000000', kb: 'decimal-pad', pre: '₹' },
    { label: 'Interest Rate (% p.a.)', key: 'interest_rate', placeholder: '8.5', kb: 'decimal-pad' },
    { label: 'Tenure (months) *', key: 'tenure_months', placeholder: '240', kb: 'numeric' },
    { label: 'EMI Amount', key: 'emi_amount', placeholder: 'Leave blank to auto-compute', kb: 'decimal-pad', pre: '₹' },
    { label: 'Start Date', key: 'start_date', placeholder: 'YYYY-MM-DD', kb: 'default' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Loan</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} data-testid="add-loan-close">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Loan type selector */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Loan Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.typeRow}>
                {LOAN_TYPES.map(lt => (
                  <TouchableOpacity
                    key={lt.key}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      form.loan_type === lt.key && { borderColor: lt.color, backgroundColor: lt.color + '18' },
                    ]}
                    onPress={() => setForm((p: any) => ({ ...p, loan_type: lt.key }))}
                    data-testid={`loan-type-${lt.key}`}
                  >
                    <Ionicons name={lt.icon as any} size={16} color={form.loan_type === lt.key ? lt.color : colors.textSecondary} />
                    <Text style={[styles.typeLabel, { color: form.loan_type === lt.key ? lt.color : colors.textSecondary }]}>{lt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Form fields */}
            {fields.map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {f.pre && <Text style={[styles.fieldPrefix, { color: colors.textSecondary }]}>{f.pre}</Text>}
                  <TextInput
                    style={[styles.fieldText, { color: colors.text }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    value={(form as any)[f.key]}
                    onChangeText={(v: string) => setForm((p: any) => ({ ...p, [f.key]: v }))}
                    keyboardType={f.kb as any}
                    data-testid={`loan-field-${f.key}`}
                  />
                </View>
              </View>
            ))}

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.notesInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                placeholder="Add any notes…"
                placeholderTextColor={colors.textSecondary}
                value={form.notes}
                onChangeText={(v: string) => setForm((p: any) => ({ ...p, notes: v }))}
                multiline
                numberOfLines={3}
                data-testid="loan-field-notes"
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>EMI will be auto-computed from principal, rate and tenure if left blank.</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={saving}
              data-testid="loan-save-btn"
            >
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveButtonText}>Add Loan</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  emptyContent: { flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, marginLeft: 2 },

  // Summary card
  summaryCard: { borderRadius: 18, padding: 20, marginBottom: 6 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  summaryCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  summaryCardValue: { fontSize: 28, color: '#FFF', fontWeight: '800', letterSpacing: -0.5 },
  summaryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryDivider: { height: 1, marginBottom: 14 },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 3 },
  summaryStatValue: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  summaryStatDivider: { width: 1, height: 28 },

  // Loan card
  card: {
    borderRadius: 16, marginBottom: 14, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  loanIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardHeaderInfo: { flex: 1, marginRight: 8 },
  loanName: { fontSize: 16, fontWeight: '700', marginBottom: 3, letterSpacing: -0.2 },
  loanMeta: { fontSize: 12, lineHeight: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Metrics
  metricsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12 },

  // Progress
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, fontWeight: '500' },

  // Next EMI
  nextEMIRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  nextEMIText: { fontSize: 12 },
  remindBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  remindText: { fontSize: 11, fontWeight: '600' },

  // Card actions
  cardActions: { flexDirection: 'row', borderTopWidth: 1 },
  cardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  actionDivider: { width: 1 },

  // Analytics panel
  analyticsPanel: { borderTopWidth: 1, padding: 16 },
  analyticsLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  analyticsTitle: { fontSize: 14, fontWeight: '700' },
  analyticsSection: {},

  // Completion
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  completionPct: { fontSize: 22, fontWeight: '800' },
  completionStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  cStatVal: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  cStatLabel: { fontSize: 11, fontWeight: '500' },

  // Analytics rows
  analyticsCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  aRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  aLabel: { fontSize: 13, fontWeight: '500' },
  aValue: { fontSize: 14, fontWeight: '700' },
  aSub: { fontSize: 10, marginTop: 2 },
  rowDivider: { height: 1, marginLeft: 14 },

  // Breakdown bar
  breakdownBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
  breakdownFill: { height: 8 },
  breakdownLegend: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyAddText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },

  // Form
  typeRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  typeLabel: { fontSize: 12, fontWeight: '600' },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 7 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  fieldPrefix: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  fieldText: { flex: 1, fontSize: 15 },
  notesInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  saveButton: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});

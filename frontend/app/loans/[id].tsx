import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView,
  Platform, FlatList, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO, isValid } from 'date-fns';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Shared helpers ────────────────────────────────────────────────────────────
const LOAN_TYPES = [
  { key: 'home',      label: 'Home',      icon: 'home-outline',       color: '#448AFF' },
  { key: 'car',       label: 'Car',        icon: 'car-outline',        color: '#00E676' },
  { key: 'personal',  label: 'Personal',   icon: 'person-outline',     color: '#7C4DFF' },
  { key: 'education', label: 'Education',  icon: 'school-outline',     color: '#FFB300' },
  { key: 'gold',      label: 'Gold',       icon: 'diamond-outline',    color: '#FF9100' },
  { key: 'mortgage',  label: 'Mortgage',   icon: 'business-outline',   color: '#26C6DA' },
  { key: 'business',  label: 'Business',   icon: 'briefcase-outline',  color: '#EF5350' },
  { key: 'vehicle',   label: 'Vehicle',    icon: 'bicycle-outline',    color: '#66BB6A' },
  { key: 'other',     label: 'Other',      icon: 'ellipsis-horizontal',color: '#8E8EA0' },
];
const getLT = (key: string) => LOAN_TYPES.find(t => t.key === key) || LOAN_TYPES[8];

function safeDate(raw: any): Date | null {
  if (!raw) return null;
  try { const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw); return isValid(d) ? d : null; }
  catch { return null; }
}
const fmtDate = (raw: any, fmt = 'd MMM yyyy') => { const d = safeDate(raw); return d ? format(d, fmt) : '—'; };
const clamp  = (v: number, lo = 0, hi = 100) => Math.min(Math.max(v, lo), hi);
const pct    = (v: number, t: number) => t ? clamp((v / t) * 100) : 0;

// ─── Reusable micro-components ─────────────────────────────────────────────────
function ProgressBar({ progress, color, height = 8 }: { progress: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: progress, duration: 900, useNativeDriver: false }).start(); }, [progress]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

function InfoRow({ label, value, valueColor, colors }: any) {
  return (
    <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor || colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title, colors }: any) {
  return <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>;
}

function Divider({ colors }: any) {
  return <View style={[{ height: 1, backgroundColor: colors.border }]} />;
}

// ─── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'EMI Schedule', 'Prepayments'];

// ─── Status helpers ────────────────────────────────────────────────────────────
function emiStatusColor(status: string, colors: any) {
  if (status === 'paid')    return colors.success;
  if (status === 'overdue') return colors.danger;
  if (status === 'skipped') return colors.textSecondary;
  return colors.warning;
}
function emiStatusBg(status: string) {
  if (status === 'paid')    return 'rgba(34,197,94,0.12)';
  if (status === 'overdue') return 'rgba(239,68,68,0.12)';
  if (status === 'skipped') return 'rgba(142,142,160,0.12)';
  return 'rgba(245,158,11,0.12)';
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function LoanDetailScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();

  const [loan,        setLoan]        = useState<any>(null);
  const [analytics,   setAnalytics]   = useState<any>(null);
  const [schedule,    setSchedule]    = useState<any[]>([]);
  const [prepayments, setPrepayments] = useState<any[]>([]);
  const [amortization, setAmortization] = useState<any[]>([]);

  const [loading,  setLoading]  = useState(true);
  const [tabIdx,   setTabIdx]   = useState(0);
  const [schedPage, setSchedPage] = useState(0); // pagination for amortization table
  const PAGE_SIZE = 24;

  // Modal states
  const [showEMIPay,    setShowEMIPay]    = useState(false);
  const [showPrepay,    setShowPrepay]    = useState(false);
  const [selectedEMI,   setSelectedEMI]   = useState<any>(null);
  const [showAmort,     setShowAmort]     = useState(false);
  const [saving,        setSaving]        = useState(false);

  // EMI payment form
  const [emiForm, setEmiForm] = useState({
    amount: '', payment_method: 'bank_transfer', reference_number: '', transaction_date: new Date().toISOString().split('T')[0], notes: '',
  });

  // Prepayment form
  const [prepForm, setPrepForm] = useState({
    amount: '', prepayment_type: 'part_prepayment', adjustment_type: 'reduce_tenure',
    penalty_rate: '0', payment_method: 'bank_transfer', reference_number: '',
    payment_date: new Date().toISOString().split('T')[0], notes: '',
  });

  // ── Load data ──
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [loanRes, analyticsRes, schedRes, prepRes] = await Promise.all([
        api.get(`/loans/${id}`),
        api.get(`/loans/${id}/analytics`),
        api.get(`/loans/${id}/emi-schedule`),
        api.get(`/loans/${id}/prepayments`),
      ]);
      setLoan(loanRes.data);
      setAnalytics(analyticsRes.data);
      setSchedule(schedRes.data || []);
      setPrepayments(prepRes.data || []);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load loan details');
      router.back();
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadAmortization = useCallback(async () => {
    if (!id || amortization.length) return;
    try {
      const res = await api.get(`/loans/${id}/amortization`);
      setAmortization(res.data.schedule || []);
    } catch (e) { console.error(e); }
  }, [id, amortization]);

  // ── Record EMI Payment ──
  const handleRecordEMI = async () => {
    if (!emiForm.amount) { Alert.alert('Required', 'Enter the payment amount'); return; }
    setSaving(true);
    try {
      await api.post(`/loans/${id}/transactions`, {
        transaction_type: 'emi',
        transaction_date: emiForm.transaction_date,
        amount: parseFloat(emiForm.amount),
        emi_number: selectedEMI?.emi_number || null,
        emi_reminder_id: selectedEMI?.emi_reminder_id || null,
        payment_method: emiForm.payment_method,
        reference_number: emiForm.reference_number || null,
        notes: emiForm.notes || null,
      });
      // Mark the EMI reminder as paid if we have one
      if (selectedEMI?.emi_reminder_id) {
        await api.put(`/emi-reminders/${selectedEMI.emi_reminder_id}`, {
          status: 'paid',
          paid_date: emiForm.transaction_date,
          paid_amount: parseFloat(emiForm.amount),
        }).catch(() => {}); // non-blocking
      }
      setShowEMIPay(false);
      setEmiForm({ amount: '', payment_method: 'bank_transfer', reference_number: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' });
      setSelectedEMI(null);
      setAmortization([]); // force reload
      load();
      Alert.alert('Recorded', 'EMI payment recorded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  // ── Record Prepayment ──
  const handleRecordPrepay = async () => {
    if (!prepForm.amount) { Alert.alert('Required', 'Enter the prepayment amount'); return; }
    setSaving(true);
    try {
      await api.post(`/loans/${id}/prepayments`, {
        payment_date: prepForm.payment_date,
        amount: parseFloat(prepForm.amount),
        prepayment_type: prepForm.prepayment_type,
        adjustment_type: prepForm.adjustment_type,
        penalty_rate: parseFloat(prepForm.penalty_rate) || 0,
        payment_method: prepForm.payment_method,
        reference_number: prepForm.reference_number || null,
        notes: prepForm.notes || null,
      });
      setShowPrepay(false);
      setPrepForm({ amount: '', prepayment_type: 'part_prepayment', adjustment_type: 'reduce_tenure', penalty_rate: '0', payment_method: 'bank_transfer', reference_number: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
      Alert.alert('Recorded', 'Prepayment recorded. Loan balance updated.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to record prepayment');
    } finally { setSaving(false); }
  };

  // ── Delete prepayment ──
  const handleDeletePrepay = (pid: string) => {
    Alert.alert('Delete Prepayment', 'This will reverse the balance update on this loan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/loan-prepayments/${pid}`); load(); }
        catch { Alert.alert('Error', 'Failed to delete prepayment'); }
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!loan) return null;
  const lt        = getLT(loan.loan_type);
  const principal = loan.principal_amount || 0;
  const outstanding = loan.outstanding_amount || 0;
  const completion  = analytics?.completion_percentage || pct(principal - outstanding, principal);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="loan-detail-back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[s.headerIcon, { backgroundColor: lt.color + '22' }]}>
          <Ionicons name={lt.icon as any} size={18} color={lt.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{loan.name}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {lt.label}{loan.lender_name ? ` · ${loan.lender_name}` : ''} · {loan.interest_rate}% p.a.
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: lt.color + '22' }]}>
          <Text style={[s.statusText, { color: lt.color }]}>{(loan.status || 'active').toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Hero card ── */}
      <View style={[s.heroCard, { backgroundColor: lt.color }]}>
        <Text style={s.heroLabel}>Outstanding Balance</Text>
        <Text style={s.heroValue}>{formatINR(outstanding)}</Text>
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <ProgressBar progress={completion} color="rgba(255,255,255,0.9)" height={8} />
        </View>
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{completion.toFixed(1)}%</Text>
            <Text style={s.heroStatLabel}>Repaid</Text>
          </View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{formatINR(loan.emi_amount || 0)}</Text>
            <Text style={s.heroStatLabel}>EMI / Month</Text>
          </View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{analytics?.emi_tracking?.emis_remaining ?? loan.tenure_months}</Text>
            <Text style={s.heroStatLabel}>EMIs Left</Text>
          </View>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t} style={[s.tab, tabIdx === i && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTabIdx(i)} testID={`loan-tab-${i}`}
          >
            <Text style={[s.tabText, { color: tabIdx === i ? colors.primary : colors.textSecondary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {tabIdx === 0 && <OverviewTab loan={loan} analytics={analytics} lt={lt} colors={colors} isDark={isDark} onShowAmort={() => { loadAmortization(); setShowAmort(true); }} />}
        {tabIdx === 1 && <EMIScheduleTab schedule={schedule} loan={loan} colors={colors} isDark={isDark} onPayEMI={(emi: any) => { setSelectedEMI(emi); setEmiForm(f => ({ ...f, amount: String(emi.emi_amount || loan.emi_amount || '') })); setShowEMIPay(true); }} onRecordGeneral={() => { setSelectedEMI(null); setEmiForm(f => ({ ...f, amount: String(loan.emi_amount || '') })); setShowEMIPay(true); }} />}
        {tabIdx === 2 && <PrepaymentsTab prepayments={prepayments} colors={colors} isDark={isDark} onAdd={() => setShowPrepay(true)} onDelete={handleDeletePrepay} />}
      </ScrollView>

      {/* ── Floating action button ── */}
      {tabIdx === 1 && (
        <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={() => { setSelectedEMI(null); setEmiForm(f => ({ ...f, amount: String(loan.emi_amount || '') })); setShowEMIPay(true); }} testID="record-emi-fab">
          <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
          <Text style={s.fabText}>Record EMI</Text>
        </TouchableOpacity>
      )}
      {tabIdx === 2 && (
        <TouchableOpacity style={[s.fab, { backgroundColor: colors.success }]} onPress={() => setShowPrepay(true)} testID="add-prepayment-fab">
          <Ionicons name="arrow-down-circle-outline" size={22} color="#FFF" />
          <Text style={s.fabText}>Add Prepayment</Text>
        </TouchableOpacity>
      )}

      {/* ── Amortization modal ── */}
      <AmortizationModal
        visible={showAmort}
        onClose={() => setShowAmort(false)}
        schedule={amortization}
        loan={loan}
        lt={lt}
        colors={colors}
        isDark={isDark}
        page={schedPage}
        setPage={setSchedPage}
        pageSize={PAGE_SIZE}
      />

      {/* ── EMI Payment modal ── */}
      <EMIPaymentModal
        visible={showEMIPay}
        onClose={() => { setShowEMIPay(false); setSelectedEMI(null); }}
        onSave={handleRecordEMI}
        saving={saving}
        form={emiForm}
        setForm={setEmiForm}
        selectedEMI={selectedEMI}
        loan={loan}
        lt={lt}
        colors={colors}
        isDark={isDark}
      />

      {/* ── Prepayment modal ── */}
      <PrepaymentModal
        visible={showPrepay}
        onClose={() => setShowPrepay(false)}
        onSave={handleRecordPrepay}
        saving={saving}
        form={prepForm}
        setForm={setPrepForm}
        loan={loan}
        lt={lt}
        colors={colors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ loan, analytics, lt, colors, isDark, onShowAmort }: any) {
  const a  = analytics || {};
  const et = a.emi_tracking || {};
  const pb = a.payment_breakdown || {};
  const pi = a.prepayment_impact || {};

  return (
    <View>
      {/* Interest analytics */}
      <SectionTitle title="INTEREST ANALYTICS" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <InfoRow label="Interest Paid" value={formatINR(a.interest_paid || 0)} valueColor={colors.danger} colors={colors} />
        <InfoRow label="Interest Remaining" value={formatINR(a.interest_remaining || 0)} valueColor="#FF9100" colors={colors} />
        <InfoRow label="Total Interest (Original)" value={formatINR(a.original_total_interest || 0)} valueColor={colors.textSecondary} colors={colors} />
        <InfoRow label="Interest Saved" value={formatINR(a.interest_saved || 0)} valueColor={pi.total_prepayments_count > 0 ? colors.success : colors.textSecondary} colors={colors} />
        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Total Loan Cost</Text>
          <Text style={[s.infoValue, { color: colors.text }]}>{formatINR(a.total_loan_cost || 0)}</Text>
        </View>
      </View>

      {/* Payment breakdown bar */}
      {pb.total_paid > 0 && (
        <>
          <SectionTitle title="PAYMENT BREAKDOWN" colors={colors} />
          <View style={[s.card, { backgroundColor: colors.card, paddingTop: 14 }]}>
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              <View style={{ flex: pb.principal_pct || 50, backgroundColor: lt.color }} />
              <View style={{ flex: pb.interest_pct || 50, backgroundColor: colors.danger }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 14, paddingHorizontal: 2 }}>
              {[{ label: `Principal (${(pb.principal_pct||0).toFixed(0)}%)`, color: lt.color, val: pb.total_principal_paid },
                { label: `Interest (${(pb.interest_pct||0).toFixed(0)}%)`, color: colors.danger, val: pb.total_interest_paid }]
                .map(item => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.label} · {formatINR(item.val || 0)}</Text>
                  </View>
                ))}
            </View>
            <Divider colors={colors} />
            <InfoRow label="Total Paid So Far" value={formatINR(pb.total_paid || 0)} colors={colors} />
            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>EMIs Completed</Text>
              <Text style={[s.infoValue, { color: colors.success }]}>{et.emis_paid || 0} of {et.tenure_months || 0}</Text>
            </View>
          </View>
        </>
      )}

      {/* Loan details */}
      <SectionTitle title="LOAN DETAILS" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <InfoRow label="Principal Amount"     value={formatINR(loan.principal_amount || 0)} colors={colors} />
        <InfoRow label="Interest Rate"         value={`${loan.interest_rate}% p.a. (${loan.interest_type?.replace('_', ' ')})`} colors={colors} />
        <InfoRow label="Tenure"                value={`${loan.tenure_months} months`} colors={colors} />
        <InfoRow label="EMI Amount"            value={formatINR(loan.emi_amount || 0)} colors={colors} />
        <InfoRow label="Start Date"            value={fmtDate(loan.start_date)} colors={colors} />
        <InfoRow label="End Date"              value={fmtDate(loan.end_date)} colors={colors} />
        <InfoRow label="Next EMI Date"         value={fmtDate(loan.next_emi_date)} valueColor={colors.primary} colors={colors} />
        {loan.lender_name && <InfoRow label="Lender" value={loan.lender_name} colors={colors} />}
        {loan.loan_account_number && <InfoRow label="Account No." value={loan.loan_account_number} colors={colors} />}
        {loan.processing_fee > 0 && <InfoRow label="Processing Fee" value={formatINR(loan.processing_fee)} colors={colors} />}
        {loan.collateral_type && <InfoRow label="Collateral" value={`${loan.collateral_type}${loan.collateral_description ? ` — ${loan.collateral_description}` : ''}`} colors={colors} />}
        {loan.notes && (
          <View style={[s.infoRow, { borderBottomWidth: 0, alignItems: 'flex-start' }]}>
            <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[s.infoValue, { color: colors.text, flex: 1, textAlign: 'right' }]}>{loan.notes}</Text>
          </View>
        )}
      </View>

      {/* Amortization button */}
      <TouchableOpacity style={[s.amortBtn, { borderColor: lt.color, backgroundColor: lt.color + '14' }]} onPress={onShowAmort} testID="open-amortization">
        <Ionicons name="list-outline" size={18} color={lt.color} />
        <Text style={[s.amortBtnText, { color: lt.color }]}>View Full Amortization Schedule</Text>
        <Ionicons name="chevron-forward" size={16} color={lt.color} />
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMI SCHEDULE TAB
// ══════════════════════════════════════════════════════════════════════════════
function EMIScheduleTab({ schedule, loan, colors, isDark, onPayEMI, onRecordGeneral }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const filtered = filter === 'all' ? schedule : schedule.filter((r: any) => r.status === filter);

  const counts = {
    paid:    schedule.filter((r: any) => r.status === 'paid').length,
    pending: schedule.filter((r: any) => r.status === 'pending').length,
    overdue: schedule.filter((r: any) => r.status === 'overdue').length,
  };

  if (!schedule.length) {
    return (
      <View style={s.emptyBox}>
        <Ionicons name="calendar-outline" size={44} color={colors.textSecondary} style={{ marginBottom: 12 }} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No EMI Schedule Yet</Text>
        <Text style={[s.emptySub, { color: colors.textSecondary }]}>Generate the EMI schedule to track monthly payments</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Summary chips */}
      <View style={s.emiChipRow}>
        {([['all', 'All', colors.primary], ['pending', 'Pending', colors.warning], ['paid', 'Paid', colors.success], ['overdue', 'Overdue', colors.danger]] as any[]).map(([k, l, c]) => (
          <TouchableOpacity key={k} style={[s.filterChip, { borderColor: filter === k ? c : colors.border, backgroundColor: filter === k ? c + '1A' : 'transparent' }]} onPress={() => setFilter(k)} testID={`emi-filter-${k}`}>
            <Text style={[s.filterChipText, { color: filter === k ? c : colors.textSecondary }]}>{l}{k !== 'all' ? ` (${(counts as any)[k] || 0})` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* EMI rows */}
      {filtered.map((row: any, idx: number) => {
        const isPending = row.status === 'pending' || row.status === 'overdue';
        const sc = emiStatusColor(row.status, colors);
        const sb = emiStatusBg(row.status);
        return (
          <View key={row.emi_reminder_id || idx} style={[s.emiRow, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#bbb' }]}>
            {/* EMI number + date */}
            <View style={[s.emiNumBadge, { backgroundColor: sc + '20' }]}>
              <Text style={[s.emiNum, { color: sc }]}>#{row.emi_number}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[s.emiDate, { color: colors.text }]}>{fmtDate(row.due_date, 'MMM yyyy')}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 3 }}>
                <Text style={[s.emiMeta, { color: colors.textSecondary }]}>P: {formatINR(row.principal_component || 0)}</Text>
                <Text style={[s.emiMeta, { color: colors.textSecondary }]}>I: {formatINR(row.interest_component || 0)}</Text>
              </View>
              {row.status === 'paid' && row.paid_date && (
                <Text style={[s.emiMeta, { color: colors.success, marginTop: 2 }]}>Paid {fmtDate(row.paid_date)}{row.paid_amount ? ` · ${formatINR(row.paid_amount)}` : ''}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[s.emiAmt, { color: colors.text }]}>{formatINR(row.emi_amount || loan.emi_amount || 0)}</Text>
              {isPending ? (
                <TouchableOpacity style={[s.payBtn, { backgroundColor: colors.primary }]} onPress={() => onPayEMI(row)} testID={`pay-emi-${row.emi_number}`}>
                  <Text style={s.payBtnText}>Pay</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.paidBadge, { backgroundColor: sb }]}>
                  <Text style={[s.paidBadgeText, { color: sc }]}>{row.status}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREPAYMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function PrepaymentsTab({ prepayments, colors, isDark, onAdd, onDelete }: any) {
  if (!prepayments.length) {
    return (
      <View style={s.emptyBox}>
        <Ionicons name="arrow-down-circle-outline" size={44} color={colors.textSecondary} style={{ marginBottom: 12 }} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No Prepayments Yet</Text>
        <Text style={[s.emptySub, { color: colors.textSecondary }]}>Making a prepayment reduces your outstanding balance and saves interest</Text>
        <TouchableOpacity style={[s.emptyAddBtn, { backgroundColor: colors.success }]} onPress={onAdd} testID="empty-add-prepayment">
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Add Prepayment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPrepaid = prepayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

  return (
    <View>
      {/* Summary */}
      <View style={[s.prepSummary, { backgroundColor: '#22C55E18', borderColor: '#22C55E33' }]}>
        <View>
          <Text style={[s.prepSumLabel, { color: colors.textSecondary }]}>Total Prepaid</Text>
          <Text style={[s.prepSumVal, { color: colors.success }]}>{formatINR(totalPrepaid)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.prepSumLabel, { color: colors.textSecondary }]}>{prepayments.length} Prepayment{prepayments.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {prepayments.map((p: any, idx: number) => (
        <View key={p.prepayment_id || idx} style={[s.prepCard, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#bbb' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[s.prepTypeIcon, { backgroundColor: p.prepayment_type === 'full_closure' ? colors.danger + '20' : colors.success + '20' }]}>
                <Ionicons name={p.prepayment_type === 'full_closure' ? 'close-circle-outline' : 'arrow-down-circle-outline'} size={18} color={p.prepayment_type === 'full_closure' ? colors.danger : colors.success} />
              </View>
              <View>
                <Text style={[s.prepType, { color: colors.text }]}>{p.prepayment_type === 'full_closure' ? 'Full Closure' : 'Part Prepayment'}</Text>
                <Text style={[s.prepDate, { color: colors.textSecondary }]}>{fmtDate(p.payment_date)}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.prepAmt, { color: colors.success }]}>{formatINR(p.amount)}</Text>
              {p.penalty_amount > 0 && <Text style={[s.prepPenalty, { color: colors.danger }]}>Penalty: {formatINR(p.penalty_amount)}</Text>}
            </View>
          </View>
          <Divider colors={colors} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <View>
              {p.adjustment_type && <Text style={[s.prepMeta, { color: colors.textSecondary }]}>{p.adjustment_type === 'reduce_tenure' ? 'Tenure reduced' : 'EMI reduced'}{p.new_tenure_months ? ` → ${p.new_tenure_months} mo` : ''}{p.new_emi_amount ? ` → ${formatINR(p.new_emi_amount)}` : ''}</Text>}
              {p.payment_method && <Text style={[s.prepMeta, { color: colors.textSecondary }]}>{p.payment_method.replace(/_/g, ' ')}{p.reference_number ? ` · ${p.reference_number}` : ''}</Text>}
            </View>
            <TouchableOpacity onPress={() => onDelete(p.prepayment_id)} testID={`delete-prepayment-${p.prepayment_id}`}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AMORTIZATION MODAL
// ══════════════════════════════════════════════════════════════════════════════
function AmortizationModal({ visible, onClose, schedule, loan, lt, colors, isDark, page, setPage, pageSize }: any) {
  const totalPages = Math.ceil((schedule?.length || 0) / pageSize);
  const pageRows   = schedule.slice(page * pageSize, (page + 1) * pageSize);
  const totalInterest = schedule.reduce((s: number, r: any) => s + (r.interest_component || 0), 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
        {/* Modal header */}
        <View style={[s.modalHead, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} testID="close-amortization">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Amortization Schedule</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>{loan?.name} · {schedule.length} EMIs</Text>
          </View>
        </View>

        {/* Summary strip */}
        <View style={[s.amortSummary, { backgroundColor: lt.color + '18', borderBottomColor: lt.color + '30' }]}>
          <View style={s.amortSumItem}>
            <Text style={[s.amortSumLabel, { color: colors.textSecondary }]}>Principal</Text>
            <Text style={[s.amortSumVal, { color: colors.text }]}>{formatINR(loan?.principal_amount || 0)}</Text>
          </View>
          <View style={[s.amortSumDiv, { backgroundColor: colors.border }]} />
          <View style={s.amortSumItem}>
            <Text style={[s.amortSumLabel, { color: colors.textSecondary }]}>Total Interest</Text>
            <Text style={[s.amortSumVal, { color: colors.danger }]}>{formatINR(totalInterest)}</Text>
          </View>
          <View style={[s.amortSumDiv, { backgroundColor: colors.border }]} />
          <View style={s.amortSumItem}>
            <Text style={[s.amortSumLabel, { color: colors.textSecondary }]}>Total Cost</Text>
            <Text style={[s.amortSumVal, { color: lt.color }]}>{formatINR((loan?.principal_amount || 0) + totalInterest)}</Text>
          </View>
        </View>

        {/* Column headers */}
        <View style={[s.amortHead, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {['#', 'Due', 'Principal', 'Interest', 'Balance'].map(h => (
            <Text key={h} style={[s.amortHeadCell, { color: colors.textSecondary, flex: h === 'Due' ? 1.4 : 1 }]}>{h}</Text>
          ))}
        </View>

        {/* Rows */}
        {!schedule.length ? (
          <View style={[s.center, { flex: 1 }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[{ color: colors.textSecondary, marginTop: 12, fontSize: 13 }]}>Loading schedule…</Text>
          </View>
        ) : (
          <FlatList
            data={pageRows}
            keyExtractor={(r: any) => String(r.emi_number)}
            renderItem={({ item: r, index }) => {
              const globalIdx = page * pageSize + index;
              const isPaid = r.status === 'paid';
              const rowBg = globalIdx % 2 === 0 ? colors.background : colors.card;
              return (
                <View style={[s.amortRow, { backgroundColor: rowBg }]}>
                  <Text style={[s.amortCell, { color: isPaid ? colors.success : colors.text, fontWeight: '700', flex: 1 }]}>{r.emi_number}</Text>
                  <Text style={[s.amortCell, { color: colors.textSecondary, flex: 1.4, fontSize: 11 }]}>{fmtDate(r.due_date, 'MMM yy')}</Text>
                  <Text style={[s.amortCell, { color: lt.color, flex: 1 }]}>{formatINR(r.principal_component || 0, false)}</Text>
                  <Text style={[s.amortCell, { color: colors.danger, flex: 1 }]}>{formatINR(r.interest_component || 0, false)}</Text>
                  <Text style={[s.amortCell, { color: colors.text, flex: 1 }]}>{formatINR(r.balance_after || 0, false)}</Text>
                </View>
              );
            }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={[s.pagination, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPage((p: number) => Math.max(p - 1, 0))} disabled={page === 0} style={[s.pageBtn, page === 0 && { opacity: 0.3 }]} testID="amort-prev">
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[s.pageLabel, { color: colors.text }]}>
              EMIs {page * pageSize + 1}–{Math.min((page + 1) * pageSize, schedule.length)} of {schedule.length}
            </Text>
            <TouchableOpacity onPress={() => setPage((p: number) => Math.min(p + 1, totalPages - 1))} disabled={page === totalPages - 1} style={[s.pageBtn, page === totalPages - 1 && { opacity: 0.3 }]} testID="amort-next">
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMI PAYMENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
const PAYMENT_METHODS = ['auto_debit', 'bank_transfer', 'upi', 'cheque', 'cash', 'other'];

function EMIPaymentModal({ visible, onClose, onSave, saving, form, setForm, selectedEMI, loan, lt, colors, isDark }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={[s.sheetHead, { borderBottomColor: colors.border }]}>
            <View style={[s.sheetDot, { backgroundColor: lt.color }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Record EMI Payment</Text>
              {selectedEMI && <Text style={[s.sheetSub, { color: colors.textSecondary }]}>EMI #{selectedEMI.emi_number} · Due {fmtDate(selectedEMI.due_date)}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} testID="close-emi-modal"><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <FormField label="Amount Paid *" pre="₹" colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder={String(selectedEMI?.emi_amount || loan?.emi_amount || '')} placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={form.amount} onChangeText={(v: string) => setForm((f: any) => ({ ...f, amount: v }))} testID="emi-amount-input" />
            </FormField>

            {/* Date */}
            <FormField label="Payment Date" colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={form.transaction_date} onChangeText={(v: string) => setForm((f: any) => ({ ...f, transaction_date: v }))} testID="emi-date-input" />
            </FormField>

            {/* Payment method chips */}
            <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[s.methodChip, { borderColor: form.payment_method === m ? colors.primary : colors.border, backgroundColor: form.payment_method === m ? colors.primary + '1A' : 'transparent' }]} onPress={() => setForm((f: any) => ({ ...f, payment_method: m }))} testID={`emi-method-${m}`}>
                    <Text style={[s.methodChipText, { color: form.payment_method === m ? colors.primary : colors.textSecondary }]}>{m.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Reference */}
            <FormField label="Reference / UTR No." colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder="Optional" placeholderTextColor={colors.textSecondary} value={form.reference_number} onChangeText={(v: string) => setForm((f: any) => ({ ...f, reference_number: v }))} testID="emi-ref-input" />
            </FormField>

            {/* Notes */}
            <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Notes</Text>
            <TextInput style={[s.notesInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]} placeholder="Optional notes…" placeholderTextColor={colors.textSecondary} value={form.notes} onChangeText={(v: string) => setForm((f: any) => ({ ...f, notes: v }))} multiline numberOfLines={2} testID="emi-notes-input" />

            {/* Selected EMI info strip */}
            {selectedEMI && (
              <View style={[s.emiInfoStrip, { backgroundColor: lt.color + '12', borderColor: lt.color + '30' }]}>
                <InfoChip label="Principal" val={formatINR(selectedEMI.principal_component || 0)} color={lt.color} />
                <InfoChip label="Interest" val={formatINR(selectedEMI.interest_component || 0)} color={colors.danger} />
                <InfoChip label="Balance After" val={formatINR(selectedEMI.balance_after || 0)} color={colors.textSecondary} />
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving} testID="save-emi-btn">
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.saveBtnText}>Record Payment</Text>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREPAYMENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function PrepaymentModal({ visible, onClose, onSave, saving, form, setForm, loan, lt, colors, isDark }: any) {
  const penaltyAmt = parseFloat(form.amount || '0') * (parseFloat(form.penalty_rate || '0') / 100);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={[s.sheetHead, { borderBottomColor: colors.border }]}>
            <View style={[s.sheetDot, { backgroundColor: colors.success }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Add Prepayment</Text>
              <Text style={[s.sheetSub, { color: colors.textSecondary }]}>Outstanding: {formatINR(loan?.outstanding_amount || 0)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} testID="close-prepay-modal"><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Type toggle */}
            <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Prepayment Type</Text>
            <View style={[s.toggleRow, { borderColor: colors.border }]}>
              {[['part_prepayment', 'Part Prepayment'], ['full_closure', 'Full Closure']].map(([k, l]) => (
                <TouchableOpacity key={k} style={[s.toggleBtn, form.prepayment_type === k && { backgroundColor: colors.success }]} onPress={() => setForm((f: any) => ({ ...f, prepayment_type: k }))} testID={`prepay-type-${k}`}>
                  <Text style={[s.toggleBtnText, { color: form.prepayment_type === k ? '#FFF' : colors.textSecondary }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <FormField label="Prepayment Amount *" pre="₹" colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder="200000" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={form.amount} onChangeText={(v: string) => setForm((f: any) => ({ ...f, amount: v }))} testID="prepay-amount-input" />
            </FormField>

            {/* Penalty rate */}
            <FormField label="Penalty Rate (%)" pre="%" colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder={String(loan?.prepayment_penalty_rate || '0')} placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={form.penalty_rate} onChangeText={(v: string) => setForm((f: any) => ({ ...f, penalty_rate: v }))} testID="prepay-penalty-input" />
            </FormField>

            {/* Computed penalty display */}
            {penaltyAmt > 0 && (
              <View style={[s.penaltyInfo, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' }]}>
                <Ionicons name="warning-outline" size={14} color={colors.danger} />
                <Text style={[s.penaltyText, { color: colors.danger }]}>Penalty amount: {formatINR(penaltyAmt)} · Total outgo: {formatINR(parseFloat(form.amount || '0') + penaltyAmt)}</Text>
              </View>
            )}

            {/* Adjustment type (only for part prepayment) */}
            {form.prepayment_type === 'part_prepayment' && (
              <>
                <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Post-Prepayment Adjustment</Text>
                <View style={[s.toggleRow, { borderColor: colors.border }]}>
                  {[['reduce_tenure', 'Reduce Tenure'], ['reduce_emi', 'Reduce EMI']].map(([k, l]) => (
                    <TouchableOpacity key={k} style={[s.toggleBtn, form.adjustment_type === k && { backgroundColor: colors.primary }]} onPress={() => setForm((f: any) => ({ ...f, adjustment_type: k }))} testID={`prepay-adj-${k}`}>
                      <Text style={[s.toggleBtnText, { color: form.adjustment_type === k ? '#FFF' : colors.textSecondary }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Date */}
            <FormField label="Payment Date" colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={form.payment_date} onChangeText={(v: string) => setForm((f: any) => ({ ...f, payment_date: v }))} testID="prepay-date-input" />
            </FormField>

            {/* Payment method */}
            <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[s.methodChip, { borderColor: form.payment_method === m ? colors.success : colors.border, backgroundColor: form.payment_method === m ? colors.success + '1A' : 'transparent' }]} onPress={() => setForm((f: any) => ({ ...f, payment_method: m }))} testID={`prepay-method-${m}`}>
                    <Text style={[s.methodChipText, { color: form.payment_method === m ? colors.success : colors.textSecondary }]}>{m.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Reference */}
            <FormField label="Reference / Demand Draft No." colors={colors}>
              <TextInput style={[s.ftxt, { color: colors.text }]} placeholder="Optional" placeholderTextColor={colors.textSecondary} value={form.reference_number} onChangeText={(v: string) => setForm((f: any) => ({ ...f, reference_number: v }))} testID="prepay-ref-input" />
            </FormField>

            {/* Notes */}
            <Text style={[s.fLabel, { color: colors.text, marginBottom: 8 }]}>Notes</Text>
            <TextInput style={[s.notesInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]} placeholder="Optional notes…" placeholderTextColor={colors.textSecondary} value={form.notes} onChangeText={(v: string) => setForm((f: any) => ({ ...f, notes: v }))} multiline numberOfLines={2} testID="prepay-notes-input" />

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.success }, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving} testID="save-prepay-btn">
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.saveBtnText}>Record Prepayment</Text>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
function FormField({ label, children, pre, colors }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[s.fLabel, { color: colors.text }]}>{label}</Text>
      <View style={[s.fInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {pre && <Text style={[s.fPre, { color: colors.textSecondary }]}>{pre}</Text>}
        {children}
      </View>
    </View>
  );
}

function InfoChip({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 12, color, fontWeight: '700' }} numberOfLines={1}>{val}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:  { paddingHorizontal: 16, paddingTop: 16 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  headerTitle:  { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub:    { fontSize: 12, marginTop: 1 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Hero card
  heroCard:      { marginHorizontal: 16, marginVertical: 12, borderRadius: 18, padding: 20 },
  heroLabel:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  heroValue:     { fontSize: 30, color: '#FFF', fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  heroStats:     { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroStat:      { flex: 1, alignItems: 'center' },
  heroStatVal:   { fontSize: 15, color: '#FFF', fontWeight: '700', marginBottom: 2 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  heroStatDiv:   { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  // Tabs
  tabBar:     { flexDirection: 'row', borderBottomWidth: 1 },
  tab:        { flex: 1, alignItems: 'center', paddingVertical: 13 },
  tabText:    { fontSize: 13, fontWeight: '600' },

  // Cards / sections
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 16, marginLeft: 2 },
  card:         { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel:    { fontSize: 13, fontWeight: '500' },
  infoValue:    { fontSize: 13, fontWeight: '700', maxWidth: '60%' },

  // Amortization button
  amortBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16, marginBottom: 4 },
  amortBtnText: { flex: 1, fontSize: 14, fontWeight: '700' },

  // EMI schedule
  emiChipRow:  { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  emiRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  emiNumBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emiNum:      { fontSize: 13, fontWeight: '800' },
  emiDate:     { fontSize: 14, fontWeight: '700' },
  emiMeta:     { fontSize: 11, fontWeight: '500' },
  emiAmt:      { fontSize: 14, fontWeight: '700' },
  payBtn:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  payBtnText:  { color: '#FFF', fontSize: 12, fontWeight: '700' },
  paidBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paidBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  // Prepayments
  prepSummary:  { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  prepSumLabel: { fontSize: 11, fontWeight: '500', marginBottom: 3 },
  prepSumVal:   { fontSize: 18, fontWeight: '800' },
  prepCard:     { borderRadius: 14, padding: 14, marginBottom: 10, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  prepTypeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prepType:     { fontSize: 14, fontWeight: '700' },
  prepDate:     { fontSize: 12, marginTop: 1 },
  prepAmt:      { fontSize: 16, fontWeight: '800' },
  prepPenalty:  { fontSize: 11, fontWeight: '600', marginTop: 2 },
  prepMeta:     { fontSize: 11, marginTop: 3 },

  // Empty
  emptyBox:    { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },

  // FAB
  fab:      { position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 40, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  fabText:  { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Amortization modal
  modalHead:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle:    { fontSize: 17, fontWeight: '700' },
  modalSub:      { fontSize: 12, marginTop: 1 },
  amortSummary:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  amortSumItem:  { flex: 1, alignItems: 'center' },
  amortSumLabel: { fontSize: 10, fontWeight: '500', marginBottom: 3 },
  amortSumVal:   { fontSize: 13, fontWeight: '700' },
  amortSumDiv:   { width: 1, height: 30 },
  amortHead:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  amortHeadCell: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  amortRow:      { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  amortCell:     { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  pagination:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1 },
  pageBtn:       { padding: 8 },
  pageLabel:     { fontSize: 13, fontWeight: '600' },

  // Bottom-sheet modals
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheetHead:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetDot:    { width: 10, height: 10, borderRadius: 5 },
  sheetTitle:  { fontSize: 17, fontWeight: '800' },
  sheetSub:    { fontSize: 12, marginTop: 1 },
  sheetBody:   { paddingHorizontal: 20, paddingTop: 14 },

  // Form elements
  fLabel:  { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fInput:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  fPre:    { fontSize: 15, fontWeight: '700', marginRight: 6 },
  ftxt:    { flex: 1, fontSize: 15 },
  notesInput:  { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 14 },
  methodChip:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  methodChipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  toggleRow:   { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', marginBottom: 14 },
  toggleBtn:   { flex: 1, alignItems: 'center', paddingVertical: 11 },
  toggleBtnText: { fontSize: 13, fontWeight: '700' },
  penaltyInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14 },
  penaltyText: { flex: 1, fontSize: 12, fontWeight: '500' },
  emiInfoStrip: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  saveBtn:     { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

/**
 * LoansDashboardScreen
 * Live backend-connected dashboard with custom 3-dot action menu.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { format, parseISO, isValid } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  const abs = Math.round(Math.abs(n || 0));
  const s = abs.toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
}

function safeDate(v: any): string {
  if (!v) return '—';
  try {
    const d = typeof v === 'string' ? parseISO(v) : v;
    return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
  } catch { return '—'; }
}

// ─── Loan type meta ───────────────────────────────────────────────────────────
const LOAN_TYPE_META: Record<string, { icon: any; color: string }> = {
  home:      { icon: 'home',      color: '#5B4FFF' },
  car:       { icon: 'car',       color: '#22C55E' },
  personal:  { icon: 'person',    color: '#F97316' },
  education: { icon: 'school',    color: '#3B82F6' },
  gold:      { icon: 'diamond',   color: '#EAB308' },
  business:  { icon: 'briefcase', color: '#0EA5E9' },
  property:  { icon: 'business',  color: '#EC4899' },
  vehicle:   { icon: 'bicycle',   color: '#14B8A6' },
  other:     { icon: 'cash',      color: '#8B5CF6' },
};

const STAT_META = [
  { key: 'total_outstanding', label: 'Total Outstanding', color: '#5B4FFF', iconName: 'trending-down-outline' },
  { key: 'total_paid',        label: 'Total Paid',        color: '#22C55E', iconName: 'checkmark-circle-outline' },
  { key: 'total_interest',    label: 'Total Interest',    color: '#F97316', iconName: 'calculator-outline' },
  { key: 'monthly_emi',       label: 'Monthly EMI',       color: '#3B82F6', iconName: 'calendar-outline' },
] as const;

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, iconName, isLast, colors,
}: { label: string; value: number; color: string; iconName: string; isLast: boolean; colors: any }) {
  return (
    <View style={[st.wrap, !isLast && { borderRightWidth: 1, borderRightColor: colors.border }]}>
      <Text style={[st.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
      <Text style={[st.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
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
function LoanCard({
  loan, colors, onPress, onMenuPress,
}: { loan: any; colors: any; onPress: () => void; onMenuPress: () => void }) {
  const meta = LOAN_TYPE_META[loan.loan_type] || LOAN_TYPE_META.other;
  const principal   = parseFloat(loan.principal_amount) || 0;
  const outstanding = parseFloat(loan.outstanding_amount) || 0;
  const paid        = Math.max(0, principal - outstanding);
  const paidPct     = principal > 0 ? Math.min((paid / principal) * 100, 100) : 0;
  const status      = (loan.status || 'active').toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === 'active' ? '#16A34A' : status === 'closed' ? '#6B7280' : '#F59E0B';
  const statusBg    = status === 'active' ? '#DCFCE7' : status === 'closed' ? '#E5E7EB' : '#FEF3C7';

  return (
    <TouchableOpacity
      testID={`loan-card-${loan.loan_id}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={[lc.card, { backgroundColor: colors.card }]}
    >
      {/* Row 1 */}
      <View style={lc.headerRow}>
        <View style={[lc.iconBox, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon} size={26} color={meta.color} />
        </View>
        <View style={lc.titleBlock}>
          <Text style={[lc.titleText, { color: colors.text }]} numberOfLines={1}>{loan.name}</Text>
          {loan.lender ? (
            <Text style={[lc.subText, { color: colors.textSecondary }]} numberOfLines={1}>{loan.lender}</Text>
          ) : null}
        </View>
        <View style={lc.badgeRow}>
          <View style={[lc.activeBadge, { backgroundColor: statusBg }]}>
            <Text style={[lc.activeBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <TouchableOpacity
            testID={`loan-menu-${loan.loan_id}`}
            onPress={onMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2 */}
      <View style={lc.statsRow}>
        <View style={lc.statBlock}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
          <Text style={lc.outstandingValue}>{fmtINR(outstanding)}</Text>
        </View>
        <View style={[lc.statBlock, { alignItems: 'flex-end' }]}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>EMI Amount</Text>
          <Text style={[lc.emiValue, { color: colors.text }]}>{fmtINR(parseFloat(loan.emi_amount) || 0)}</Text>
        </View>
      </View>

      {/* Row 3 */}
      <View style={lc.bottomRow}>
        <View style={lc.dateBlock}>
          <Text style={[lc.statLabel, { color: colors.textSecondary }]}>Next EMI Date</Text>
          <Text style={[lc.emiDateText, { color: colors.text }]}>{safeDate(loan.next_emi_date)}</Text>
        </View>
        <View style={lc.progressBlock}>
          <Text style={[lc.pctText, { color: colors.textSecondary }]}>
            {paidPct.toFixed(0)}% Completed
          </Text>
          <View style={[lc.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[lc.progressFill, { width: `${paidPct}%` as any, backgroundColor: '#3B5BFF' }]} />
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
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox:      { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleBlock:   { flex: 1 },
  titleText:    { fontSize: 16, fontWeight: '700' },
  subText:      { fontSize: 12, marginTop: 2 },
  badgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge:  { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },

  statsRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBlock:        { gap: 4 },
  statLabel:        { fontSize: 11 },
  outstandingValue: { fontSize: 18, fontWeight: '800', color: '#5B4FFF' },
  emiValue:         { fontSize: 17, fontWeight: '600' },

  bottomRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dateBlock:    { gap: 4 },
  emiDateText:  { fontSize: 14, fontWeight: '700' },
  progressBlock: { flex: 1, marginLeft: 20, alignItems: 'flex-end', gap: 5 },
  pctText:       { fontSize: 11 },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 5, borderRadius: 3 },
});

// ─── 3-dot Action Menu (custom modal) ─────────────────────────────────────────
type ActionKey = 'view' | 'edit' | 'prepayment' | 'reminder' | 'transactions' | 'delete';

const MENU_ITEMS: { key: ActionKey; label: string; icon: any; color: string; destructive?: boolean }[] = [
  { key: 'view',          label: 'View Details',  icon: 'eye-outline',           color: '#3B82F6' },
  { key: 'edit',          label: 'Edit Loan',     icon: 'create-outline',        color: '#5B4FFF' },
  { key: 'prepayment',    label: 'Prepayment',    icon: 'arrow-down-circle-outline', color: '#6C47FF' },
  { key: 'reminder',      label: 'Set Reminder',  icon: 'notifications-outline', color: '#F59E0B' },
  { key: 'transactions',  label: 'Transactions',  icon: 'receipt-outline',       color: '#22C55E' },
  { key: 'delete',        label: 'Delete Loan',   icon: 'trash-outline',         color: '#EF4444', destructive: true },
];

function ActionMenu({
  visible, loan, colors, onClose, onAction,
}: {
  visible: boolean; loan: any | null; colors: any;
  onClose: () => void; onAction: (a: ActionKey) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        testID="loan-action-menu-overlay"
        style={am.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[am.sheet, { backgroundColor: colors.card }]}>
        <View style={[am.handle, { backgroundColor: colors.border }]} />
        {loan && (
          <View style={[am.header, { borderBottomColor: colors.border }]}>
            <Text style={[am.title, { color: colors.text }]} numberOfLines={1}>{loan.name}</Text>
            {loan.lender ? (
              <Text style={[am.sub, { color: colors.textSecondary }]} numberOfLines={1}>{loan.lender}</Text>
            ) : null}
          </View>
        )}
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            testID={`loan-action-${item.key}`}
            style={[am.row, { borderBottomColor: colors.border }]}
            onPress={() => onAction(item.key)}
          >
            <View style={[am.iconWrap, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[am.label, { color: item.destructive ? '#EF4444' : colors.text }]}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}
const am = StyleSheet.create({
  overlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.45)' },
  sheet:   {
    position:'absolute', bottom:0, left:0, right:0,
    borderTopLeftRadius:22, borderTopRightRadius:22, paddingBottom:30,
  },
  handle:  { width:36, height:4, borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:6 },
  header:  { paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1 },
  title:   { fontSize:16, fontWeight:'700' },
  sub:     { fontSize:12, marginTop:2 },
  row:     {
    flexDirection:'row', alignItems:'center', gap:14,
    paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1,
  },
  iconWrap:{ width:36, height:36, borderRadius:11, alignItems:'center', justifyContent:'center' },
  label:   { flex:1, fontSize:15, fontWeight:'500' },
});

// ─── Delete confirmation (custom) ─────────────────────────────────────────────
function ConfirmDelete({
  visible, loanName, colors, onCancel, onConfirm, deleting,
}: {
  visible: boolean; loanName: string; colors: any;
  onCancel: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={cd.overlay}>
        <View style={[cd.box, { backgroundColor: colors.card }]}>
          <View style={cd.iconCircle}>
            <Ionicons name="trash" size={26} color="#EF4444" />
          </View>
          <Text style={[cd.title, { color: colors.text }]}>Delete Loan?</Text>
          <Text style={[cd.body, { color: colors.textSecondary }]}>
            "{loanName}" and all related data will be permanently removed. This cannot be undone.
          </Text>
          <View style={cd.actions}>
            <TouchableOpacity
              testID="confirm-delete-cancel"
              style={[cd.btn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={onCancel}
              disabled={deleting}
            >
              <Text style={[cd.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="confirm-delete-yes"
              style={[cd.btn, cd.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={[cd.btnText, { color: '#FFF' }]}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const cd = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:24 },
  box:     { width:'100%', maxWidth:340, borderRadius:20, padding:24, alignItems:'center' },
  iconCircle:{ width:60, height:60, borderRadius:30, backgroundColor:'#FEE2E2', alignItems:'center', justifyContent:'center', marginBottom:14 },
  title:   { fontSize:18, fontWeight:'800', marginBottom:6 },
  body:    { fontSize:13, textAlign:'center', lineHeight:19, marginBottom:18 },
  actions: { flexDirection:'row', gap:10, width:'100%' },
  btn:     { flex:1, paddingVertical:13, borderRadius:11, alignItems:'center' },
  deleteBtn:{ backgroundColor:'#EF4444' },
  btnText: { fontSize:14, fontWeight:'700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoansDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [loans,    setLoans]    = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>({
    total_outstanding: 0, total_paid: 0, total_interest: 0, monthly_emi: 0,
  });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuLoan,     setMenuLoan]     = useState<any | null>(null);
  const [deleteLoan,   setDeleteLoan]   = useState<any | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [sortKey, setSortKey] = useState<'next_emi' | 'outstanding' | 'name'>('next_emi');
  const [showSort, setShowSort] = useState(false);

  const load = async () => {
    try {
      const [loansRes, sumRes] = await Promise.all([
        api.get('/loans'),
        api.get('/loans/dashboard').catch(() => ({ data: null })),
      ]);
      setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
      if (sumRes.data) setSummary(sumRes.data);
    } catch {
      // silent fail; keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const sortedLoans = [...loans].sort((a, b) => {
    if (sortKey === 'outstanding') {
      return (parseFloat(b.outstanding_amount) || 0) - (parseFloat(a.outstanding_amount) || 0);
    }
    if (sortKey === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    // next_emi
    const ad = a.next_emi_date ? new Date(a.next_emi_date).getTime() : Infinity;
    const bd = b.next_emi_date ? new Date(b.next_emi_date).getTime() : Infinity;
    return ad - bd;
  });

  const handleAction = (action: ActionKey) => {
    const loan = menuLoan;
    setMenuLoan(null);
    if (!loan) return;
    const id = loan.loan_id;
    setTimeout(() => {
      switch (action) {
        case 'view':
          router.push({ pathname: '/loans/[id]', params: { id } } as any); break;
        case 'edit':
          router.push({ pathname: '/loans/add', params: { loan_id: id } } as any); break;
        case 'prepayment':
          router.push({ pathname: '/loans/prepayment', params: { loan_id: id } } as any); break;
        case 'reminder':
          router.push({ pathname: '/loans/reminder', params: { loan_id: id, loan_name: loan.name } } as any); break;
        case 'transactions':
          router.push({ pathname: '/loans/transactions', params: { loan_id: id, loan_name: loan.name } } as any); break;
        case 'delete':
          setDeleteLoan(loan); break;
      }
    }, 150);
  };

  const handleDelete = async () => {
    if (!deleteLoan) return;
    setDeleting(true);
    try {
      await api.delete(`/loans/${deleteLoan.loan_id}`);
      setDeleteLoan(null);
      load();
    } catch {
      // keep modal open so user can retry
    } finally {
      setDeleting(false);
    }
  };

  const sortLabel = sortKey === 'next_emi' ? 'Next EMI Date'
                   : sortKey === 'outstanding' ? 'Outstanding'
                   : 'Name';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
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

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#5B4FFF" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B4FFF" />}
        >
          {/* Summary card */}
          <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
            <View style={s.summaryRow}>
              {STAT_META.map((meta, i) => (
                <StatCard
                  key={meta.key}
                  label={meta.label}
                  value={summary[meta.key] || 0}
                  color={meta.color}
                  iconName={meta.iconName}
                  isLast={i === STAT_META.length - 1}
                  colors={colors}
                />
              ))}
            </View>
          </View>

          {/* Section header */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Your Loans</Text>
            <TouchableOpacity
              style={s.sortBtn}
              testID="loans-sort-btn"
              onPress={() => setShowSort(true)}
            >
              <Text style={s.sortBtnText}>Sort: {sortLabel}</Text>
              <Ionicons name="swap-vertical" size={14} color="#5B4FFF" />
            </TouchableOpacity>
          </View>

          {/* Loan cards / empty state */}
          {sortedLoans.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card }]} testID="loans-empty-state">
              <View style={s.emptyIcon}>
                <Ionicons name="wallet-outline" size={42} color="#5B4FFF" />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No loans yet</Text>
              <Text style={[s.emptySub,   { color: colors.textSecondary }]}>
                Track your home, car, personal and other loans in one place.
              </Text>
              <TouchableOpacity
                testID="empty-add-loan-btn"
                style={s.emptyBtn}
                onPress={() => router.push('/loans/add' as any)}
              >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={s.emptyBtnText}>Add Your First Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedLoans.map(loan => (
              <LoanCard
                key={loan.loan_id}
                loan={loan}
                colors={colors}
                onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.loan_id } } as any)}
                onMenuPress={() => setMenuLoan(loan)}
              />
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Custom 3-dot Action Menu */}
      <ActionMenu
        visible={!!menuLoan}
        loan={menuLoan}
        colors={colors}
        onClose={() => setMenuLoan(null)}
        onAction={handleAction}
      />

      {/* Delete confirmation */}
      <ConfirmDelete
        visible={!!deleteLoan}
        loanName={deleteLoan?.name || 'this loan'}
        colors={colors}
        deleting={deleting}
        onCancel={() => { if (!deleting) setDeleteLoan(null); }}
        onConfirm={handleDelete}
      />

      {/* Sort sheet */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={am.overlay} activeOpacity={1} onPress={() => setShowSort(false)} />
        <View style={[am.sheet, { backgroundColor: colors.card }]}>
          <View style={[am.handle, { backgroundColor: colors.border }]} />
          <View style={[am.header, { borderBottomColor: colors.border }]}>
            <Text style={[am.title, { color: colors.text }]}>Sort By</Text>
          </View>
          {[
            { key: 'next_emi',    label: 'Next EMI Date',  icon: 'calendar-outline' as any },
            { key: 'outstanding', label: 'Outstanding',    icon: 'trending-down-outline' as any },
            { key: 'name',        label: 'Name',           icon: 'text-outline' as any },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              testID={`sort-${opt.key}`}
              style={[am.row, { borderBottomColor: colors.border }]}
              onPress={() => { setSortKey(opt.key as any); setShowSort(false); }}
            >
              <View style={[am.iconWrap, { backgroundColor: '#5B4FFF18' }]}>
                <Ionicons name={opt.icon} size={18} color="#5B4FFF" />
              </View>
              <Text style={[am.label, { color: colors.text }]}>{opt.label}</Text>
              {sortKey === opt.key && <Ionicons name="checkmark-circle" size={18} color="#5B4FFF" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  summaryCard: {
    borderRadius: 18, marginBottom: 18,
    paddingHorizontal: 6, paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  summaryRow: { flexDirection: 'row' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText:  { color: '#5B4FFF', fontSize: 13, fontWeight: '600' },

  emptyCard: {
    borderRadius: 18, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#5B4FFF14',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  emptyBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#5B4FFF', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

/**
 * LoansDashboardScreen
 * Accessible via: More → Loans & EMIs
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO, isValid } from 'date-fns';

// ─── Loan type meta ─────────────────────────────────────────────────────────
const LOAN_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  home:       { label: 'Home Loan',        icon: 'home',               color: '#6C47FF' },
  car:        { label: 'Car Loan',         icon: 'car',                color: '#22C55E' },
  personal:   { label: 'Personal Loan',    icon: 'person',             color: '#F59E0B' },
  education:  { label: 'Education Loan',   icon: 'school',             color: '#3B82F6' },
  gold:       { label: 'Gold Loan',        icon: 'diamond',            color: '#EAB308' },
  business:   { label: 'Business Loan',    icon: 'briefcase',          color: '#0EA5E9' },
  property:   { label: 'Loan vs Property', icon: 'business',           color: '#EC4899' },
  vehicle:    { label: 'Two-Wheeler',      icon: 'bicycle',            color: '#14B8A6' },
  other:      { label: 'Other Loan',       icon: 'cash',               color: '#8B5CF6' },
};

function getLoanMeta(type: string) {
  return LOAN_TYPES[type] ?? LOAN_TYPES.other;
}

// ─── Safe date parse ─────────────────────────────────────────────────────────
function safeFormatDate(value: any, fmt = 'dd MMM yyyy'): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    return isValid(d) ? format(d, fmt) : '—';
  } catch {
    return '—';
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s.statCard, { backgroundColor: colors.card }]}>
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{formatINR(value)}</Text>
      <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
    </View>
  );
}

// ─── Loan Card ───────────────────────────────────────────────────────────────
function LoanCard({
  loan, onPress, onMenuPress,
}: { loan: any; onPress: () => void; onMenuPress: () => void }) {
  const { colors } = useTheme();
  const meta = getLoanMeta(loan.loan_type);
  const principal = parseFloat(loan.principal_amount) || 0;
  const outstanding = parseFloat(loan.outstanding_amount) || 0;
  const paid = principal - outstanding;
  const paidPct = principal > 0 ? Math.min((paid / principal) * 100, 100) : 0;
  const status = loan.status || 'active';

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#22C55E18', text: '#16A34A' },
    closed: { bg: '#9CA3AF18', text: '#6B7280' },
    paused: { bg: '#F59E0B18', text: '#D97706' },
  };
  const sc = statusColors[status] ?? statusColors.active;

  return (
    <TouchableOpacity
      testID={`loan-card-${loan.loan_id}`}
      style={[s.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Header row */}
      <View style={s.cardHeader}>
        <View style={[s.typeIconWrap, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={24} color={meta.color} />
        </View>
        <View style={s.cardTitle}>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {loan.name}
          </Text>
          {loan.lender ? (
            <Text style={[s.cardLender, { color: colors.textSecondary }]} numberOfLines={1}>
              {loan.lender}
            </Text>
          ) : (
            <Text style={[s.cardLender, { color: colors.textSecondary }]}>{meta.label}</Text>
          )}
        </View>
        <View style={s.cardBadgeRow}>
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[s.statusText, { color: sc.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
          <TouchableOpacity
            testID={`loan-menu-${loan.loan_id}`}
            onPress={onMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      <View style={s.cardStats}>
        <View>
          <Text style={[s.statRowLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
          <Text style={[s.statRowValue, { color: '#6C47FF' }]}>{formatINR(outstanding)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.statRowLabel, { color: colors.textSecondary }]}>EMI Amount</Text>
          <Text style={[s.statRowValue, { color: colors.text }]}>{formatINR(parseFloat(loan.emi_amount) || 0)}</Text>
        </View>
      </View>

      {/* Next EMI + progress */}
      <View style={s.cardBottom}>
        <View>
          <Text style={[s.statRowLabel, { color: colors.textSecondary }]}>Next EMI Date</Text>
          <Text style={[s.nextEmiDate, { color: colors.text }]}>
            {safeFormatDate(loan.next_emi_date)}
          </Text>
        </View>
        <View style={s.progressWrap}>
          <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
            {paidPct.toFixed(0)}% Completed
          </Text>
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: `${paidPct}%` as any }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LoansDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [loans, setLoans] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({
    total_outstanding: 0, total_paid: 0, total_interest: 0, monthly_emi: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'next_emi' | 'outstanding' | 'name'>('next_emi');

  const load = async () => {
    try {
      const [dashRes, loansRes] = await Promise.all([
        api.get('/loans/dashboard'),
        api.get('/loans'),
      ]);
      setDashboard(dashRes.data);
      setLoans(loansRes.data);
    } catch (e) {
      console.error('Loans load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const sortedLoans = [...loans].sort((a, b) => {
    if (sortBy === 'outstanding') return (b.outstanding_amount || 0) - (a.outstanding_amount || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    // next_emi: nulls last
    if (!a.next_emi_date && !b.next_emi_date) return 0;
    if (!a.next_emi_date) return 1;
    if (!b.next_emi_date) return -1;
    return new Date(a.next_emi_date).getTime() - new Date(b.next_emi_date).getTime();
  });

  const handleMenu = (loan: any) => {
    Alert.alert(loan.name, 'Choose an action', [
      { text: 'View Details', onPress: () => router.push({ pathname: '/loans/[id]', params: { id: loan.loan_id } } as any) },
      { text: 'Prepayment', onPress: () => router.push({ pathname: '/loans/prepayment', params: { loan_id: loan.loan_id } } as any) },
      { text: 'Set Reminder', onPress: () => router.push({ pathname: '/loans/reminder', params: { loan_id: loan.loan_id, loan_name: loan.name } } as any) },
      { text: 'Transactions', onPress: () => router.push({ pathname: '/loans/transactions', params: { loan_id: loan.loan_id, loan_name: loan.name } } as any) },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete Loan', `Remove "${loan.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive', onPress: async () => {
                try { await api.delete(`/loans/${loan.loan_id}`); load(); }
                catch { Alert.alert('Error', 'Failed to delete'); }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const cycleSortBy = () => {
    setSortBy(prev => prev === 'next_emi' ? 'outstanding' : prev === 'outstanding' ? 'name' : 'next_emi');
  };

  const sortLabel: Record<string, string> = {
    next_emi: 'Next EMI Date',
    outstanding: 'Outstanding',
    name: 'Name',
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          testID="loans-back-btn"
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Loans &amp; EMIs</Text>
        <TouchableOpacity
          testID="add-loan-btn"
          onPress={() => router.push('/loans/add' as any)}
          style={s.addBtn}
        >
          <Ionicons name="add" size={16} color="#6C47FF" />
          <Text style={s.addBtnText}>Add Loan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C47FF" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Stats Grid */}
        <View style={[s.statsContainer, { backgroundColor: colors.card }]}>
          <View style={s.statsRow}>
            <StatCard label="Total Outstanding" value={dashboard.total_outstanding} color="#6C47FF" icon="trending-down" />
            <StatCard label="Total Paid" value={dashboard.total_paid} color="#22C55E" icon="checkmark-circle" />
          </View>
          <View style={[s.statsDivider, { backgroundColor: colors.border }]} />
          <View style={s.statsRow}>
            <StatCard label="Total Interest" value={dashboard.total_interest} color="#F59E0B" icon="calculator" />
            <StatCard label="Monthly EMI" value={dashboard.monthly_emi} color="#3B82F6" icon="calendar" />
          </View>
        </View>

        {/* Loans List */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Your Loans</Text>
            <TouchableOpacity
              testID="loans-sort-btn"
              style={s.sortBtn}
              onPress={cycleSortBy}
            >
              <Text style={s.sortText}>Sort: {sortLabel[sortBy]}</Text>
              <Ionicons name="swap-vertical" size={14} color="#6C47FF" />
            </TouchableOpacity>
          </View>

          {sortedLoans.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Loans Added</Text>
              <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
                Tap "+ Add Loan" to track your loans and EMIs
              </Text>
              <TouchableOpacity
                testID="empty-add-loan-btn"
                style={s.emptyAddBtn}
                onPress={() => router.push('/loans/add' as any)}
              >
                <Text style={s.emptyAddText}>+ Add Your First Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedLoans.map(loan => (
              <LoanCard
                key={loan.loan_id}
                loan={loan}
                onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.loan_id } } as any)}
                onMenuPress={() => handleMenu(loan)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#6C47FF',
  },
  addBtnText: { color: '#6C47FF', fontSize: 13, fontWeight: '700' },

  // Stats
  statsContainer: { marginHorizontal: 16, borderRadius: 16, padding: 4, marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  statsDivider: { height: 1, marginHorizontal: 4 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 12, margin: 4,
    alignItems: 'flex-start',
  },
  statLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  statIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  // Section
  section: { paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { color: '#6C47FF', fontSize: 13, fontWeight: '600' },

  // Loan Card
  card: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  typeIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardLender: { fontSize: 12 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardStats: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 14,
  },
  statRowLabel: { fontSize: 11, marginBottom: 3 },
  statRowValue: { fontSize: 15, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  nextEmiDate: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  progressWrap: { alignItems: 'flex-end', flex: 1, marginLeft: 16 },
  progressLabel: { fontSize: 11, marginBottom: 5 },
  progressBar: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#6C47FF' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    marginTop: 8, backgroundColor: '#6C47FF',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  emptyAddText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

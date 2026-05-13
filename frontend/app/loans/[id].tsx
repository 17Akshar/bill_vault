/**
 * LoanDetailScreen
 * Shows full loan details, EMI history, and actions.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO, isValid } from 'date-fns';

const LOAN_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  home:       { label: 'Home Loan',       icon: 'home',       color: '#6C47FF' },
  car:        { label: 'Car Loan',        icon: 'car',        color: '#22C55E' },
  personal:   { label: 'Personal Loan',   icon: 'person',     color: '#F59E0B' },
  education:  { label: 'Education Loan',  icon: 'school',     color: '#3B82F6' },
  gold:       { label: 'Gold Loan',       icon: 'diamond',    color: '#EAB308' },
  business:   { label: 'Business Loan',   icon: 'briefcase',  color: '#0EA5E9' },
  property:   { label: 'Loan vs Property',icon: 'business',   color: '#EC4899' },
  vehicle:    { label: 'Two-Wheeler',     icon: 'bicycle',    color: '#14B8A6' },
  other:      { label: 'Other Loan',      icon: 'cash',       color: '#8B5CF6' },
};

function safeDate(value: any, fmt = 'dd MMM yyyy'): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    return isValid(d) ? format(d, fmt) : '—';
  } catch { return '—'; }
}

function StatRow({ label, value, valueColor, colors }: any) {
  return (
    <View style={[dr.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[dr.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[dr.statValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}

const dr = StyleSheet.create({
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },
});

function ActionButton({ icon, label, color, onPress, testID }: any) {
  return (
    <TouchableOpacity testID={testID} style={[ab.btn, { backgroundColor: color + '14' }]} onPress={onPress}>
      <View style={[ab.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[ab.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const ab = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, gap: 6 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

export default function LoanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [loan, setLoan] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [prepayments, setPrepayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    try {
      const [loanRes, txnRes] = await Promise.all([
        api.get(`/loans/${id}`),
        api.get(`/loans/${id}/transactions`).catch(() => ({ data: { transactions: [], prepayments: [] } })),
      ]);
      setLoan(loanRes.data);
      setTxns(txnRes.data.transactions || []);
      setPrepayments(txnRes.data.prepayments || []);
    } catch {
      Alert.alert('Error', 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [id]));

  const handleDelete = () => {
    Alert.alert('Delete Loan', `Remove "${loan?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/loans/${id}`);
            if (router.canGoBack()) router.back();
            else router.replace('/loans' as any);
          } catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Loan Details</Text>
        </View>
        <View style={s.center}>
          <Text style={{ color: colors.textSecondary }}>Loan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const meta = LOAN_TYPE_META[loan.loan_type] ?? LOAN_TYPE_META.other;
  const principal = parseFloat(loan.principal_amount) || 0;
  const outstanding = parseFloat(loan.outstanding_amount) || 0;
  const paid = principal - outstanding;
  const paidPct = principal > 0 ? Math.min((paid / principal) * 100, 100) : 0;
  const tenureMonths = loan.tenure_months || (loan.tenure_years || 1) * 12;
  const endDate = (() => {
    try {
      const d = parseISO(loan.start_date);
      if (isValid(d)) {
        d.setMonth(d.getMonth() + tenureMonths);
        return format(d, 'MMM yyyy');
      }
    } catch { }
    return '—';
  })();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="loan-detail-back" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{loan.name}</Text>
        <TouchableOpacity testID="loan-detail-delete" onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={[s.heroCard, { backgroundColor: meta.color }]}>
          <View style={s.heroRow}>
            <View style={s.heroIcon}>
              <Ionicons name={meta.icon as any} size={30} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{loan.name}</Text>
              {loan.lender && <Text style={s.heroLender}>{loan.lender}</Text>}
            </View>
            <View style={s.statusPill}>
              <Text style={s.statusPillText}>{(loan.status || 'active').toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.heroStats}>
            <View>
              <Text style={s.heroStatLabel}>Outstanding</Text>
              <Text style={s.heroStatValue}>{formatINR(outstanding)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.heroStatLabel}>Monthly EMI</Text>
              <Text style={s.heroStatValue}>{formatINR(parseFloat(loan.emi_amount) || 0)}</Text>
            </View>
          </View>
          {/* Progress */}
          <View style={s.progressSection}>
            <View style={[s.progressBg, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View style={[s.progressFg, { width: `${paidPct}%` as any, backgroundColor: '#FFF' }]} />
            </View>
            <Text style={s.progressTxt}>{paidPct.toFixed(1)}% repaid</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[s.actionsCard, { backgroundColor: colors.card }]}>
          <View style={s.actionsRow}>
            <ActionButton
              testID="action-mark-emi"
              icon="checkmark-circle-outline" label="Mark EMI Paid"
              color="#22C55E"
              onPress={() => router.push({ pathname: '/loans/transactions', params: { loan_id: id, loan_name: loan.name, mode: 'mark_emi' } } as any)}
            />
            <ActionButton
              testID="action-prepayment"
              icon="arrow-down-circle-outline" label="Prepayment"
              color="#6C47FF"
              onPress={() => router.push({ pathname: '/loans/prepayment', params: { loan_id: id } } as any)}
            />
            <ActionButton
              testID="action-set-reminder"
              icon="notifications-outline" label="Set Reminder"
              color="#F59E0B"
              onPress={() => router.push({ pathname: '/loans/reminder', params: { loan_id: id, loan_name: loan.name } } as any)}
            />
            <ActionButton
              testID="action-view-history"
              icon="list-outline" label="History"
              color="#3B82F6"
              onPress={() => router.push({ pathname: '/loans/transactions', params: { loan_id: id, loan_name: loan.name } } as any)}
            />
          </View>
        </View>

        {/* Loan Details */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Loan Details</Text>
          <StatRow label="Loan Type" value={meta.label} colors={colors} />
          <StatRow label="Principal Amount" value={formatINR(principal)} colors={colors} />
          <StatRow label="Interest Rate" value={`${loan.interest_rate || 0}% p.a. (${loan.interest_type || 'Fixed'})`} colors={colors} />
          <StatRow label="Tenure" value={`${tenureMonths} months`} colors={colors} />
          <StatRow label="EMI Day" value={loan.emi_day ? `${loan.emi_day}th of every month` : '—'} colors={colors} />
          <StatRow label="Start Date" value={safeDate(loan.start_date)} colors={colors} />
          <StatRow label="End Date" value={endDate} colors={colors} />
          <StatRow label="Next EMI Date" value={safeDate(loan.next_emi_date)} valueColor="#6C47FF" colors={colors} />
          {loan.processing_fee > 0 && (
            <StatRow label="Processing Fee" value={formatINR(loan.processing_fee)} colors={colors} />
          )}
          {loan.other_charges > 0 && (
            <StatRow label="Other Charges" value={formatINR(loan.other_charges)} colors={colors} />
          )}
          {loan.account_number && (
            <StatRow label="Account Number" value={loan.account_number} colors={colors} />
          )}
          {loan.notes && (
            <View style={{ paddingVertical: 12 }}>
              <Text style={[dr.statLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Notes</Text>
              <Text style={[{ color: colors.text, fontSize: 14 }]}>{loan.notes}</Text>
            </View>
          )}
        </View>

        {/* Repayment Summary */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Repayment Summary</Text>
          <StatRow label="Total Principal" value={formatINR(principal)} colors={colors} />
          <StatRow label="Amount Paid" value={formatINR(Math.max(0, paid))} valueColor="#22C55E" colors={colors} />
          <StatRow label="Outstanding" value={formatINR(outstanding)} valueColor="#EF4444" colors={colors} />
          <View style={[s.progressBarWrap]}>
            <View style={[s.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[s.progressBarFg, { width: `${paidPct}%` as any }]} />
            </View>
            <Text style={[s.progressBarLabel, { color: colors.textSecondary }]}>
              {paidPct.toFixed(1)}% of loan repaid
            </Text>
          </View>
        </View>

        {/* Recent Transactions */}
        {(txns.length > 0 || prepayments.length > 0) && (
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <View style={s.sectionHeaderRow}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/loans/transactions', params: { loan_id: id, loan_name: loan.name } } as any)}>
                <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>
            {[...txns.slice(0, 3).map(t => ({ ...t, _type: 'emi' })),
              ...prepayments.slice(0, 2).map(p => ({ ...p, _type: 'prepay' }))
            ].slice(0, 5).map((item, idx) => (
              <View key={idx} style={[s.txnRow, { borderBottomColor: colors.border }]}>
                <View style={[s.txnIcon, { backgroundColor: item._type === 'prepay' ? '#6C47FF18' : '#22C55E18' }]}>
                  <Ionicons
                    name={item._type === 'prepay' ? 'arrow-down-circle' : 'checkmark-circle'}
                    size={18}
                    color={item._type === 'prepay' ? '#6C47FF' : '#22C55E'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.txnTitle, { color: colors.text }]}>
                    {item._type === 'prepay' ? 'Prepayment' : 'EMI Payment'}
                  </Text>
                  <Text style={[s.txnDate, { color: colors.textSecondary }]}>
                    {safeDate(item.payment_date || item.date)}
                  </Text>
                </View>
                <Text style={[s.txnAmount, { color: item._type === 'prepay' ? '#6C47FF' : '#22C55E' }]}>
                  {formatINR(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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

  heroCard: {
    marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  heroLender: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  statusPill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 3 },
  heroStatValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  progressSection: { gap: 6 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFg: { height: 6, borderRadius: 3 },
  progressTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  actionsCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 10 },

  section: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  progressBarWrap: { paddingVertical: 12, gap: 6 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFg: { height: 6, borderRadius: 3, backgroundColor: '#6C47FF' },
  progressBarLabel: { fontSize: 12 },

  txnRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, gap: 10,
  },
  txnIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontSize: 14, fontWeight: '600' },
  txnDate: { fontSize: 11, marginTop: 1 },
  txnAmount: { fontSize: 14, fontWeight: '700' },
});

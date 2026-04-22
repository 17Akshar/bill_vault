import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

// Mini sparkline chart for Net Worth card
const MiniChart = ({ data, color = '#FFF', h = 40, w = 120 }: { data: number[], color?: string, h?: number, w?: number }) => {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / range) * (h * 0.8) - h * 0.1;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <Svg width={w} height={h}>
      <Path d={pts} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// Donut chart for investments
const DonutChart = ({ segments, size = 100, strokeW = 14 }: { segments: { pct: number, color: string }[], size?: number, strokeW?: number }) => {
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8E8EF" strokeWidth={strokeW} />
      {segments.map((s, i) => {
        const dashLen = (s.pct / 100) * circ;
        const el = (
          <Circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dashLen;
        return el;
      })}
    </Svg>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadAll();
  }, [isAuthenticated]);

  const loadAll = async () => {
    try {
      const [dRes, aRes, iRes, rRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/accounts'),
        api.get('/investments'),
        api.get('/reminders'),
      ]);
      setDashboard(dRes.data);
      setAccounts(aRes.data);
      setInvestments(iRes.data);
      setReminders(rRes.data);
      // Get recent income + expenses for feed
      const [incRes, expRes] = await Promise.all([
        api.get(`/income?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`),
        api.get(`/expenses?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`),
      ]);
      const all = [
        ...incRes.data.map((i: any) => ({ ...i, _type: 'income' })),
        ...expRes.data.map((e: any) => ({ ...e, _type: 'expense' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
      setRecentTx(all);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadAll(); }, []);

  if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const d = dashboard || {};
  const totalBalance = d.total_balance || 0;
  const monthlyIncome = d.monthly_income || 0;
  const monthlyExpenses = d.monthly_expenses || 0;
  const savings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome * 100) : 0;

  // Investment allocation
  const totalInvested = investments.reduce((s: number, i: any) => s + (i.current_value || 0), 0);
  const invTypes: Record<string, { total: number, color: string }> = {};
  const typeColors = ['#5B2FBF', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'];
  investments.forEach((inv: any, idx: number) => {
    const t = inv.investment_type || 'other';
    if (!invTypes[t]) invTypes[t] = { total: 0, color: typeColors[Object.keys(invTypes).length % typeColors.length] };
    invTypes[t].total += inv.current_value || 0;
  });
  const invSegments = Object.entries(invTypes).map(([k, v]) => ({
    label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    pct: totalInvested > 0 ? (v.total / totalInvested) * 100 : 0,
    amount: v.total,
    color: v.color,
  }));

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = user?.name || 'User';

  const acctIcons: Record<string, string> = { bank: 'business-outline', cash: 'cash-outline', upi: 'phone-portrait-outline', credit_card: 'card-outline', wallet: 'wallet-outline' };
  const acctColors: Record<string, string> = { bank: '#3B82F6', cash: '#22C55E', upi: '#8B5CF6', credit_card: '#EC4899', wallet: '#F59E0B' };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.headerAvatar}>
              <Text style={s.headerAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[s.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
              <Text style={[s.userName, { color: colors.text }]}>{userName}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.push('/reminders')}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {reminders.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{reminders.length}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.push('/profile' as any)}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Worth Hero Card */}
        <LinearGradient colors={['#5B2FBF', '#7C5CE7', '#9B7AFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.netWorthCard}>
          <View style={s.nwTop}>
            <View>
              <Text style={s.nwLabel}>Total Net Worth</Text>
              <Text style={s.nwAmount}>{formatINR(totalBalance)}</Text>
            </View>
            <MiniChart data={[totalBalance * 0.7, totalBalance * 0.75, totalBalance * 0.8, totalBalance * 0.85, totalBalance * 0.92, totalBalance]} color="rgba(255,255,255,0.7)" h={45} w={100} />
          </View>
          <View style={s.nwBottom}>
            <TouchableOpacity style={s.nwBtn} onPress={() => router.push('/net-worth')}>
              <Ionicons name="analytics-outline" size={16} color="#FFF" />
              <Text style={s.nwBtnText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nwBtn} onPress={() => router.push('/reports')}>
              <Ionicons name="bar-chart-outline" size={16} color="#FFF" />
              <Text style={s.nwBtnText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={s.quickActions}>
          {[
            { icon: 'add-circle', label: 'Income', color: '#22C55E', route: '/transactions/add?type=income' },
            { icon: 'remove-circle', label: 'Expense', color: '#EF4444', route: '/transactions/add?type=expense' },
            { icon: 'swap-horizontal-outline', label: 'Transfer', color: '#3B82F6', route: '/transactions/add?type=expense' },
            { icon: 'document-text-outline', label: 'Note', color: '#F59E0B', route: '/reminders' },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={s.qaBtn} onPress={() => router.push(a.route as any)}>
              <View style={[s.qaIcon, { backgroundColor: a.color + '15' }]}>
                <Ionicons name={a.icon as any} size={24} color={a.color} />
              </View>
              <Text style={[s.qaLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Income / Expenses / Savings */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[s.smIcon, { backgroundColor: '#22C55E15' }]}><Ionicons name="trending-up" size={18} color="#22C55E" /></View>
            <Text style={[s.smLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[s.smVal, { color: '#22C55E' }]}>{formatINRCompact(monthlyIncome)}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[s.smIcon, { backgroundColor: '#EF444415' }]}><Ionicons name="trending-down" size={18} color="#EF4444" /></View>
            <Text style={[s.smLabel, { color: colors.textSecondary }]}>Expenses</Text>
            <Text style={[s.smVal, { color: '#EF4444' }]}>{formatINRCompact(monthlyExpenses)}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[s.smIcon, { backgroundColor: '#5B2FBF15' }]}><Ionicons name="wallet-outline" size={18} color="#5B2FBF" /></View>
            <Text style={[s.smLabel, { color: colors.textSecondary }]}>Savings</Text>
            <Text style={[s.smVal, { color: savings >= 0 ? '#22C55E' : '#EF4444' }]}>{formatINRCompact(savings)}</Text>
          </View>
        </View>

        {/* Accounts Snapshot */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Accounts</Text>
            <TouchableOpacity onPress={() => router.push('/accounts/add' as any)}><Text style={[s.seeAll, { color: colors.primary }]}>+ Add</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.acctScroll}>
            {accounts.map((acc: any) => (
              <View key={acc.account_id} style={[s.acctCard, { backgroundColor: colors.card }]}>
                <View style={[s.acctIcon, { backgroundColor: (acctColors[acc.account_type] || '#5B2FBF') + '15' }]}>
                  <Ionicons name={(acctIcons[acc.account_type] || 'wallet-outline') as any} size={20} color={acctColors[acc.account_type] || '#5B2FBF'} />
                </View>
                <Text style={[s.acctName, { color: colors.text }]} numberOfLines={1}>{acc.name}</Text>
                <Text style={[s.acctBal, { color: colors.text }]}>{formatINR(acc.balance || acc.initial_balance || 0)}</Text>
                <Text style={[s.acctType, { color: colors.textSecondary }]}>{(acc.account_type || '').replace(/_/g, ' ')}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.acctCard, s.acctAdd, { borderColor: colors.border }]} onPress={() => router.push('/accounts/add' as any)}>
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              <Text style={[s.acctAddLabel, { color: colors.primary }]}>Add Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Investments Overview */}
        {investments.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Investments Overview</Text>
              <TouchableOpacity onPress={() => router.push('/investments')}><Text style={[s.seeAll, { color: colors.primary }]}>View All</Text></TouchableOpacity>
            </View>
            <View style={[s.investCard, { backgroundColor: colors.card }]}>
              <View style={s.investRow}>
                <DonutChart segments={invSegments} size={90} strokeW={12} />
                <View style={s.investLegend}>
                  <Text style={[s.investTotal, { color: colors.text }]}>{formatINR(totalInvested)}</Text>
                  <Text style={[s.investLabel, { color: colors.textSecondary }]}>Total Portfolio</Text>
                  {invSegments.slice(0, 4).map((seg, i) => (
                    <View key={i} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: seg.color }]} />
                      <Text style={[s.legendText, { color: colors.textSecondary }]}>{seg.label}</Text>
                      <Text style={[s.legendVal, { color: colors.text }]}>{seg.pct.toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        {recentTx.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/transactions' as any)}><Text style={[s.seeAll, { color: colors.primary }]}>View All</Text></TouchableOpacity>
            </View>
            <View style={[s.txList, { backgroundColor: colors.card }]}>
              {recentTx.map((tx: any, i: number) => {
                const isIncome = tx._type === 'income';
                const catIcon = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
                return (
                  <View key={tx.income_id || tx.expense_id || i} style={[s.txItem, i < recentTx.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[s.txIcon, { backgroundColor: isIncome ? '#22C55E15' : '#EF444415' }]}>
                      <Ionicons name={catIcon} size={20} color={isIncome ? '#22C55E' : '#EF4444'} />
                    </View>
                    <View style={s.txInfo}>
                      <Text style={[s.txDesc, { color: colors.text }]}>{tx.source || tx.description || tx.category}</Text>
                      <Text style={[s.txMeta, { color: colors.textSecondary }]}>
                        {tx.category}{tx.sub_category ? ` · ${tx.sub_category}` : ''} · {tx.date ? format(parseISO(tx.date), 'dd MMM') : ''}
                      </Text>
                    </View>
                    <Text style={[s.txAmount, { color: isIncome ? '#22C55E' : '#EF4444' }]}>{isIncome ? '+' : '-'}{formatINR(tx.amount)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Upcoming Reminders */}
        {reminders.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Reminders</Text>
              <TouchableOpacity onPress={() => router.push('/reminders')}><Text style={[s.seeAll, { color: colors.primary }]}>View All</Text></TouchableOpacity>
            </View>
            {reminders.slice(0, 3).map((rem: any, i: number) => (
              <View key={rem.reminder_id || i} style={[s.remCard, { backgroundColor: colors.card }]}>
                <View style={[s.remIcon, { backgroundColor: '#F59E0B15' }]}>
                  <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
                </View>
                <View style={s.remInfo}>
                  <Text style={[s.remTitle, { color: colors.text }]}>{rem.title}</Text>
                  <Text style={[s.remDate, { color: colors.textSecondary }]}>{rem.due_date ? format(parseISO(rem.due_date), 'dd MMM yyyy, hh:mm a') : 'No date'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            ))}
          </View>
        )}

        {/* Financial Hub Quick Nav */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text, paddingHorizontal: 20 }]}>Financial Hub</Text>
          <View style={s.hubGrid}>
            {[
              { icon: 'card-outline', label: 'Credit Cards', color: '#EC4899', route: '/credit-cards' },
              { icon: 'business-outline', label: 'Loans & EMI', color: '#3B82F6', route: '/loans' },
              { icon: 'home-outline', label: 'Rentals', color: '#14B8A6', route: '/rentals' },
              { icon: 'people-outline', label: 'Lent/Borrowed', color: '#F97316', route: '/lending' },
              { icon: 'flag-outline', label: 'Budgets', color: '#6366F1', route: '/budgets' },
              { icon: 'receipt-outline', label: 'Bills', color: '#EF4444', route: '/(tabs)/bills' },
            ].map((h, i) => (
              <TouchableOpacity key={i} style={[s.hubItem, { backgroundColor: colors.card }]} onPress={() => router.push(h.route as any)}>
                <View style={[s.hubIcon, { backgroundColor: h.color + '15' }]}>
                  <Ionicons name={h.icon as any} size={22} color={h.color} />
                </View>
                <Text style={[s.hubLabel, { color: colors.text }]}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#5B2FBF', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  greeting: { fontSize: 13, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  // Net Worth Hero
  netWorthCard: { marginHorizontal: 20, borderRadius: 20, padding: 24, marginBottom: 20 },
  nwTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  nwLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  nwAmount: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 6 },
  nwBottom: { flexDirection: 'row', gap: 12 },
  nwBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  nwBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  // Quick Actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 20 },
  qaBtn: { alignItems: 'center', gap: 6 },
  qaIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600' },
  // Summary Row
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  smIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  smLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  smVal: { fontSize: 15, fontWeight: 'bold' },
  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  // Accounts
  acctScroll: { paddingLeft: 20, paddingRight: 10 },
  acctCard: { width: 140, borderRadius: 14, padding: 14, marginRight: 10 },
  acctAdd: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  acctAddLabel: { fontSize: 12, fontWeight: '600' },
  acctIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  acctName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  acctBal: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  acctType: { fontSize: 11, textTransform: 'capitalize' },
  // Investments
  investCard: { marginHorizontal: 20, borderRadius: 16, padding: 20 },
  investRow: { flexDirection: 'row', alignItems: 'center' },
  investLegend: { flex: 1, marginLeft: 20 },
  investTotal: { fontSize: 18, fontWeight: 'bold' },
  investLabel: { fontSize: 12, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendText: { flex: 1, fontSize: 12 },
  legendVal: { fontSize: 12, fontWeight: '600' },
  // Transactions
  txList: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txMeta: { fontSize: 11 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  // Reminders
  remCard: { marginHorizontal: 20, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  remIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  remInfo: { flex: 1 },
  remTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  remDate: { fontSize: 12 },
  // Hub
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  hubItem: { width: (SW - 52) / 3, borderRadius: 14, padding: 14, alignItems: 'center' },
  hubIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  hubLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';

const { width: SW } = Dimensions.get('window');

interface HubModule {
  icon: string;
  label: string;
  color: string;
  route: string;
  desc: string;
}

const HUB_MODULES: HubModule[] = [
  { icon: 'receipt-outline', label: 'Bills', color: '#EF4444', route: '/bills/add', desc: 'Track & pay bills' },
  { icon: 'card-outline', label: 'Credit Cards', color: '#EC4899', route: '/credit-cards', desc: 'Card management' },
  { icon: 'business-outline', label: 'Loans & EMI', color: '#3B82F6', route: '/loans', desc: 'Loan tracking' },
  { icon: 'trending-up-outline', label: 'Investments', color: '#22C55E', route: '/investments', desc: 'Portfolio tracker' },
  { icon: 'home-outline', label: 'Rentals', color: '#14B8A6', route: '/rentals', desc: 'Rental income' },
  { icon: 'people-outline', label: 'Lent/Borrowed', color: '#F97316', route: '/lending', desc: 'Track lending' },
  { icon: 'flag-outline', label: 'Budgets', color: '#6366F1', route: '/budgets', desc: 'Budget limits' },
  { icon: 'analytics-outline', label: 'Net Worth', color: '#8B5CF6', route: '/net-worth', desc: 'Wealth overview' },
  { icon: 'bar-chart-outline', label: 'Reports', color: '#0EA5E9', route: '/reports', desc: 'Financial reports' },
  { icon: 'alarm-outline', label: 'Reminders', color: '#F59E0B', route: '/reminders', desc: 'Due date alerts' },
];

export default function HubScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBills: 0, overdue: 0, upcoming: 0, overdueAmount: 0 });

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const res = await api.get(`/bills?month=${month}&year=${year}`);
      const allBills = res.data || [];
      setBills(allBills);

      const now = new Date();
      const overdueBills = allBills.filter((b: any) => b.payment_status !== 'paid' && new Date(b.due_date) < now);
      const upcomingBills = allBills.filter((b: any) => b.payment_status !== 'paid' && new Date(b.due_date) >= now);
      const overdueAmount = overdueBills.reduce((s: number, b: any) => s + (b.amount || 0), 0);

      setStats({
        totalBills: allBills.length,
        overdue: overdueBills.length,
        upcoming: upcomingBills.length,
        overdueAmount,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Hub</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            All your finances, one place
          </Text>
        </View>

        {/* Bills Summary Alert */}
        {stats.overdue > 0 && (
          <TouchableOpacity
            style={[styles.alertCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}
            onPress={() => router.push('/bills/add' as any)}
          >
            <View style={[styles.alertIcon, { backgroundColor: '#EF444425' }]}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
            </View>
            <View style={styles.alertInfo}>
              <Text style={[styles.alertTitle, { color: '#EF4444' }]}>
                {stats.overdue} overdue bill{stats.overdue > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.alertAmount, { color: colors.textSecondary }]}>
                Total: {formatINR(stats.overdueAmount)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="receipt" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>{stats.totalBills}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Bills</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="time" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>{stats.upcoming}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Upcoming</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22C55E15' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {stats.totalBills - stats.overdue - stats.upcoming}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
          </View>
        </View>

        {/* Module Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Modules</Text>
        </View>

        <View style={styles.moduleGrid}>
          {HUB_MODULES.map((mod, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.moduleCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(mod.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '15' }]}>
                <Ionicons name={mod.icon as any} size={24} color={mod.color} />
              </View>
              <Text style={[styles.moduleLabel, { color: colors.text }]}>{mod.label}</Text>
              <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>{mod.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Bills */}
        {bills.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Bills</Text>
              <TouchableOpacity onPress={() => router.push('/bills/add' as any)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Add New</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.billsList, { backgroundColor: colors.card }]}>
              {bills.slice(0, 4).map((bill: any, i: number) => {
                const isPaid = bill.payment_status === 'paid';
                const isOverdue = !isPaid && new Date(bill.due_date) < new Date();
                return (
                  <TouchableOpacity
                    key={bill.bill_id || i}
                    style={[styles.billItem, i < Math.min(bills.length, 4) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => router.push(`/bills/${bill.bill_id}` as any)}
                  >
                    <View style={[styles.billIcon, {
                      backgroundColor: isPaid ? '#22C55E15' : isOverdue ? '#EF444415' : '#F59E0B15'
                    }]}>
                      <Ionicons
                        name={isPaid ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
                        size={20}
                        color={isPaid ? '#22C55E' : isOverdue ? '#EF4444' : '#F59E0B'}
                      />
                    </View>
                    <View style={styles.billInfo}>
                      <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>
                      <Text style={[styles.billMeta, { color: colors.textSecondary }]}>
                        {bill.category} {bill.due_date ? `· Due ${format(parseISO(bill.due_date), 'dd MMM')}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.billAmount, {
                      color: isPaid ? '#22C55E' : isOverdue ? '#EF4444' : colors.text
                    }]}>
                      {formatINR(bill.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  // Alert
  alertCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 14,
    borderRadius: 14, marginBottom: 16, borderWidth: 1,
  },
  alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  alertAmount: { fontSize: 12 },
  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  // Module Grid
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  moduleCard: { width: (SW - 52) / 2, borderRadius: 16, padding: 16 },
  moduleIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  moduleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  moduleDesc: { fontSize: 11, fontWeight: '500' },
  // Bills List
  recentSection: { marginBottom: 10 },
  billsList: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  billItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  billIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  billInfo: { flex: 1 },
  billName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  billMeta: { fontSize: 11 },
  billAmount: { fontSize: 14, fontWeight: '700' },
});

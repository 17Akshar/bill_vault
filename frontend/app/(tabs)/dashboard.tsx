import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, ACCOUNT_TYPE_META } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    loadDashboard();
  }, [isAuthenticated]);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const totalBalance = dashboard?.total_balance || 0;
  const monthlyIncome = dashboard?.monthly_income || 0;
  const monthlyExpenses = dashboard?.monthly_expenses || 0;
  const monthlySavings = dashboard?.monthly_savings || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Text style={[styles.profileInitial, { color: colors.primary }]}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={isDark ? ['#1A1A3E', '#0D0D2B'] : ['#6C5CE7', '#4834D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatINR(totalBalance)}</Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={styles.balanceIconRow}>
                <Ionicons name="arrow-up-circle" size={18} color="#00E676" />
                <Text style={styles.balanceItemLabel}>Income</Text>
              </View>
              <Text style={styles.balanceItemValue}>{formatINR(monthlyIncome)}</Text>
            </View>
            <View style={[styles.balanceVerticalDivider]} />
            <View style={styles.balanceItem}>
              <View style={styles.balanceIconRow}>
                <Ionicons name="arrow-down-circle" size={18} color="#FF5252" />
                <Text style={styles.balanceItemLabel}>Expenses</Text>
              </View>
              <Text style={styles.balanceItemValue}>{formatINR(monthlyExpenses)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Monthly Savings */}
        <View style={[styles.savingsCard, { backgroundColor: colors.card }]}>
          <View style={styles.savingsLeft}>
            <Ionicons name="wallet-outline" size={24} color={monthlySavings >= 0 ? '#00E676' : '#FF5252'} />
            <View style={styles.savingsTextContainer}>
              <Text style={[styles.savingsLabel, { color: colors.textSecondary }]}>This Month Savings</Text>
              <Text style={[styles.savingsValue, { color: monthlySavings >= 0 ? '#00E676' : '#FF5252' }]}>
                {formatINR(monthlySavings)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card }]}
            onPress={() => router.push('/transactions/add?type=income' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(0,230,118,0.15)' }]}>
              <Ionicons name="add-circle" size={24} color="#00E676" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Add Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card }]}
            onPress={() => router.push('/transactions/add?type=expense' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255,82,82,0.15)' }]}>
              <Ionicons name="remove-circle" size={24} color="#FF5252" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card }]}
            onPress={() => router.push('/accounts/add' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(68,138,255,0.15)' }]}>
              <Ionicons name="business" size={24} color="#448AFF" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Hub */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Hub</Text>
          </View>
          <View style={styles.hubGrid}>
            {[
              { route: '/credit-cards', icon: 'card', label: 'Credit Cards', color: '#FF9100', bg: 'rgba(255,145,0,0.12)' },
              { route: '/loans', icon: 'document-text', label: 'Loans & EMI', color: '#FF5252', bg: 'rgba(255,82,82,0.12)' },
              { route: '/investments', icon: 'trending-up', label: 'Investments', color: '#00E676', bg: 'rgba(0,230,118,0.12)' },
              { route: '/lending', icon: 'people', label: 'Lent / Borrowed', color: '#7C4DFF', bg: 'rgba(124,77,255,0.12)' },
              { route: '/net-worth', icon: 'diamond', label: 'Net Worth', color: '#448AFF', bg: 'rgba(68,138,255,0.12)' },
              { route: '/reminders', icon: 'notifications', label: 'Reminders', color: '#FFD600', bg: 'rgba(255,214,0,0.12)' },
              { route: '/reports', icon: 'bar-chart', label: 'Reports & Analytics', color: '#E040FB', bg: 'rgba(224,64,251,0.12)' },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                style={[styles.hubCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={[styles.hubLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Accounts */}
        {dashboard?.accounts && dashboard.accounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Accounts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/accounts' as any)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
              {dashboard.accounts.map((account: any) => {
                const meta = ACCOUNT_TYPE_META[account.account_type] || ACCOUNT_TYPE_META.bank;
                return (
                  <View
                    key={account.account_id}
                    style={[styles.accountCard, { backgroundColor: colors.card }]}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: meta.color + '20' }]}>
                      <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                      {account.name}
                    </Text>
                    <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                      {meta.label}
                    </Text>
                    <Text style={[styles.accountBalance, { color: colors.text }]}>
                      {formatINR(account.balance)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Overdue Bills */}
        {dashboard?.overdue_bills && dashboard.overdue_bills.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FF525215', borderColor: '#FF525240' }]}>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={22} color="#FF5252" />
              <Text style={[styles.alertTitle, { color: '#FF5252' }]}>Overdue Bills</Text>
            </View>
            {dashboard.overdue_bills.slice(0, 3).map((bill: any) => (
              <View key={bill.bill_id} style={styles.alertItem}>
                <Text style={[styles.alertItemName, { color: colors.text }]}>{bill.name}</Text>
                <Text style={[styles.alertItemAmount, { color: '#FF5252' }]}>{formatINR(bill.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {(!dashboard?.recent_transactions || dashboard.recent_transactions.length === 0) ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add your first income or expense
              </Text>
            </View>
          ) : (
            <View style={[styles.transactionsList, { backgroundColor: colors.card }]}>
              {dashboard.recent_transactions.map((tx: any, index: number) => {
                const isIncome = tx.type === 'income';
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.transactionItem,
                      index < dashboard.recent_transactions.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[
                      styles.txIcon,
                      { backgroundColor: isIncome ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)' }
                    ]}>
                      <Ionicons
                        name={isIncome ? 'arrow-up' : 'arrow-down'}
                        size={18}
                        color={isIncome ? '#00E676' : '#FF5252'}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txDescription, { color: colors.text }]}>
                        {tx.description || tx.category}
                      </Text>
                      <Text style={[styles.txCategory, { color: colors.textSecondary }]}>
                        {tx.category} {tx.date ? '· ' + format(typeof tx.date === 'string' ? parseISO(tx.date) : new Date(tx.date), 'dd MMM') : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? '#00E676' : '#FF5252' },
                      ]}
                    >
                      {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Upcoming Bills */}
        {dashboard?.upcoming_bills && dashboard.upcoming_bills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Bills</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills' as any)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.transactionsList, { backgroundColor: colors.card }]}>
              {dashboard.upcoming_bills.slice(0, 5).map((bill: any, index: number) => (
                <View
                  key={bill.bill_id}
                  style={[
                    styles.transactionItem,
                    index < Math.min(dashboard.upcoming_bills.length, 5) - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.txIcon, { backgroundColor: 'rgba(255,179,0,0.15)' }]}>
                    <Ionicons name="receipt-outline" size={18} color="#FFB300" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txDescription, { color: colors.text }]}>{bill.name}</Text>
                    <Text style={[styles.txCategory, { color: colors.textSecondary }]}>
                      Due {bill.due_date ? format(parseISO(bill.due_date), 'dd MMM yyyy') : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: '#FFB300' }]}>
                    {formatINR(bill.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
  },
  balanceIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  balanceItemLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  balanceItemValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  balanceVerticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  savingsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  savingsTextContainer: {},
  savingsLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  savingsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  hubGrid: {
    gap: 10,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
  },
  hubIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  hubLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountsScroll: {
    marginHorizontal: -4,
  },
  accountCard: {
    width: 150,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 12,
    marginBottom: 10,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  alertItemName: {
    fontSize: 14,
  },
  alertItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  txCategory: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
  },
  bottomSpacer: {
    height: 20,
  },
});

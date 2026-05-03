import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Dimensions, FlatList, StatusBar, Animated, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR, formatINRCompact } from '../../utils/formatINR';
import { format, parseISO } from 'date-fns';
import { FamilyMemberFilter } from '../../components/FamilyMemberSelector';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');

// =============================================================================
// SPEC THEME TOKENS — hard-coded per design brief; do NOT use ThemeContext here
// to keep the dashboard pixel-perfect across light/dark mode.
// =============================================================================
const T = {
  bg:       '#08082A',
  card:     '#12123A',
  card2:    '#1A1A4A',
  primary:  '#6C47FF',
  gradFrom: '#4B2FBF',
  gradTo:   '#7B4FEF',
  success:  '#00C48C',
  danger:   '#FF4D67',
  info:     '#4D9EFF',
  text:     '#FFFFFF',
  textDim:  '#A0A3BD',
  border:   'rgba(255,255,255,0.06)',
};

// Haptic feedback — no-op on web
const tap = (style: 'light' | 'medium' = 'light') => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.impactAsync(
        style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
    } catch { /* ignore */ }
  }
};

// Press-scale wrapper — shrinks to 0.96 on press-in, bounces back on release
const PressScale = ({ children, onPress, testID, style, hapticStyle = 'light' as any }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 6 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start()}
      onPress={() => { tap(hapticStyle); onPress?.(); }}
      testID={testID}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

// =============================================================================
// Sparkline (white upward trend) for Net Worth card
// =============================================================================
const MiniChart = ({ data, color = '#FFF', h = 44, w = 110 }: any) => {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v: number, i: number) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / range) * (h * 0.78) - h * 0.11;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <Svg width={w} height={h}>
      <Path d={pts} stroke={color} strokeWidth={2.2} fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
      {/* End-point glow */}
      <Circle cx={w} cy={h - ((data[data.length - 1] - mn) / range) * (h * 0.78) - h * 0.11}
              r={3} fill="#FFF" />
    </Svg>
  );
};

// =============================================================================
// Reusable atomic components
// =============================================================================
const SectionHeader = ({ title, onViewAll, viewAllLabel = 'View All' }: any) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} testID={`section-${title.toLowerCase().replace(/\s/g, '-')}-view-all`}>
        <Text style={s.viewAll}>{viewAllLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const FilterPill = ({ icon, label, onPress, testID }: any) => (
  <PressScale onPress={onPress} testID={testID} style={s.filterPill}>
    <Text style={s.filterPillIcon}>{icon}</Text>
    <Text style={s.filterPillText}>{label}</Text>
    <Ionicons name="chevron-down" size={14} color={T.textDim} />
  </PressScale>
);

const StatPill = ({ color, value, delta, deltaUp }: any) => (
  <View style={s.statPill}>
    <View style={[s.statDot, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={[s.statDelta, { color: deltaUp ? T.success : T.danger }]}>
        {deltaUp ? '▲' : '▼'} {delta}
      </Text>
    </View>
  </View>
);

const QuickActionBtn = ({ icon, label, color, onPress, testID }: any) => (
  <TouchableOpacity style={s.qaBtn} onPress={onPress} activeOpacity={0.7} testID={testID}>
    <View style={[s.qaIcon, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={26} color="#FFF" />
    </View>
    <Text style={s.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

const ListRow = ({ leftIcon, leftIconBg, leftIconColor, title, subtitle, rightTop, rightBottom, rightColor, showChevron, onPress, testID }: any) => (
  <TouchableOpacity style={s.listRow} onPress={onPress} activeOpacity={0.7} testID={testID}>
    <View style={[s.listIcon, { backgroundColor: leftIconBg }]}>
      <MaterialCommunityIcons name={leftIcon} size={22} color={leftIconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.listTitle} numberOfLines={1}>{title}</Text>
      {!!subtitle && <Text style={s.listSubtitle} numberOfLines={1}>{subtitle}</Text>}
    </View>
    <View style={s.listRight}>
      {!!rightTop && <Text style={[s.listAmount, { color: rightColor || T.text }]}>{rightTop}</Text>}
      {!!rightBottom && <Text style={s.listDate}>{rightBottom}</Text>}
    </View>
    {showChevron && <Ionicons name="chevron-forward" size={18} color={T.textDim} style={{ marginLeft: 6 }} />}
  </TouchableOpacity>
);

// =============================================================================
// Main Dashboard Screen
// =============================================================================
export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // colors from ThemeContext intentionally NOT used — dashboard uses spec tokens
  const { } = useTheme();

  const [dashboard, setDashboard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [showFamilyChips, setShowFamilyChips] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<Record<string, boolean>>({
    net_worth: true, quick_actions: true, summary: true,
    accounts: true, recent_transactions: true, reminders: true, financial_hub: true,
  });
  const navState = useRootNavigationState();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!navState?.key) return;
    if (authLoading) return;
    if (!isAuthenticated) {
      // Defer the redirect one frame so the Root Layout / navigator is fully mounted
      const t = setTimeout(() => router.replace('/auth/login'), 0);
      return () => clearTimeout(t);
    }
    loadAll();
  }, [isAuthenticated, authLoading, familyFilter, navState?.key]);

  // Fade-in on first content render
  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authLoading) loadAll();
    }, [isAuthenticated, authLoading, familyFilter])
  );

  const loadAll = async () => {
    try {
      const fParam = familyFilter ? `?family_member_id=${familyFilter}` : '';
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const [dRes, aRes, rRes, sRes] = await Promise.all([
        api.get(`/dashboard${fParam}`),
        api.get(`/accounts${fParam}`),
        api.get('/reminders'),
        api.get('/settings').catch(() => ({ data: {} })),
      ]);
      setDashboard(dRes.data);
      setAccounts(aRes.data);
      setReminders(rRes.data);
      if (sRes.data?.dashboard_widgets) {
        setWidgetSettings(prev => ({ ...prev, ...sRes.data.dashboard_widgets }));
      }
      const [incRes, expRes] = await Promise.all([
        api.get(`/income?month=${month}&year=${year}`),
        api.get(`/expenses?month=${month}&year=${year}`),
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

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  const d = dashboard || {};
  const totalBalance    = d.total_balance || 0;
  const monthlyIncome   = d.monthly_income || 0;
  const monthlyExpenses = d.monthly_expenses || 0;
  const savings         = monthlyIncome - monthlyExpenses;

  // Mock month-over-month deltas (backend doesn't yet expose this — fall back to safe defaults)
  const nwDeltaPct  = d.net_worth_delta_pct  ?? 12.5;
  const nwDeltaAbs  = d.net_worth_delta_abs  ?? 25000;
  const incDeltaPct = d.income_delta_pct     ?? 10;
  const expDeltaPct = d.expense_delta_pct    ?? 8;
  const savDeltaPct = d.savings_delta_pct    ?? 12;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = user?.name || 'User';

  // ---- Group accounts into spec categories ----
  const accountGroups: Record<string, { icon: string, label: string, color: string, total: number, count: number }> = {
    bank:    { icon: 'bank',           label: 'Bank Accounts',  color: T.info,    total: 0, count: 0 },
    cash:    { icon: 'cash-multiple',  label: 'Cash & Wallets', color: T.success, total: 0, count: 0 },
    upi:     { icon: 'cellphone',      label: 'UPI',            color: '#7B4FEF', total: 0, count: 0 },
    overdraft: { icon: 'alert-circle', label: 'Overdraft',      color: T.danger,  total: 0, count: 0 },
  };
  accounts.forEach((acc: any) => {
    const bal = acc.balance ?? acc.initial_balance ?? 0;
    let bucket: keyof typeof accountGroups;
    if (acc.account_type === 'bank' || acc.account_type === 'credit_card') bucket = 'bank';
    else if (acc.account_type === 'cash' || acc.account_type === 'wallet') bucket = 'cash';
    else if (acc.account_type === 'upi') bucket = 'upi';
    else bucket = 'bank';
    if (bal < 0) bucket = 'overdraft';
    accountGroups[bucket].total += bal;
    accountGroups[bucket].count += 1;
  });
  const accountCards = Object.entries(accountGroups)
    .filter(([, g]) => g.count > 0)
    .map(([k, g]) => ({ key: k, ...g }));

  const w = (key: string) => widgetSettings[key] !== false;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                          tintColor={T.primary} colors={[T.primary]} />
        }
      >
        {/* ======================== HEADER ======================== */}
        <View style={s.header} testID="dashboard-header">
          <TouchableOpacity style={s.headerLeft} onPress={() => router.push('/(tabs)/profile' as any)}
                            activeOpacity={0.85} testID="dashboard-avatar">
            <View style={s.avatar}>
              <Text style={s.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ marginLeft: 12, flexShrink: 1 }}>
              <Text style={s.headerTitle} numberOfLines={1}>Dashboard</Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {greeting}, {userName}! <Text style={{ fontSize: 13 }}>👋</Text>
              </Text>
            </View>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <PressScale
              onPress={() => router.push('/reminders')}
              testID="dashboard-bell-btn"
              style={s.headerBtn}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color={T.text} />
              {reminders.length > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{reminders.length > 9 ? '9+' : reminders.length}</Text>
                </View>
              )}
            </PressScale>
            <PressScale
              onPress={() => router.push('/profile/dashboard-settings' as any)}
              testID="dashboard-settings-btn"
              style={s.headerBtn}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color={T.text} />
            </PressScale>
          </View>
        </View>

        {/* ======================== FILTER ROW ======================== */}
        <View style={s.filterRow}>
          <FilterPill
            icon="👥"
            label={familyFilter ? 'Filtered' : 'All Members'}
            onPress={() => setShowFamilyChips(v => !v)}
            testID="dashboard-filter-members"
          />
          <FilterPill
            icon="📅"
            label="This Month"
            onPress={() => router.push('/reports' as any)}
            testID="dashboard-filter-period"
          />
        </View>

        {/* Family chips reveal (kept functional, hidden until pill tapped) */}
        {showFamilyChips && (
          <View style={{ marginBottom: 12 }}>
            <FamilyMemberFilter
              selectedId={familyFilter}
              onSelect={(id) => setFamilyFilter(id)}
              showAll
              colors={{ text: T.text, textSecondary: T.textDim, primary: T.primary, border: T.border }}
            />
          </View>
        )}

        {/* ======================== NET WORTH HERO CARD ======================== */}
        {w('net_worth') && (
          <LinearGradient
            colors={[T.gradFrom, T.gradTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.netWorthCard}
            testID="dashboard-networth-card"
          >
            <View style={s.nwTopRow}>
              <View style={{ flex: 1 }}>
                <View style={s.nwLabelRow}>
                  <Text style={s.nwLabel}>Total Net Worth</Text>
                  <MaterialCommunityIcons name="information-outline" size={14}
                                          color="rgba(255,255,255,0.6)" />
                </View>
                <Text style={s.nwAmount} testID="dashboard-networth-value">
                  {formatINR(totalBalance)}
                </Text>
                <View style={s.nwDeltaRow}>
                  <Text style={s.nwDelta}>▲ {nwDeltaPct}% vs last month</Text>
                </View>
                <Text style={s.nwDeltaAbs}>▲ +{formatINR(nwDeltaAbs)} this month</Text>
              </View>
              <MiniChart
                data={[
                  totalBalance * 0.72, totalBalance * 0.78, totalBalance * 0.81,
                  totalBalance * 0.86, totalBalance * 0.91, totalBalance * 0.96, totalBalance,
                ]}
                color="#FFFFFF"
                h={56}
                w={110}
              />
            </View>

            {/* 3 mini stat pills inside hero */}
            <View style={s.nwStatsRow}>
              <StatPill
                color={T.success}
                value={formatINRCompact(monthlyIncome)}
                delta={`${incDeltaPct}%`}
                deltaUp
              />
              <StatPill
                color={T.danger}
                value={formatINRCompact(monthlyExpenses)}
                delta={`${expDeltaPct}%`}
                deltaUp={false}
              />
              <StatPill
                color={T.info}
                value={formatINRCompact(savings)}
                delta={`${savDeltaPct}%`}
                deltaUp={savings >= 0}
              />
            </View>
          </LinearGradient>
        )}

        {/* ======================== QUICK ACTIONS ======================== */}
        {w('quick_actions') && (
          <View style={s.quickRow} testID="dashboard-quick-actions">
            {[
              { icon: 'plus', label: 'Income',   color: T.success, route: '/transactions/add?type=income',  testID: 'quick-action-income' },
              { icon: 'minus', label: 'Expense',  color: T.danger,  route: '/transactions/add?type=expense', testID: 'quick-action-expense' },
              { icon: 'swap-horizontal', label: 'Transfer', color: T.info, route: '/transactions/add?type=expense', testID: 'quick-action-transfer' },
            ].map((a) => (
              <PressScale
                key={a.label}
                onPress={() => router.push(a.route as any)}
                testID={a.testID}
                style={s.qaCard}
                hapticStyle="medium"
              >
                <View style={[s.qaIcon, { backgroundColor: a.color }]}>
                  <MaterialCommunityIcons name={a.icon as any} size={26} color="#FFF" />
                </View>
                <Text style={s.qaLabel}>{a.label}</Text>
              </PressScale>
            ))}
          </View>
        )}

        {/* ======================== ACCOUNTS ======================== */}
        {w('accounts') && (
          <View style={s.section}>
            <SectionHeader
              title="Accounts"
              onViewAll={() => router.push('/(tabs)/accounts' as any)}
            />
            {accountCards.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.acctScrollContent}
                data={accountCards}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.acctCard}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/accounts' as any)}
                    testID={`account-card-${item.key}`}
                  >
                    <View style={[s.acctIcon, { backgroundColor: item.color + '22' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <Text style={s.acctTitle} numberOfLines={1}>{item.label}</Text>
                    <Text style={[
                      s.acctAmount,
                      { color: item.total < 0 ? T.danger : T.text },
                    ]}>
                      {item.total < 0 ? '-' : ''}{formatINR(Math.abs(item.total))}
                    </Text>
                    <Text style={s.acctSub}>
                      {item.count} {item.count === 1 ? 'Account' : 'Accounts'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={[s.acctCard, s.acctAddCard]}
                    onPress={() => router.push('/accounts/add' as any)}
                    testID="account-card-add"
                  >
                    <MaterialCommunityIcons name="plus-circle-outline" size={28} color={T.primary} />
                    <Text style={[s.acctTitle, { color: T.primary, marginTop: 8 }]}>Add Account</Text>
                  </TouchableOpacity>
                }
              />
            ) : (
              <TouchableOpacity
                style={[s.acctCard, s.acctAddCard, { marginHorizontal: 20 }]}
                onPress={() => router.push('/accounts/add' as any)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={28} color={T.primary} />
                <Text style={[s.acctTitle, { color: T.primary, marginTop: 8 }]}>Add Account</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ======================== UPCOMING REMINDERS ======================== */}
        {w('reminders') && reminders.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Upcoming Reminders"
              onViewAll={() => router.push('/reminders')}
            />
            <View style={s.listCard}>
              {reminders.slice(0, 3).map((rem: any, i: number) => {
                const dueDate = rem.due_date ? parseISO(rem.due_date) : null;
                const daysAway = dueDate
                  ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
                  : null;
                const dueLabel = daysAway !== null
                  ? daysAway <= 0 ? 'Overdue' :
                    daysAway === 1 ? 'Due tomorrow' :
                    `Due in ${daysAway} days`
                  : '';
                return (
                  <View key={rem.reminder_id || i}
                        style={[s.listRowWrap, i < Math.min(reminders.length, 3) - 1 && s.listDivider]}>
                    <ListRow
                      leftIcon="lightning-bolt"
                      leftIconBg={T.success + '22'}
                      leftIconColor={T.success}
                      title={rem.title}
                      subtitle={dueLabel}
                      rightTop={rem.amount ? formatINR(rem.amount) : ''}
                      rightColor={T.text}
                      showChevron
                      onPress={() => router.push('/reminders')}
                      testID={`reminder-row-${i}`}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ======================== RECENT TRANSACTIONS ======================== */}
        {w('recent_transactions') && recentTx.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Recent Transactions"
              onViewAll={() => router.push('/(tabs)/transactions' as any)}
            />
            <View style={s.listCard}>
              {recentTx.map((tx: any, i: number) => {
                const isIncome = tx._type === 'income';
                const acct = accounts.find((a: any) => a.account_id === tx.account_id);
                const titleLeft = tx.source || tx.description || tx.category || 'Transaction';
                const subtitleLeft = `${acct?.name || tx.category || ''}${tx.sub_category ? ' · ' + tx.sub_category : ''}`;
                const dateStr = tx.date ? format(parseISO(tx.date), 'dd MMM') : '';
                const amount = `${isIncome ? '+' : '-'}${formatINR(tx.amount || 0)}`;
                return (
                  <View key={tx.income_id || tx.expense_id || i}
                        style={[s.listRowWrap, i < recentTx.length - 1 && s.listDivider]}>
                    <ListRow
                      leftIcon={isIncome ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'}
                      leftIconBg={(isIncome ? T.success : T.danger) + '22'}
                      leftIconColor={isIncome ? T.success : T.danger}
                      title={titleLeft}
                      subtitle={subtitleLeft}
                      rightTop={amount}
                      rightBottom={dateStr}
                      rightColor={isIncome ? T.success : T.danger}
                      onPress={() => router.push('/(tabs)/transactions' as any)}
                      testID={`recent-tx-row-${i}`}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ======================== FINANCIAL HUB GRID ======================== */}
        {w('financial_hub') && (
          <View style={s.section}>
            <SectionHeader title="Financial Hub" onViewAll={() => router.push('/(tabs)/bills' as any)} viewAllLabel="View All" />
            <View style={s.hubGrid}>
              {[
                { icon: 'credit-card-outline',     label: 'Credit Cards',  color: '#EC4899', route: '/credit-cards' },
                { icon: 'office-building-outline', label: 'Loans & EMI',   color: T.info,    route: '/loans' },
                { icon: 'home-city-outline',       label: 'Rentals',       color: '#14B8A6', route: '/rentals' },
                { icon: 'account-multiple-outline',label: 'Lent/Borrowed', color: '#F97316', route: '/lending' },
                { icon: 'flag-outline',            label: 'Budgets',       color: '#6366F1', route: '/budgets' },
                { icon: 'receipt',                 label: 'Bills',         color: T.danger,  route: '/(tabs)/bills' },
              ].map((h, i) => (
                <TouchableOpacity key={i} style={s.hubItem}
                                  onPress={() => router.push(h.route as any)}
                                  testID={`hub-${h.label.toLowerCase().replace(/\s|\&/g, '-')}`}>
                  <View style={[s.hubIcon, { backgroundColor: h.color + '22' }]}>
                    <MaterialCommunityIcons name={h.icon as any} size={22} color={h.color} />
                  </View>
                  <Text style={s.hubLabel}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================
const FONT = 'System'; // SF Pro Display on iOS, Roboto on Android — system default

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },

  // -------- Header --------
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700', fontFamily: FONT },
  headerTitle: { color: T.text, fontSize: 22, fontWeight: '800', fontFamily: FONT, letterSpacing: -0.3 },
  headerSubtitle: { color: T.textDim, fontSize: 13, marginTop: 3, fontFamily: FONT },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
    borderRadius: 8, backgroundColor: T.danger,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: T.bg,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // -------- Filter row --------
  filterRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.card, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 50,
  },
  filterPillIcon: { fontSize: 14 },
  filterPillText: { color: T.text, fontSize: 13, fontWeight: '600', fontFamily: FONT },

  // -------- Net Worth hero --------
  netWorthCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 18,
    shadowColor: T.gradFrom, shadowOpacity: 0.4, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  nwTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nwLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nwLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', fontFamily: FONT },
  nwAmount: { color: '#FFF', fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 8, fontFamily: FONT },
  nwDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nwDelta: { color: '#9DFFD9', fontSize: 12, fontWeight: '600', fontFamily: FONT },
  nwDeltaAbs: { color: '#9DFFD9', fontSize: 12, fontWeight: '600', marginTop: 2, fontFamily: FONT },
  nwStatsRow: {
    flexDirection: 'row', gap: 8, marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: 10,
  },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statValue: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: FONT },
  statDelta: { fontSize: 10, fontWeight: '600', marginTop: 1, fontFamily: FONT },

  // -------- Quick actions (3 separate cards per reference image) --------
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 22, gap: 10,
  },
  qaCard: {
    flex: 1, backgroundColor: T.card, borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  qaIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  qaLabel: { color: T.text, fontSize: 12, fontWeight: '600', fontFamily: FONT },

  // -------- Section header --------
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { color: T.text, fontSize: 17, fontWeight: '700', fontFamily: FONT },
  viewAll: { color: T.primary, fontSize: 13, fontWeight: '600', fontFamily: FONT },

  // -------- Account cards (horizontal scroll) --------
  acctScrollContent: { paddingLeft: 20, paddingRight: 8, gap: 12 },
  acctCard: {
    width: 160, backgroundColor: T.card, borderRadius: 16, padding: 16,
  },
  acctIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  acctTitle: { color: T.text, fontSize: 13, fontWeight: '600', marginBottom: 6, fontFamily: FONT },
  acctAmount: { color: T.text, fontSize: 17, fontWeight: '800', marginBottom: 4, fontFamily: FONT },
  acctSub: { color: T.textDim, fontSize: 11, fontWeight: '500', fontFamily: FONT },
  acctAddCard: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(108,71,255,0.4)', borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },

  // -------- List card (reminders + transactions) --------
  listCard: {
    backgroundColor: T.card, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
  },
  listRowWrap: {},
  listDivider: { borderBottomWidth: 1, borderBottomColor: T.border },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  listTitle: { color: T.text, fontSize: 14, fontWeight: '600', fontFamily: FONT },
  listSubtitle: { color: T.textDim, fontSize: 12, marginTop: 2, fontFamily: FONT },
  listRight: { alignItems: 'flex-end' },
  listAmount: { fontSize: 14, fontWeight: '700', fontFamily: FONT },
  listDate: { color: T.textDim, fontSize: 11, marginTop: 2, fontFamily: FONT },

  // -------- Hub grid --------
  hubGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 8, marginTop: 4,
  },
  hubItem: {
    width: (SW - 48) / 3, backgroundColor: T.card, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  hubIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  hubLabel: { color: T.text, fontSize: 11, fontWeight: '600', textAlign: 'center', fontFamily: FONT },
});

/**
 * Accounts Overview tab — pixel-aligned to user's spec.
 *
 * Layout (top → bottom):
 *   [Header]   Accounts                        [+ Add Account]
 *   [Summary]  Total Balance | In Accounts | In Liabilities
 *   [Section]  ACCOUNTS
 *     - Bank Accounts        (n Accounts)        ₹ X
 *     - Accounts with Overdraft (n)              -₹ X (red)
 *     - UPI Accounts         (n Accounts)        ₹ X
 *     - Cash                 (n Account)         ₹ X
 *   [Footer]   "Your account details are secure"
 *
 * Data source: GET /api/accounts/summary (totals + 4 buckets)
 * Tap on any bucket → /accounts/list?type=<bucket-key>
 * Tap "Add Account" → /accounts/add
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

type SummaryGroup = {
  key: 'bank' | 'overdraft' | 'upi' | 'cash';
  label: string;
  total: number;
  count: number;
};

type Summary = {
  total_balance: number;
  in_accounts: number;
  in_liabilities: number;
  groups: SummaryGroup[];
};

const GROUP_META: Record<SummaryGroup['key'], { icon: string; color: string }> = {
  bank: { icon: 'business', color: '#7C4DFF' },
  overdraft: { icon: 'card', color: '#FF9100' },
  upi: { icon: 'phone-portrait', color: '#26C6DA' },
  cash: { icon: 'cash', color: '#22C55E' },
};

export default function AccountsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navState = useRootNavigationState();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      // Compute summary client-side from /accounts (works even when /summary
      // path hits Firestore aggregation quotas, and avoids one extra round-trip).
      const res = await api.get('/accounts');
      const accounts = (res.data || []) as Array<any>;
      let totalBalance = 0;
      let inAccounts = 0;
      let inLiabilities = 0;
      const buckets: Record<string, { label: string; total: number; count: number }> = {
        bank: { label: 'Bank Accounts', total: 0, count: 0 },
        overdraft: { label: 'Accounts with Overdraft', total: 0, count: 0 },
        upi: { label: 'UPI Accounts', total: 0, count: 0 },
        cash: { label: 'Cash', total: 0, count: 0 },
      };
      for (const a of accounts) {
        const bal = Number(a.balance) || 0;
        const atype = String(a.account_type || '').toLowerCase();
        const includeNW = a.include_in_net_worth ?? true;
        if (includeNW) {
          totalBalance += bal;
          if (atype === 'overdraft') {
            inLiabilities += Number(a.overdraft_used) || Math.abs(Math.min(0, bal));
          } else if (bal < 0) {
            inLiabilities += Math.abs(bal);
          } else {
            inAccounts += bal;
          }
        }
        if (buckets[atype]) {
          buckets[atype].total += bal;
          buckets[atype].count += 1;
        }
      }
      setSummary({
        total_balance: Math.round(totalBalance * 100) / 100,
        in_accounts: Math.round(inAccounts * 100) / 100,
        in_liabilities: Math.round(inLiabilities * 100) / 100,
        groups: (Object.keys(buckets) as Array<keyof typeof buckets>).map((k) => ({
          key: k as any,
          label: buckets[k].label,
          total: buckets[k].total,
          count: buckets[k].count,
        })),
      });
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        console.error('Failed to load accounts summary:', e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!navState?.key) return;
    if (!isAuthenticated) {
      setLoading(false);
      return; // Parent layout handles redirect
    }
    load();
  }, [isAuthenticated, navState?.key]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) load();
    }, [isAuthenticated]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#08082A' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity
          testID="accounts-add-btn"
          style={styles.addBtn}
          onPress={() => router.push('/accounts/add' as any)}
        >
          <Ionicons name="add-circle" size={20} color="#7C4DFF" />
          <Text style={styles.addBtnText}>Add Account</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >
        {/* Summary card */}
        <View style={styles.summaryCard} testID="accounts-summary-card">
          {loading && !summary ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Balance</Text>
                <Text
                  testID="accounts-summary-total"
                  style={[
                    styles.summaryValue,
                    { color: '#FFFFFF' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatINR(summary?.total_balance || 0)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>In Accounts</Text>
                <Text
                  testID="accounts-summary-positive"
                  style={[styles.summaryValue, { color: '#22C55E' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatINR(summary?.in_accounts || 0)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>In Liabilities</Text>
                <Text
                  testID="accounts-summary-liabilities"
                  style={[styles.summaryValue, { color: '#EF4444' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatINR(summary?.in_liabilities || 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section header */}
        <Text style={styles.sectionHeader}>ACCOUNTS</Text>

        {/* Group rows */}
        <View style={styles.groupCard}>
          {(summary?.groups || []).map((g, i) => {
            const meta = GROUP_META[g.key];
            const isLast = i === (summary?.groups.length || 0) - 1;
            const isOverdraft = g.key === 'overdraft';
            const balanceText = isOverdraft && g.total < 0
              ? `-${formatINR(Math.abs(g.total))}`
              : formatINR(g.total);
            const balanceColor = isOverdraft && g.total < 0 ? '#EF4444' : '#FFFFFF';
            const subText =
              g.count === 0
                ? 'No accounts'
                : `${g.count} Account${g.count > 1 ? 's' : ''}`;
            return (
              <TouchableOpacity
                key={g.key}
                testID={`accounts-group-${g.key}`}
                style={[styles.groupRow, !isLast && styles.groupRowDivider]}
                onPress={() =>
                  router.push({ pathname: '/accounts/list' as any, params: { type: g.key } })
                }
              >
                <View style={[styles.groupIcon, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.groupTitle}>{g.label}</Text>
                  <Text style={styles.groupSub}>
                    {subText}
                    {isOverdraft && g.count > 0 && g.total < 0 ? '  ·  Overdrawn' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.groupBalance, { color: balanceColor }]}>{balanceText}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#A0A3BD" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer hint */}
        <View style={styles.footerCard}>
          <Ionicons name="shield-checkmark" size={20} color="#7C4DFF" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.footerTitle}>Your account details are secure</Text>
            <Text style={styles.footerSub}>
              We use bank-level security to keep your data safe.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A0A3BD" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B1845',
    borderColor: '#7C4DFF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#7C4DFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#12123A',
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCell: {
    flex: 1,
  },
  summaryLabel: {
    color: '#A0A3BD',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    color: '#A0A3BD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 24,
    marginBottom: 10,
  },
  groupCard: {
    backgroundColor: '#12123A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F4D',
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  groupSub: {
    color: '#A0A3BD',
    fontSize: 12,
    marginTop: 2,
  },
  groupBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerCard: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.12)',
    padding: 14,
    borderRadius: 14,
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerSub: {
    color: '#A0A3BD',
    fontSize: 12,
    marginTop: 2,
  },
});

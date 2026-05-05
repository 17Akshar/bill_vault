/**
 * Accounts list — drill-down view from the Accounts overview.
 *
 * URL: /accounts/list?type=bank|cash|upi|overdraft
 *
 * Shows just the accounts of the requested type with edit/delete controls.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

type AccountType = 'bank' | 'cash' | 'upi' | 'overdraft';

type AccountItem = {
  account_id: string;
  name: string;
  account_type: string;
  balance: number;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  institution?: string;
  branch_name?: string;
  cash_location?: string;
  overdraft_limit?: number;
  overdraft_used?: number;
  is_primary_upi?: boolean;
  color?: string;
};

const TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Bank Accounts',
  cash: 'Cash',
  upi: 'UPI Accounts',
  overdraft: 'Accounts with Overdraft',
};

const TYPE_COLOR: Record<AccountType, string> = {
  bank: '#7C4DFF',
  overdraft: '#FF9100',
  upi: '#26C6DA',
  cash: '#22C55E',
};

export default function AccountsListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = ((params.type as string) || 'bank') as AccountType;

  const [items, setItems] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/accounts', { params: { account_type: type } });
      setItems(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  useFocusEffect(useCallback(() => { load(); }, [type]));

  const accent = TYPE_COLOR[type] || '#7C4DFF';

  const handleDelete = (acc: AccountItem) => {
    Alert.alert(
      'Delete Account',
      `Deactivate "${acc.name}"? Transaction history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/accounts/${acc.account_id}`);
              load();
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: AccountItem }) => {
    const overdraftUsed = item.overdraft_used ?? Math.abs(Math.min(0, item.balance || 0));
    const subParts: string[] = [];
    if (type === 'bank') {
      if (item.institution) subParts.push(item.institution);
      if (item.account_number) subParts.push(`A/c ****${String(item.account_number).slice(-4)}`);
      if (item.ifsc_code) subParts.push(item.ifsc_code);
    } else if (type === 'upi') {
      if (item.upi_id) subParts.push(item.upi_id);
      if (item.is_primary_upi) subParts.push('Primary');
    } else if (type === 'cash') {
      if (item.cash_location) subParts.push(item.cash_location);
    } else if (type === 'overdraft') {
      if (item.institution) subParts.push(item.institution);
      if (item.overdraft_limit) subParts.push(`Limit ${formatINR(item.overdraft_limit)}`);
    }
    const primaryDisplay =
      type === 'overdraft'
        ? `-${formatINR(overdraftUsed)}`
        : formatINR(item.balance || 0);
    const primaryColor =
      type === 'overdraft' ? '#EF4444' : (item.balance || 0) < 0 ? '#EF4444' : '#FFFFFF';

    return (
      <View style={[styles.itemCard]}>
        <View style={[styles.itemDot, { backgroundColor: item.color || accent }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          {subParts.length > 0 && (
            <Text style={styles.itemSub} numberOfLines={1}>
              {subParts.join(' · ')}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <Text style={[styles.itemBalance, { color: primaryColor }]}>{primaryDisplay}</Text>
        </View>
        <TouchableOpacity
          testID={`account-row-delete-${item.account_id}`}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#A0A3BD" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#08082A' }]}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="accounts-list-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/accounts' as any))}
          style={{ padding: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{TYPE_LABEL[type]}</Text>
        <TouchableOpacity
          testID="accounts-list-add"
          onPress={() => router.push({ pathname: '/accounts/add' as any, params: { type } })}
        >
          <Ionicons name="add" size={26} color={accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.account_id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#FFFFFF"
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="folder-open-outline" size={40} color="#A0A3BD" />
              <Text style={{ color: '#A0A3BD', marginTop: 8 }}>No {TYPE_LABEL[type].toLowerCase()} yet</Text>
              <TouchableOpacity
                testID="accounts-list-empty-add"
                style={[styles.emptyBtn, { backgroundColor: accent }]}
                onPress={() => router.push({ pathname: '/accounts/add' as any, params: { type } })}
              >
                <Text style={styles.emptyBtnText}>+ Add {type === 'cash' ? 'Cash Account' : `${type.toUpperCase()} Account`}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12123A',
    borderRadius: 14,
    padding: 14,
  },
  itemDot: {
    width: 8,
    height: 36,
    borderRadius: 4,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    color: '#A0A3BD',
    fontSize: 12,
    marginTop: 2,
  },
  itemBalance: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBtn: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

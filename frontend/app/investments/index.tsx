import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { INVESTMENT_TYPES, INVESTMENT_CATEGORIES, getInvestmentType } from './types';

export default function InvestmentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [investments, setInvestments] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [investmentsRes, dashboardRes] = await Promise.all([
        api.get('/investments'),
        api.get('/investments/dashboard'),
      ]);
      setInvestments(investmentsRes.data);
      setDashboard(dashboardRes.data);
    } catch (e) {
      console.error('Failed to load investments:', e);
      Alert.alert('Error', 'Failed to load investments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleDeleteInvestment = useCallback((inv: any) => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to remove "${inv.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/investments/${inv.investment_id}`);
              load();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete investment');
            }
          },
        },
      ]
    );
  }, [load]);

  const filteredInvestments = useMemo(() => {
    return selectedCategory
      ? investments.filter(inv => {
          const type = getInvestmentType(inv.investment_type);
          return type?.category === selectedCategory;
        })
      : investments;
  }, [investments, selectedCategory]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderInvestmentCard = (item: any) => {
    const type = getInvestmentType(item.investment_type);
    if (!type) return null;

    const gainLoss = item.current_value - item.invested_amount;
    const gainLossPct = item.invested_amount > 0 ? (gainLoss / item.invested_amount) * 100 : 0;
    const gainLossColor = gainLoss >= 0 ? '#00E676' : '#FF5252';

    return (
      <TouchableOpacity
        key={item.investment_id}
        style={[styles.invCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/investments/${item.investment_id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.invHeader}>
          <View style={[styles.invIcon, { backgroundColor: type.color + '20' }]}>
            <Ionicons name={type.icon as any} size={22} color={type.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.invName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.invType, { color: colors.textSecondary }]}>{type.label}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: item.status === 'active' ? '#00E67615' : item.status === 'matured' ? '#448AFF15' : '#64748B15'
          }]}>
            <Text style={{ 
              color: item.status === 'active' ? '#00E676' : item.status === 'matured' ? '#448AFF' : '#64748B',
              fontSize: 11,
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.invStats}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invested</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(item.invested_amount)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(item.current_value)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gain/Loss</Text>
            <Text style={[styles.statValue, { color: gainLossColor }]}>
              {gainLoss >= 0 ? '+' : ''}{formatINR(Math.abs(gainLoss))}
            </Text>
            <Text style={{ color: gainLossColor, fontSize: 11, fontWeight: '600' }}>
              ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%)
            </Text>
          </View>
        </View>

        <View style={styles.invActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]}
            onPress={() => router.push(`/investments/${item.investment_id}` as any)}
          >
            <Ionicons name="eye-outline" size={14} color="#448AFF" />
            <Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]}
            onPress={() => handleDeleteInvestment(item)}
          >
            <Ionicons name="trash-outline" size={14} color="#FF5252" />
            <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Investments</Text>
        <TouchableOpacity onPress={() => router.push('/investments/select-type' as any)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Portfolio Summary */}
      {dashboard && (
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Total Portfolio Value</Text>
          <Text style={[styles.summaryAmount, { color: colors.text }]}>
            {formatINR(dashboard.total_current_value)}
          </Text>
          
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Invested</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatINR(dashboard.total_invested)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Gain/Loss</Text>
              <Text style={[styles.summaryValue, { color: dashboard.total_gain_loss >= 0 ? '#00E676' : '#FF5252' }]}>
                {dashboard.total_gain_loss >= 0 ? '+' : ''}{formatINR(dashboard.total_gain_loss)}
              </Text>
              <Text style={{ 
                color: dashboard.total_gain_loss >= 0 ? '#00E676' : '#FF5252',
                fontSize: 13,
                fontWeight: '700'
              }}>
                ({dashboard.gain_loss_percentage >= 0 ? '+' : ''}{dashboard.gain_loss_percentage}%)
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: colors.background }]}>
              <Ionicons name="briefcase-outline" size={18} color="#448AFF" />
              <Text style={[styles.statChipLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.statChipValue, { color: colors.text }]}>{dashboard.total_count}</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.background }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#00E676" />
              <Text style={[styles.statChipLabel, { color: colors.textSecondary }]}>Active</Text>
              <Text style={[styles.statChipValue, { color: colors.text }]}>{dashboard.by_status.active}</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.background }]}>
              <Ionicons name="calendar-outline" size={18} color="#FFB300" />
              <Text style={[styles.statChipLabel, { color: colors.textSecondary }]}>Matured</Text>
              <Text style={[styles.statChipValue, { color: colors.text }]}>{dashboard.by_status.matured || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={[{ key: null, label: 'All', icon: 'apps', color: colors.primary }, ...INVESTMENT_CATEGORIES]}
          keyExtractor={(item) => item.key || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                selectedCategory === item.key && { 
                  backgroundColor: item.color + '20', 
                  borderColor: item.color 
                },
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={16} 
                color={selectedCategory === item.key ? item.color : colors.textSecondary} 
              />
              <Text style={{ 
                color: selectedCategory === item.key ? item.color : colors.text,
                fontSize: 12,
                fontWeight: '600'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Investments List */}
      <FlatList
        data={filteredInvestments}
        keyExtractor={(item) => item.investment_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => renderInvestmentCard(item)}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No investments yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Tap + to add your first investment
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/investments/select-type' as any)}
            >
              <Text style={styles.emptyBtnText}>Add Investment</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 14, marginBottom: 8, opacity: 0.7 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statChipLabel: { fontSize: 11 },
  statChipValue: { fontSize: 16, fontWeight: 'bold' },
  filterSection: { marginBottom: 12 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  invCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  invHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  invIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  invName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  invType: { fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold' },
  invActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

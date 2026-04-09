import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';

const TYPE_COLORS: Record<string, string> = {
  stocks: '#448AFF', mutual_fund: '#00E676', fd: '#FFB300', rd: '#FF9100',
  ppf: '#7C4DFF', nps: '#00BCD4', gold: '#FFD600', real_estate: '#E91E63',
  crypto: '#FF5252', other: '#78909C',
};

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Stocks', mutual_fund: 'Mutual Funds', fd: 'Fixed Deposit', rd: 'Recurring Deposit',
  ppf: 'PPF', nps: 'NPS', gold: 'Gold', real_estate: 'Real Estate',
  crypto: 'Crypto', other: 'Other',
};

export default function InvestmentAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTab, setShowTab] = useState<'top' | 'bottom'>('top');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/analytics/investment');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const s = data?.summary || {};
  const allocation = data?.allocation || [];
  const donutData = allocation.map((a: any) => ({
    value: a.current, color: TYPE_COLORS[a.type] || '#78909C', label: TYPE_LABELS[a.type] || a.type,
  }));

  const performers = showTab === 'top' ? (data?.top_performers || []) : (data?.bottom_performers || []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Investment Analytics</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Summary Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Invested</Text>
              <Text style={[styles.heroValue, { color: colors.text }]}>{formatINR(s.total_invested || 0)}</Text>
            </View>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Current</Text>
              <Text style={[styles.heroValue, { color: colors.text }]}>{formatINR(s.total_current || 0)}</Text>
            </View>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Returns</Text>
              <Text style={[styles.heroValue, { color: (s.total_returns || 0) >= 0 ? '#00E676' : '#FF5252' }]}>
                {(s.total_returns || 0) >= 0 ? '+' : ''}{formatINR(s.total_returns || 0)}
              </Text>
            </View>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Return %</Text>
              <Text style={[styles.heroValue, { color: (s.total_returns_pct || 0) >= 0 ? '#00E676' : '#FF5252' }]}>
                {(s.total_returns_pct || 0) >= 0 ? '+' : ''}{s.total_returns_pct || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Portfolio Allocation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Portfolio Allocation</Text>
        {allocation.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.donutContainer}>
              <DonutChart data={donutData} size={180} strokeWidth={22}
                centerValue={`${s.total_investments || 0}`} centerLabel="Holdings" centerColor={colors.text} />
            </View>
            <View style={styles.legendGrid}>
              {allocation.map((a: any, i: number) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: TYPE_COLORS[a.type] || '#78909C' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legendLabel, { color: colors.text }]}>{TYPE_LABELS[a.type] || a.type}</Text>
                    <Text style={[styles.legendValue, { color: colors.textSecondary }]}>{formatINR(a.current)} · {a.percentage}%</Text>
                  </View>
                  <Text style={[styles.legendReturn, { color: a.returns >= 0 ? '#00E676' : '#FF5252' }]}>
                    {a.returns >= 0 ? '+' : ''}{a.returns_pct}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add investments to see allocation</Text>
          </View>
        )}

        {/* Top / Bottom Performers */}
        <View style={styles.perfHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Performers</Text>
          <View style={styles.perfTabs}>
            <TouchableOpacity style={[styles.perfTab, showTab === 'top' && { backgroundColor: '#00E676' }]} onPress={() => setShowTab('top')}>
              <Ionicons name="arrow-up" size={14} color={showTab === 'top' ? '#000' : colors.textSecondary} />
              <Text style={{ color: showTab === 'top' ? '#000' : colors.text, fontSize: 12, fontWeight: '600' }}>Top</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.perfTab, showTab === 'bottom' && { backgroundColor: '#FF5252' }]} onPress={() => setShowTab('bottom')}>
              <Ionicons name="arrow-down" size={14} color={showTab === 'bottom' ? '#FFF' : colors.textSecondary} />
              <Text style={{ color: showTab === 'bottom' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>Bottom</Text>
            </TouchableOpacity>
          </View>
        </View>
        {performers.length > 0 ? performers.map((p: any, i: number) => (
          <View key={i} style={[styles.perfCard, { backgroundColor: colors.card }]}>
            <View style={styles.perfRank}>
              <Text style={[styles.perfRankText, { color: showTab === 'top' ? '#00E676' : '#FF5252' }]}>#{i + 1}</Text>
            </View>
            <View style={styles.perfInfo}>
              <Text style={[styles.perfName, { color: colors.text }]}>{p.name}</Text>
              <Text style={[styles.perfType, { color: colors.textSecondary }]}>
                {TYPE_LABELS[p.type] || p.type} · CAGR: {p.cagr}%
              </Text>
            </View>
            <View style={styles.perfRight}>
              <Text style={[styles.perfReturn, { color: p.returns >= 0 ? '#00E676' : '#FF5252' }]}>
                {p.returns >= 0 ? '+' : ''}{p.returns_pct}%
              </Text>
              <Text style={[styles.perfAmount, { color: colors.textSecondary }]}>{formatINR(p.current)}</Text>
            </View>
          </View>
        )) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No investments to analyze</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { paddingHorizontal: 20 },
  heroCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  heroRow: { flexDirection: 'row', marginBottom: 16 },
  heroCol: { flex: 1 },
  heroLabel: { fontSize: 12, marginBottom: 4 },
  heroValue: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sectionCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  donutContainer: { alignItems: 'center', marginBottom: 20 },
  legendGrid: { gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 14, fontWeight: '500' },
  legendValue: { fontSize: 11 },
  legendReturn: { fontSize: 13, fontWeight: '700' },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 14 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  perfTabs: { flexDirection: 'row', gap: 6 },
  perfTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  perfCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8 },
  perfRank: { width: 32, alignItems: 'center' },
  perfRankText: { fontSize: 16, fontWeight: 'bold' },
  perfInfo: { flex: 1, marginLeft: 8 },
  perfName: { fontSize: 15, fontWeight: '600' },
  perfType: { fontSize: 12, marginTop: 2 },
  perfRight: { alignItems: 'flex-end' },
  perfReturn: { fontSize: 16, fontWeight: 'bold' },
  perfAmount: { fontSize: 11, marginTop: 2 },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';

const PURPLE      = '#8E2DE2';
const GREEN       = '#51DB7A';
const CAT_COLORS = [GREEN, '#26C6DA', PURPLE, '#FFB300', '#FF9100', '#E91E8C', '#448AFF', '#66BB6A'];

function metaFor(key: string, idx: number) {
  const cat = INCOME_CATEGORIES.find(c => c.key === key);
  return {
    icon: (cat?.icon as any) || 'cash-outline',
    color: CAT_COLORS[idx % CAT_COLORS.length],
    label: cat?.label || key,
  };
}

export default function IncomeSourcesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<any[]>([]);

  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/income?month=${m}&year=${y}`);
      setIncomes(res.data || []);
    } catch { setIncomes([]); }
    finally { setLoading(false); }
  }, [m, y]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  // Aggregate per category showing this-month total / count / avg + last entry
  const byCat: Record<string, { category: string; total: number; count: number; lastDate: string | null }> = {};
  incomes.forEach((it: any) => {
    const c = it.category || 'other';
    if (!byCat[c]) byCat[c] = { category: c, total: 0, count: 0, lastDate: null };
    byCat[c].total += it.amount || 0;
    byCat[c].count += 1;
    if (!byCat[c].lastDate || it.date > byCat[c].lastDate) byCat[c].lastDate = it.date;
  });
  const rows = INCOME_CATEGORIES.map((cat, i) => {
    const data = byCat[cat.key] || { category: cat.key, total: 0, count: 0, lastDate: null };
    return {
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      color: CAT_COLORS[i % CAT_COLORS.length],
      total: data.total,
      count: data.count,
      avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
      lastDate: data.lastDate,
    };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-sources-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Income Sources</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{format(new Date(), 'MMMM yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/income/add')} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-sources-add">
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }} testID="income-sources-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <>
            <View style={[s.summary, { backgroundColor: CARD_BG }]} testID="income-sources-summary">
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>This Month</Text>
                <Text style={{ color: GREEN, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 }}>{formatINR(grandTotal)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  across {rows.filter(r => r.total > 0).length} source{rows.filter(r => r.total > 0).length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={[s.summaryIcon, { backgroundColor: GREEN + '22' }]}>
                <Ionicons name="trending-up" size={24} color={GREEN} />
              </View>
            </View>

            {rows.map((r, i) => {
              const empty = r.total === 0;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => router.push({ pathname: '/income/add', params: { } } as any)}
                  style={[s.card, { backgroundColor: CARD_BG, opacity: empty ? 0.55 : 1 }]}
                  activeOpacity={0.85}
                  testID={`income-source-${r.key}`}
                >
                  <View style={s.cardTop}>
                    <View style={[s.icon, { backgroundColor: r.color + '22' }]}>
                      <Ionicons name={r.icon as any} size={22} color={r.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.label, { color: colors.text }]}>{r.label}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>
                        {empty ? 'No income this month' : `${r.count} entr${r.count === 1 ? 'y' : 'ies'} · avg ${formatINR(r.avg)}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: empty ? colors.textSecondary : GREEN, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
                        {empty ? '—' : `+${formatINR(r.total)}`}
                      </Text>
                      {r.lastDate && (
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                          last {format(new Date(r.lastDate), 'dd MMM')}
                        </Text>
                      )}
                    </View>
                  </View>
                  {!empty && grandTotal > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, overflow: 'hidden' }}>
                        <View style={{ height: 7, width: `${(r.total / grandTotal) * 100}%`, backgroundColor: r.color, borderRadius: 4 }}>
                          <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                        </View>
                      </View>
                      <Text style={{ color: r.color, fontSize: 11, fontWeight: '800', minWidth: 40, textAlign: 'right' }}>
                        {((r.total / grandTotal) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  summary:    { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 18, marginBottom: 16 },
  summaryIcon:{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  card:       { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:       { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label:      { fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
});

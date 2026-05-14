import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, parseISO, addDays, addMonths, addWeeks, addYears, differenceInDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';

const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREEN       = '#51DB7A';
const RED         = '#FF4A4A';
const GREY        = '#8B8B8B';
const CAT_COLORS = [GREEN, '#26C6DA', PURPLE, '#FFB300', '#FF9100', '#E91E8C', '#448AFF', '#66BB6A'];

const FREQ_LABELS: Record<string, string> = {
  monthly:   'Monthly',
  weekly:    'Weekly',
  biweekly:  'Bi-weekly',
  quarterly: 'Quarterly',
  yearly:    'Yearly',
};

function metaFor(key: string) {
  const cat = INCOME_CATEGORIES.find(c => c.key === key);
  const idx = INCOME_CATEGORIES.findIndex(c => c.key === key);
  return {
    icon: (cat?.icon as any) || 'cash-outline',
    color: CAT_COLORS[(idx >= 0 ? idx : 0) % CAT_COLORS.length],
    label: cat?.label || (key || 'Other'),
  };
}

function nextDueFor(lastDate: string, freq: string): Date {
  const d = parseISO(lastDate);
  switch (freq) {
    case 'weekly':    return addWeeks(d, 1);
    case 'biweekly':  return addWeeks(d, 2);
    case 'quarterly': return addMonths(d, 3);
    case 'yearly':    return addYears(d, 1);
    default:          return addMonths(d, 1);
  }
}

export default function RecurringIncomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [recurring, setRecurring] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch last 90 days to find latest occurrences of each recurring source
      const now = new Date();
      const start = addDays(now, -180).toISOString();
      const end   = now.toISOString();
      const res = await api.get(`/income`, { params: { start_date: start, end_date: end } });
      const all = (res.data || []).filter((it: any) => (it.labels || []).includes('recurring'));

      // Group by source (latest entry per source = canonical)
      const map: Record<string, any> = {};
      for (const it of all) {
        const key = `${it.source}::${it.category}`;
        if (!map[key] || it.date > map[key].date) map[key] = it;
      }
      const list = Object.values(map).map((it: any) => {
        const freq = (it.labels || []).find((l: string) => l.startsWith('freq:'))?.replace('freq:', '') || 'monthly';
        const next = nextDueFor(it.date, freq);
        const daysUntil = differenceInDays(next, new Date());
        return { ...it, freq, next, daysUntil };
      }).sort((a: any, b: any) => a.daysUntil - b.daysUntil);
      setRecurring(list);
    } catch { setRecurring([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  const monthlyEquivalent = recurring.reduce((sum, r) => {
    const amt = r.amount || 0;
    switch (r.freq) {
      case 'weekly':    return sum + amt * 4.33;
      case 'biweekly':  return sum + amt * 2.17;
      case 'quarterly': return sum + amt / 3;
      case 'yearly':    return sum + amt / 12;
      default:          return sum + amt;
    }
  }, 0);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="recurring-income-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Recurring Income</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>Regular receipts you expect</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/income/add')} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="recurring-income-add">
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }} testID="recurring-income-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : recurring.length === 0 ? (
          <View style={[s.empty, { backgroundColor: CARD_BG }]} testID="recurring-income-empty">
            <Ionicons name="repeat-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 12 }}>No recurring income</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>
              When you add income, toggle "Recurring Income" to track regular receipts like salary, rent, or dividends here.
            </Text>
            <TouchableOpacity onPress={() => router.push('/income/add')} style={s.emptyBtn} testID="recurring-income-empty-add">
              <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtnInner}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Add Recurring Income</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Hero — monthly equivalent */}
            <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero} testID="recurring-income-hero">
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>Monthly Equivalent</Text>
              <Text style={{ color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 }}>{formatINR(Math.round(monthlyEquivalent))}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                {recurring.length} recurring source{recurring.length === 1 ? '' : 's'} · normalized to per-month
              </Text>
            </LinearGradient>

            {/* List */}
            {recurring.map((it: any, i: number) => {
              const meta = metaFor(it.category);
              const overdue = it.daysUntil < 0;
              const upcoming = it.daysUntil >= 0 && it.daysUntil <= 7;
              const dueColor = overdue ? RED : upcoming ? '#FFB300' : GREEN;
              const dueLabel = overdue
                ? `${Math.abs(it.daysUntil)}d overdue`
                : it.daysUntil === 0
                ? 'Due today'
                : `in ${it.daysUntil}d`;
              return (
                <TouchableOpacity
                  key={it.income_id}
                  onPress={() => router.push({ pathname: '/income/add', params: { id: it.income_id } } as any)}
                  style={[s.card, { backgroundColor: CARD_BG }]}
                  activeOpacity={0.85}
                  testID={`recurring-income-row-${i}`}
                >
                  <View style={s.cardTop}>
                    <View style={[s.icon, { backgroundColor: meta.color + '22' }]}>
                      <Ionicons name={meta.icon} size={22} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{it.source || meta.label}</Text>
                        <View style={[s.freqPill, { backgroundColor: PURPLE + '22' }]}>
                          <Text style={{ color: PURPLE, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>{FREQ_LABELS[it.freq] || 'Monthly'}</Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>
                        {meta.label} · last {format(parseISO(it.date), 'dd MMM')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: GREEN, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 }}>+{formatINR(it.amount)}</Text>
                      <View style={[s.duePill, { backgroundColor: dueColor + '22' }]}>
                        <Ionicons name={overdue ? 'alert-circle' : 'time-outline'} size={10} color={dueColor} />
                        <Text style={{ color: dueColor, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>{dueLabel}</Text>
                      </View>
                    </View>
                  </View>
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

  hero:       { borderRadius: 20, padding: 20, marginBottom: 16 },

  card:       { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:       { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:       { fontSize: 14, fontWeight: '800', letterSpacing: -0.1, flexShrink: 1 },
  freqPill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  duePill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, marginTop: 5 },

  empty:      { padding: 36, borderRadius: 18, alignItems: 'center' },
  emptyBtn:   { marginTop: 18, borderRadius: 999, overflow: 'hidden' },
  emptyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10 },
});

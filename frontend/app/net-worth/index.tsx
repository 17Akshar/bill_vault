import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

export default function NetWorthScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const res = await api.get('/net-worth'); setData(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!data) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Failed to load</Text></View>;

  const sections = [
    { title: 'Assets', items: [
      { label: 'Bank & Cash Accounts', value: data.assets.accounts.total, color: '#448AFF', icon: 'business-outline', count: data.assets.accounts.items.length },
      { label: 'Investments', value: data.assets.investments.total, color: '#00E676', icon: 'trending-up-outline', count: data.assets.investments.items.length },
      { label: 'Money Lent', value: data.assets.money_lent.total, color: '#7C4DFF', icon: 'arrow-up-outline', count: data.assets.money_lent.items.length },
    ]},
    { title: 'Liabilities', items: [
      { label: 'Credit Card Outstanding', value: data.liabilities.credit_cards.total, color: '#FF9100', icon: 'card-outline', count: data.liabilities.credit_cards.items.length },
      { label: 'Loan Outstanding', value: data.liabilities.loans.total, color: '#FF5252', icon: 'document-text-outline', count: data.liabilities.loans.items.length },
      { label: 'Money Borrowed', value: data.liabilities.money_borrowed.total, color: '#FF6B81', icon: 'arrow-down-outline', count: data.liabilities.money_borrowed.items.length },
    ]},
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Net Worth</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        <LinearGradient colors={isDark ? ['#1A1A3E', '#0D0D2B'] : ['#6C5CE7', '#4834D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.netWorthCard}>
          <Text style={styles.nwLabel}>Net Worth</Text>
          <Text style={[styles.nwAmount, { color: data.net_worth >= 0 ? '#FFFFFF' : '#FF5252' }]}>{formatINR(data.net_worth)}</Text>
          <View style={styles.nwDivider} />
          <View style={styles.nwRow}>
            <View style={styles.nwItem}>
              <Ionicons name="arrow-up-circle" size={18} color="#00E676" />
              <Text style={styles.nwItemLabel}>Assets</Text>
              <Text style={styles.nwItemVal}>{formatINR(data.total_assets)}</Text>
            </View>
            <View style={styles.nwSep} />
            <View style={styles.nwItem}>
              <Ionicons name="arrow-down-circle" size={18} color="#FF5252" />
              <Text style={styles.nwItemLabel}>Liabilities</Text>
              <Text style={styles.nwItemVal}>{formatINR(data.total_liabilities)}</Text>
            </View>
          </View>
        </LinearGradient>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {section.items.map((item, idx) => (
                <View key={item.label} style={[styles.sectionItem, idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={[styles.sIcon, { backgroundColor: item.color + '20' }]}><Ionicons name={item.icon as any} size={18} color={item.color} /></View>
                  <View style={styles.sInfo}>
                    <Text style={[styles.sItemLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.sItemCount, { color: colors.textSecondary }]}>{item.count} items</Text>
                  </View>
                  <Text style={[styles.sItemVal, { color: item.value > 0 ? colors.text : colors.textSecondary }]}>{formatINR(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

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
  scroll: { paddingHorizontal: 20 },
  netWorthCard: { borderRadius: 20, padding: 24, marginBottom: 24 },
  nwLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  nwAmount: { fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
  nwDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  nwRow: { flexDirection: 'row' },
  nwItem: { flex: 1, gap: 4 },
  nwItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  nwItemVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  nwSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  sectionCard: { borderRadius: 14 },
  sectionItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  sIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sInfo: { flex: 1 },
  sItemLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  sItemCount: { fontSize: 12 },
  sItemVal: { fontSize: 16, fontWeight: 'bold' },
});

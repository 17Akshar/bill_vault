import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const WIDGET_CONFIG = [
  { key: 'net_worth', label: 'Net Worth Card', icon: 'analytics-outline', color: '#5B2FBF', desc: 'Total net worth with sparkline chart' },
  { key: 'quick_actions', label: 'Quick Actions', icon: 'flash-outline', color: '#22C55E', desc: 'Income, Expense, Transfer, Note buttons' },
  { key: 'summary', label: 'Income / Expense / Savings', icon: 'bar-chart-outline', color: '#3B82F6', desc: 'Monthly summary cards' },
  { key: 'accounts', label: 'Accounts Snapshot', icon: 'wallet-outline', color: '#F59E0B', desc: 'Horizontal scroll of all accounts' },
  { key: 'investments', label: 'Investments Overview', icon: 'pie-chart-outline', color: '#EC4899', desc: 'Portfolio donut chart and allocation' },
  { key: 'recent_transactions', label: 'Recent Transactions', icon: 'swap-horizontal-outline', color: '#14B8A6', desc: 'Latest income and expenses' },
  { key: 'reminders', label: 'Upcoming Reminders', icon: 'alarm-outline', color: '#EF4444', desc: 'Due dates and bill reminders' },
  { key: 'financial_hub', label: 'Financial Hub', icon: 'apps-outline', color: '#8B5CF6', desc: 'Quick navigation to all modules' },
];

export default function DashboardSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [widgets, setWidgets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      const w = res.data.dashboard_widgets || {};
      // Merge with defaults
      const merged: Record<string, boolean> = {};
      WIDGET_CONFIG.forEach(wc => {
        merged[wc.key] = w[wc.key] !== undefined ? w[wc.key] : true;
      });
      setWidgets(merged);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleWidget = async (key: string) => {
    const updated = { ...widgets, [key]: !widgets[key] };
    setWidgets(updated);
    setSaving(true);
    try {
      await api.put('/settings', { dashboard_widgets: updated });
    } catch (e) {
      Alert.alert('Error', 'Failed to save');
      setWidgets(widgets); // rollback
    } finally { setSaving(false); }
  };

  const enableAll = async () => {
    const updated: Record<string, boolean> = {};
    WIDGET_CONFIG.forEach(wc => { updated[wc.key] = true; });
    setWidgets(updated);
    try { await api.put('/settings', { dashboard_widgets: updated }); }
    catch { Alert.alert('Error', 'Failed to save'); }
  };

  const enabledCount = Object.values(widgets).filter(Boolean).length;

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard Widgets</Text>
        <TouchableOpacity onPress={enableAll}>
          <Text style={[styles.resetBtn, { color: colors.primary }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Toggle widgets to customize your dashboard. {enabledCount} of {WIDGET_CONFIG.length} active.
          </Text>
        </View>

        {/* Widget Toggles */}
        {WIDGET_CONFIG.map((widget, index) => (
          <View
            key={widget.key}
            style={[
              styles.widgetRow,
              { backgroundColor: colors.card },
              index === WIDGET_CONFIG.length - 1 && { marginBottom: 32 },
            ]}
          >
            <View style={[styles.widgetIcon, { backgroundColor: widget.color + '15' }]}>
              <Ionicons name={widget.icon as any} size={22} color={widget.color} />
            </View>
            <View style={styles.widgetInfo}>
              <Text style={[styles.widgetLabel, { color: colors.text }]}>{widget.label}</Text>
              <Text style={[styles.widgetDesc, { color: colors.textSecondary }]}>{widget.desc}</Text>
            </View>
            <Switch
              value={widgets[widget.key] ?? true}
              onValueChange={() => toggleWidget(widget.key)}
              trackColor={{ false: colors.border, true: widget.color }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </ScrollView>

      {saving && (
        <View style={styles.savingBar}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  resetBtn: { fontSize: 14, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  widgetRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10 },
  widgetIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  widgetInfo: { flex: 1, marginRight: 12 },
  widgetLabel: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  widgetDesc: { fontSize: 12, lineHeight: 16 },
  savingBar: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#5B2FBF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  savingText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});

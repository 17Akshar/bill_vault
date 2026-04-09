import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

const INV_TYPES = [
  { key: 'stocks', label: 'Stocks', icon: 'trending-up-outline', color: '#00E676' },
  { key: 'mutual_fund', label: 'Mutual Fund', icon: 'pie-chart-outline', color: '#448AFF' },
  { key: 'fd', label: 'FD', icon: 'lock-closed-outline', color: '#FFB300' },
  { key: 'rd', label: 'RD', icon: 'calendar-outline', color: '#7C4DFF' },
  { key: 'ppf', label: 'PPF', icon: 'shield-checkmark-outline', color: '#FF6B81' },
  { key: 'nps', label: 'NPS', icon: 'ribbon-outline', color: '#00BCD4' },
  { key: 'gold', label: 'Gold', icon: 'diamond-outline', color: '#FF9100' },
  { key: 'real_estate', label: 'Real Estate', icon: 'home-outline', color: '#8D6E63' },
  { key: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F7931A' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8E8EA0' },
];

const HEADING_ICONS = [
  { key: 'trending-up', label: 'Stocks' },
  { key: 'pie-chart', label: 'Mutual Funds' },
  { key: 'lock-closed', label: 'Fixed Deposits' },
  { key: 'diamond', label: 'Gold' },
  { key: 'home', label: 'Real Estate' },
  { key: 'logo-bitcoin', label: 'Crypto' },
  { key: 'shield-checkmark', label: 'PPF/NPS' },
  { key: 'cash', label: 'General' },
];

export default function InvestmentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [headings, setHeadings] = useState<any[]>([]);
  const [ungrouped, setUngrouped] = useState<any[]>([]);
  const [allInvestments, setAllInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(new Set());

  // Modals
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddHeading, setShowAddHeading] = useState(false);
  const [editInvestment, setEditInvestment] = useState<any>(null);
  const [editHeading, setEditHeading] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [invForm, setInvForm] = useState({ name: '', investment_type: 'mutual_fund', invested_amount: '', current_value: '', notes: '', heading_id: '' });
  const [headingForm, setHeadingForm] = useState({ name: '', icon: 'trending-up' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [hRes, iRes] = await Promise.all([
        api.get('/investment-headings'),
        api.get('/investments'),
      ]);
      setHeadings(hRes.data);
      setAllInvestments(iRes.data);
      const groupedIds = new Set(iRes.data.filter((i: any) => i.heading_id).map((i: any) => i.heading_id));
      setUngrouped(iRes.data.filter((i: any) => !i.heading_id));
      // Auto-expand all headings on first load
      if (expandedHeadings.size === 0) {
        setExpandedHeadings(new Set(hRes.data.map((h: any) => h.heading_id)));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const toggleExpand = (id: string) => {
    const s = new Set(expandedHeadings);
    if (s.has(id)) s.delete(id); else s.add(id);
    setExpandedHeadings(s);
  };

  // Investment CRUD
  const openAddInvestment = (headingId?: string) => {
    setEditInvestment(null);
    setInvForm({ name: '', investment_type: 'mutual_fund', invested_amount: '', current_value: '', notes: '', heading_id: headingId || '' });
    setShowAddInvestment(true);
  };

  const openEditInvestment = (inv: any) => {
    setEditInvestment(inv);
    setInvForm({
      name: inv.name, investment_type: inv.investment_type,
      invested_amount: String(inv.invested_amount), current_value: String(inv.current_value),
      notes: inv.notes || '', heading_id: inv.heading_id || ''
    });
    setShowAddInvestment(true);
  };

  const handleSaveInvestment = async () => {
    if (!invForm.name.trim()) { Alert.alert('Required', 'Enter investment name'); return; }
    if (!invForm.invested_amount || parseFloat(invForm.invested_amount) <= 0) { Alert.alert('Required', 'Enter invested amount'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: invForm.name.trim(), investment_type: invForm.investment_type,
        invested_amount: parseFloat(invForm.invested_amount),
        current_value: parseFloat(invForm.current_value) || parseFloat(invForm.invested_amount),
        notes: invForm.notes || null,
      };
      if (invForm.heading_id) payload.heading_id = invForm.heading_id;
      if (editInvestment) {
        await api.put(`/investments/${editInvestment.investment_id}`, {
          name: payload.name, current_value: payload.current_value, notes: payload.notes
        });
      } else {
        payload.purchase_date = new Date().toISOString();
        await api.post('/investments', payload);
      }
      setShowAddInvestment(false); setEditInvestment(null); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteInvestment = (inv: any) => {
    Alert.alert('Delete', `Remove "${inv.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/investments/${inv.investment_id}`); load(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  // Heading CRUD
  const openAddHeading = () => {
    setEditHeading(null);
    setHeadingForm({ name: '', icon: 'trending-up' });
    setShowAddHeading(true);
  };

  const openEditHeading = (h: any) => {
    setEditHeading(h);
    setHeadingForm({ name: h.name, icon: h.icon || 'trending-up' });
    setShowAddHeading(true);
  };

  const handleSaveHeading = async () => {
    if (!headingForm.name.trim()) { Alert.alert('Required', 'Enter heading name'); return; }
    setSaving(true);
    try {
      if (editHeading) {
        await api.put(`/investment-headings/${editHeading.heading_id}`, headingForm);
      } else {
        await api.post('/investment-headings', headingForm);
      }
      setShowAddHeading(false); setEditHeading(null); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteHeading = (h: any) => {
    const investmentsInHeading = allInvestments.filter(i => i.heading_id === h.heading_id);
    Alert.alert('Delete Heading', `Remove "${h.name}"?${investmentsInHeading.length > 0 ? `\n\n${investmentsInHeading.length} investments will become ungrouped.` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/investment-headings/${h.heading_id}`); load(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  // Summaries
  const totalInvested = allInvestments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent = allInvestments.reduce((s, i) => s + i.current_value, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPct = totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0;

  if (loading) return <View style={[st.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const renderInvestmentCard = (item: any) => {
    const it = INV_TYPES.find(t => t.key === item.investment_type) || INV_TYPES[9];
    const ret = item.current_value - item.invested_amount;
    const retPct = item.invested_amount > 0 ? ((ret / item.invested_amount) * 100) : 0;
    const retColor = ret >= 0 ? '#00E676' : '#FF5252';
    return (
      <TouchableOpacity key={item.investment_id} style={[st.invCard, { backgroundColor: colors.card }]} onPress={() => openEditInvestment(item)} activeOpacity={0.7}>
        <View style={st.invTop}>
          <View style={[st.invIcon, { backgroundColor: it.color + '20' }]}>
            <Ionicons name={it.icon as any} size={20} color={it.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.invName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[st.invMeta, { color: colors.textSecondary }]}>{it.label}</Text>
          </View>
          <View style={[st.returnBadge, { backgroundColor: retColor + '18' }]}>
            <Ionicons name={ret >= 0 ? 'trending-up' : 'trending-down'} size={12} color={retColor} />
            <Text style={{ color: retColor, fontSize: 12, fontWeight: '700' }}>{ret >= 0 ? '+' : ''}{retPct.toFixed(1)}%</Text>
          </View>
        </View>
        <View style={st.invStats}>
          <View><Text style={[st.invStatLabel, { color: colors.textSecondary }]}>Invested</Text><Text style={[st.invStatVal, { color: colors.text }]}>{formatINR(item.invested_amount)}</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={[st.invStatLabel, { color: colors.textSecondary }]}>Current</Text><Text style={[st.invStatVal, { color: colors.text }]}>{formatINR(item.current_value)}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={[st.invStatLabel, { color: colors.textSecondary }]}>Returns</Text><Text style={[st.invStatVal, { color: retColor }]}>{ret >= 0 ? '+' : ''}{formatINR(Math.abs(ret))}</Text></View>
        </View>
        <View style={st.invActions}>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => openEditInvestment(item)}>
            <Ionicons name="create-outline" size={14} color="#448AFF" /><Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => router.push({ pathname: '/reminders', params: { type: 'investment', related_id: item.investment_id, title: `${item.name} Review`, description: `Review investment: ${item.name}` } } as any)}>
            <Ionicons name="notifications-outline" size={14} color="#448AFF" /><Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Remind</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]} onPress={() => handleDeleteInvestment(item)}>
            <Ionicons name="trash-outline" size={14} color="#FF5252" /><Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const sections: any[] = [];

  // Headings with their investments
  headings.forEach(h => {
    const investmentsInHeading = allInvestments.filter(i => i.heading_id === h.heading_id);
    const hInvested = investmentsInHeading.reduce((s: number, i: any) => s + i.invested_amount, 0);
    const hCurrent = investmentsInHeading.reduce((s: number, i: any) => s + i.current_value, 0);
    const hReturns = hCurrent - hInvested;
    const hRetPct = hInvested > 0 ? ((hReturns / hInvested) * 100) : 0;
    sections.push({ type: 'heading', data: h, count: investmentsInHeading.length, invested: hInvested, current: hCurrent, returns: hReturns, returnsPct: hRetPct });
    if (expandedHeadings.has(h.heading_id)) {
      investmentsInHeading.forEach(inv => sections.push({ type: 'investment', data: inv, headingId: h.heading_id }));
      sections.push({ type: 'addUnder', headingId: h.heading_id, headingName: h.name });
    }
  });

  // Ungrouped investments
  if (ungrouped.length > 0) {
    sections.push({ type: 'ungroupedHeader' });
    ungrouped.forEach(inv => sections.push({ type: 'investment', data: inv }));
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[st.title, { color: colors.text }]}>Investments</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={openAddHeading}><Ionicons name="folder-open" size={26} color="#FFB300" /></TouchableOpacity>
          <TouchableOpacity onPress={() => openAddInvestment()}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={[st.summaryCard, { backgroundColor: colors.card }]}>
        <View style={st.summaryRow}>
          <View style={st.summaryCol}><Text style={[st.sLabel, { color: colors.textSecondary }]}>Invested</Text><Text style={[st.sVal, { color: colors.text }]}>{formatINR(totalInvested)}</Text></View>
          <View style={st.summaryCol}><Text style={[st.sLabel, { color: colors.textSecondary }]}>Current</Text><Text style={[st.sVal, { color: colors.text }]}>{formatINR(totalCurrent)}</Text></View>
        </View>
        <View style={[st.returnsRow, { backgroundColor: totalReturns >= 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)' }]}>
          <Ionicons name={totalReturns >= 0 ? 'trending-up' : 'trending-down'} size={18} color={totalReturns >= 0 ? '#00E676' : '#FF5252'} />
          <Text style={{ color: totalReturns >= 0 ? '#00E676' : '#FF5252', fontSize: 15, fontWeight: '700' }}>
            {totalReturns >= 0 ? '+' : ''}{formatINR(totalReturns)} ({returnsPct >= 0 ? '+' : ''}{returnsPct.toFixed(1)}%)
          </Text>
        </View>
      </View>

      {/* Sections */}
      <FlatList
        data={sections}
        keyExtractor={(item, idx) => `${item.type}-${item.data?.investment_id || item.data?.heading_id || idx}`}
        contentContainerStyle={st.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          if (item.type === 'heading') {
            const h = item.data;
            const expanded = expandedHeadings.has(h.heading_id);
            const retColor = item.returns >= 0 ? '#00E676' : '#FF5252';
            return (
              <TouchableOpacity style={[st.headingCard, { backgroundColor: colors.card }]} onPress={() => toggleExpand(h.heading_id)} activeOpacity={0.7}>
                <View style={st.headingTop}>
                  <View style={[st.headingIcon, { backgroundColor: '#FFB300' + '20' }]}>
                    <Ionicons name={(h.icon || 'folder-open') as any} size={22} color="#FFB300" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.headingName, { color: colors.text }]}>{h.name}</Text>
                    <Text style={[st.headingMeta, { color: colors.textSecondary }]}>{item.count} investment{item.count !== 1 ? 's' : ''} · {formatINR(item.current)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                    {item.count > 0 && <Text style={{ color: retColor, fontSize: 12, fontWeight: '700' }}>{item.returns >= 0 ? '+' : ''}{item.returnsPct.toFixed(1)}%</Text>}
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </View>
                <View style={st.headingActions}>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: 'rgba(68,138,255,0.12)' }]} onPress={() => openEditHeading(h)}>
                    <Ionicons name="create-outline" size={14} color="#448AFF" /><Text style={{ color: '#448AFF', fontSize: 11, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]} onPress={() => handleDeleteHeading(h)}>
                    <Ionicons name="trash-outline" size={14} color="#FF5252" /><Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }
          if (item.type === 'investment') {
            return <View style={{ marginLeft: item.headingId ? 16 : 0 }}>{renderInvestmentCard(item.data)}</View>;
          }
          if (item.type === 'addUnder') {
            return (
              <TouchableOpacity style={[st.addUnder, { borderColor: colors.border }]} onPress={() => openAddInvestment(item.headingId)}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Add to {item.headingName}</Text>
              </TouchableOpacity>
            );
          }
          if (item.type === 'ungroupedHeader') {
            return (
              <View style={st.ungroupedHeader}>
                <Ionicons name="layers-outline" size={18} color={colors.textSecondary} />
                <Text style={[st.ungroupedTitle, { color: colors.textSecondary }]}>Ungrouped Investments</Text>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} />
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>No investments yet</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>Create headings (e.g., Shares, Mutual Funds) and add investments under them</Text>
          </View>
        }
      />

      {/* Add/Edit Investment Modal */}
      <Modal visible={showAddInvestment} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.mOverlay}>
          <View style={[st.modal, { backgroundColor: colors.card }]}>
            <View style={st.mHeader}>
              <Text style={[st.mTitle, { color: colors.text }]}>{editInvestment ? 'Edit Investment' : 'Add Investment'}</Text>
              <TouchableOpacity onPress={() => { setShowAddInvestment(false); setEditInvestment(null); }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Heading selector */}
              {!editInvestment && headings.length > 0 && (
                <>
                  <Text style={[st.fl, { color: colors.text }]}>Group Under</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <TouchableOpacity
                      style={[st.chip, { borderColor: colors.border }, !invForm.heading_id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setInvForm(p => ({ ...p, heading_id: '' }))}
                    >
                      <Text style={{ color: !invForm.heading_id ? '#FFF' : colors.text, fontSize: 12 }}>None</Text>
                    </TouchableOpacity>
                    {headings.map(h => (
                      <TouchableOpacity
                        key={h.heading_id}
                        style={[st.chip, { borderColor: colors.border }, invForm.heading_id === h.heading_id && { backgroundColor: '#FFB300', borderColor: '#FFB300' }]}
                        onPress={() => setInvForm(p => ({ ...p, heading_id: h.heading_id }))}
                      >
                        <Ionicons name={(h.icon || 'folder-open') as any} size={14} color={invForm.heading_id === h.heading_id ? '#FFF' : colors.textSecondary} />
                        <Text style={{ color: invForm.heading_id === h.heading_id ? '#FFF' : colors.text, fontSize: 12 }}>{h.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Type selector */}
              <Text style={[st.fl, { color: colors.text }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {INV_TYPES.map(it => (
                  <TouchableOpacity key={it.key} style={[st.chip, { borderColor: colors.border }, invForm.investment_type === it.key && { borderColor: it.color, borderWidth: 2 }]} onPress={() => setInvForm(p => ({ ...p, investment_type: it.key }))}>
                    <Ionicons name={it.icon as any} size={14} color={invForm.investment_type === it.key ? it.color : colors.textSecondary} />
                    <Text style={{ color: invForm.investment_type === it.key ? colors.text : colors.textSecondary, fontSize: 11 }}>{it.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[st.fl, { color: colors.text }]}>Name</Text>
              <View style={[st.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[st.ft, { color: colors.text }]} value={invForm.name} onChangeText={v => setInvForm(p => ({ ...p, name: v }))} placeholder="e.g. HDFC Flexicap" placeholderTextColor={colors.textSecondary} />
              </View>

              <Text style={[st.fl, { color: colors.text }]}>Invested Amount</Text>
              <View style={[st.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>{'\u20B9'}</Text>
                <TextInput style={[st.ft, { color: colors.text }]} value={invForm.invested_amount} onChangeText={v => setInvForm(p => ({ ...p, invested_amount: v }))} keyboardType="decimal-pad" placeholder="100000" placeholderTextColor={colors.textSecondary} editable={!editInvestment} />
              </View>

              <Text style={[st.fl, { color: colors.text }]}>Current Value</Text>
              <View style={[st.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: '#00E676', fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>{'\u20B9'}</Text>
                <TextInput style={[st.ft, { color: colors.text }]} value={invForm.current_value} onChangeText={v => setInvForm(p => ({ ...p, current_value: v }))} keyboardType="decimal-pad" placeholder="120000" placeholderTextColor={colors.textSecondary} />
              </View>

              {/* Auto-calc returns */}
              {invForm.invested_amount && invForm.current_value ? (() => {
                const inv = parseFloat(invForm.invested_amount) || 0;
                const cur = parseFloat(invForm.current_value) || 0;
                const ret = cur - inv;
                const pct = inv > 0 ? (ret / inv * 100) : 0;
                const c = ret >= 0 ? '#00E676' : '#FF5252';
                return (
                  <View style={[st.autoCalc, { backgroundColor: colors.background }]}>
                    <Ionicons name="calculator" size={14} color={c} />
                    <Text style={{ color: c, fontSize: 13, fontWeight: '600' }}>Returns: {ret >= 0 ? '+' : ''}{formatINR(ret)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</Text>
                  </View>
                );
              })() : null}

              <Text style={[st.fl, { color: colors.text }]}>Notes (Optional)</Text>
              <View style={[st.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[st.ft, { color: colors.text }]} value={invForm.notes} onChangeText={v => setInvForm(p => ({ ...p, notes: v }))} placeholder="Notes" placeholderTextColor={colors.textSecondary} />
              </View>

              <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveInvestment} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{editInvestment ? 'Save Changes' : 'Add Investment'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Heading Modal */}
      <Modal visible={showAddHeading} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.mOverlay}>
          <View style={[st.modal, { backgroundColor: colors.card }]}>
            <View style={st.mHeader}>
              <Text style={[st.mTitle, { color: colors.text }]}>{editHeading ? 'Edit Heading' : 'Add Heading'}</Text>
              <TouchableOpacity onPress={() => { setShowAddHeading(false); setEditHeading(null); }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>

            <Text style={[st.fl, { color: colors.text }]}>Heading Name</Text>
            <View style={[st.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput style={[st.ft, { color: colors.text }]} value={headingForm.name} onChangeText={v => setHeadingForm(p => ({ ...p, name: v }))} placeholder="e.g. Shares, Mutual Funds" placeholderTextColor={colors.textSecondary} />
            </View>

            <Text style={[st.fl, { color: colors.text }]}>Icon</Text>
            <View style={st.iconGrid}>
              {HEADING_ICONS.map(ic => (
                <TouchableOpacity key={ic.key} style={[st.iconChip, { borderColor: colors.border }, headingForm.icon === ic.key && { borderColor: '#FFB300', backgroundColor: '#FFB300' + '20' }]} onPress={() => setHeadingForm(p => ({ ...p, icon: ic.key }))}>
                  <Ionicons name={ic.key as any} size={22} color={headingForm.icon === ic.key ? '#FFB300' : colors.textSecondary} />
                  <Text style={{ color: headingForm.icon === ic.key ? '#FFB300' : colors.textSecondary, fontSize: 10 }}>{ic.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[st.saveBtn, { backgroundColor: '#FFB300' }]} onPress={handleSaveHeading} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{editHeading ? 'Save Changes' : 'Create Heading'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  summaryCard: { marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  summaryCol: { flex: 1, alignItems: 'center' },
  sLabel: { fontSize: 12, marginBottom: 4 },
  sVal: { fontSize: 16, fontWeight: 'bold' },
  returnsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  // Heading card
  headingCard: { borderRadius: 14, padding: 16, marginBottom: 8 },
  headingTop: { flexDirection: 'row', alignItems: 'center' },
  headingIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headingName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  headingMeta: { fontSize: 12 },
  headingActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  // Investment card
  invCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  invTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  invIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  invName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  invMeta: { fontSize: 12 },
  invStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  invStatLabel: { fontSize: 11, marginBottom: 2 },
  invStatVal: { fontSize: 13, fontWeight: '700' },
  invActions: { flexDirection: 'row', gap: 8 },
  returnBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addUnder: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, marginLeft: 16, marginBottom: 12, borderBottomWidth: 1, borderStyle: 'dashed' },
  ungroupedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  ungroupedTitle: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  // Modals
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 4 },
  ft: { flex: 1, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  autoCalc: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, marginVertical: 8 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconChip: { alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: 72 },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';
import { DEMO_INCOMES, DEMO_ACCOUNTS, DEMO_MEMBERS } from './dummyData';

const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer', upi: 'UPI', cash: 'Cash', cheque: 'Cheque', card: 'Card',
};
const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Bi-weekly', quarterly: 'Quarterly', yearly: 'Yearly',
};

export default function IncomeDetail() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const income = DEMO_INCOMES.find(e => e.income_id === id) || DEMO_INCOMES[0];
  const account = DEMO_ACCOUNTS.find(a => a.account_id === income.account_id);
  const member  = DEMO_MEMBERS.find(m => m.family_member_id === income.family_member_id);

  const formatDate = (iso: string) => {
    try { return format(parseISO(iso), 'd MMM yyyy, EEEE'); } catch { return iso; }
  };

  const handleDelete = () => {
    Alert.alert('Delete Income', 'Permanently delete this income entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/income/${id}`); } catch {}
        router.back();
      }},
    ]);
  };

  const InfoRow = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${color || GREEN}18` }]}>
        <Ionicons name={icon as any} size={17} color={color || GREEN} />
      </View>
      <View style={styles.infoMeta}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Income Details</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/income/add' as any, params: { id } })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="create-outline" size={22} color={GREEN} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: `${GREEN}18` }]}>
          <View style={[styles.heroIconBox, { backgroundColor: `${GREEN}30` }]}>
            <Ionicons name="briefcase-outline" size={36} color={GREEN} />
          </View>
          <Text style={[styles.heroSource, { color: colors.text }]}>{income.source}</Text>
          <Text style={[styles.heroAmount, { color: GREEN }]}>+{formatINR(income.amount)}</Text>
          <Text style={[styles.heroDate, { color: colors.textSecondary }]}>{formatDate(income.date)}</Text>
          <View style={[styles.heroBadge, { backgroundColor: `${GREEN}30` }]}>
            <Text style={[styles.heroBadgeText, { color: GREEN }]}>{income.category}</Text>
          </View>
        </View>

        {/* Status Badges */}
        <View style={styles.badgeRow}>
          {income.is_recurring && (
            <View style={[styles.badge, { backgroundColor: `${PURPLE}22` }]}>
              <Ionicons name="refresh-circle-outline" size={13} color={PURPLE} />
              <Text style={[styles.badgeText, { color: PURPLE }]}>Recurring · {FREQ_LABELS[income.frequency] || income.frequency}</Text>
            </View>
          )}
          {income.is_taxable && (
            <View style={[styles.badge, { backgroundColor: '#FFB30022' }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#FFB300" />
              <Text style={[styles.badgeText, { color: '#FFB300' }]}>Taxable</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Transaction Details</Text>

          {member   && <InfoRow icon="person-outline"           label="Member"       value={member.name}                         />}
          {account  && <InfoRow icon="wallet-outline"           label="Account"      value={`${account.name}${account.account_number ? ` •••• ${account.account_number}` : ''}`} />}
                       <InfoRow icon="grid-outline"             label="Category"     value={income.category}                     />
                       <InfoRow icon="calendar-outline"         label="Date"         value={formatDate(income.date)}             />
                       <InfoRow icon="swap-horizontal-outline"  label="Payment Mode" value={PAYMENT_LABELS[income.payment_mode] || income.payment_mode} />
          {income.income_type && <InfoRow icon="options-outline" label="Income Type" value={income.income_type.charAt(0).toUpperCase() + income.income_type.slice(1)} />}
          {income.notes     && <InfoRow icon="document-text-outline" label="Notes"  value={income.notes}                        />}
          {income.location  && <InfoRow icon="location-outline"      label="Location" value={income.location}                   />}
                       <InfoRow icon="refresh-circle-outline"   label="Recurring"    value={income.is_recurring ? `Yes · ${FREQ_LABELS[income.frequency] || income.frequency}` : 'No'} color={income.is_recurring ? PURPLE : undefined} />
                       <InfoRow icon="shield-checkmark-outline" label="Taxable"      value={income.is_taxable ? 'Yes' : 'No'}    color={income.is_taxable ? '#FFB300' : undefined} />
        </View>

        {/* Actions */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/income/add' as any, params: { id } })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={GREEN} />
            <Text style={[styles.actionBtnText, { color: GREEN }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/income/add' as any, params: { id: `dup_${id}` } })}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={18} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF444418', borderColor: '#EF444430' }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={RED} />
            <Text style={[styles.actionBtnText, { color: RED }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:   { fontSize: 18, fontWeight: '700' },
  heroCard:      { marginHorizontal: 20, marginTop: 4, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 8 },
  heroIconBox:   { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroSource:    { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  heroAmount:    { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  heroDate:      { fontSize: 13, marginBottom: 10 },
  heroBadge:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText:     { fontSize: 12, fontWeight: '600' },
  card:          { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  infoIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  infoMeta:      { flex: 1 },
  infoLabel:     { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 3 },
  infoValue:     { fontSize: 14, fontWeight: '500' },
  btnRow:        { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});

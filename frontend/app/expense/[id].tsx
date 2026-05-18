import React, { useState } from 'react';
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
import { DEMO_EXPENSES, PAYMENT_MODES } from './_data';

const PURPLE = '#7C5CE7';
const RED    = '#EF4444';
const GREEN  = '#22C55E';

export default function ExpenseDetail() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const expense = DEMO_EXPENSES.find(e => e.id === id) || DEMO_EXPENSES[0];
  const pm = PAYMENT_MODES.find(p => p.key === expense.paymentMode);

  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert('Delete Expense', 'This will permanently delete this expense. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try { await api.delete(`/expenses/${id}`); } catch {}
          setDeleting(false);
          router.back();
        },
      },
    ]);
  };

  const handleDuplicate = () => {
    router.push({
      pathname: '/expense/add' as any,
      params: { id: `dup_${id}` },
    });
  };

  const formatDate = (iso: string) => {
    try { return format(parseISO(iso), 'd MMM yyyy, EEEE'); } catch { return iso; }
  };

  const InfoRow = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${color || PURPLE}18` }]}>
        <Ionicons name={icon as any} size={17} color={color || PURPLE} />
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expense Details</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/expense/add' as any, params: { id } })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="create-outline" size={22} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero amount card */}
        <View style={[styles.heroCard, { backgroundColor: expense.categoryColor + '22' }]}>
          <View style={[styles.heroIconBox, { backgroundColor: expense.categoryColor + '33' }]}>
            <Ionicons name={expense.categoryIcon as any} size={36} color={expense.categoryColor} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{expense.title}</Text>
          <Text style={[styles.heroAmount, { color: RED }]}>-{formatINR(expense.amount)}</Text>
          <Text style={[styles.heroDate, { color: colors.textSecondary }]}>{formatDate(expense.date)}</Text>
          <View style={[styles.heroBadge, { backgroundColor: expense.categoryColor + '33' }]}>
            <Text style={[styles.heroBadgeText, { color: expense.categoryColor }]}>{expense.categoryLabel}</Text>
          </View>
        </View>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          {expense.isRecurring && (
            <View style={[styles.badge, { backgroundColor: `${PURPLE}22` }]}>
              <Ionicons name="refresh-circle-outline" size={13} color={PURPLE} />
              <Text style={[styles.badgeText, { color: PURPLE }]}>Recurring</Text>
            </View>
          )}
          {expense.reminderSet && (
            <View style={[styles.badge, { backgroundColor: `${GREEN}22` }]}>
              <Ionicons name="notifications-outline" size={13} color={GREEN} />
              <Text style={[styles.badgeText, { color: GREEN }]}>Reminder set</Text>
            </View>
          )}
          {expense.billUrl && (
            <View style={[styles.badge, { backgroundColor: '#FFB30022' }]}>
              <Ionicons name="attach-outline" size={13} color="#FFB300" />
              <Text style={[styles.badgeText, { color: '#FFB300' }]}>Bill attached</Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Transaction Details</Text>

          <InfoRow icon="grid-outline"          label="Category"     value={expense.categoryLabel} color={expense.categoryColor} />
          <InfoRow icon="calendar-outline"      label="Date"         value={formatDate(expense.date)} />
          <InfoRow icon={pm?.icon || 'card-outline' as any} label="Payment Mode" value={pm?.label || expense.paymentMode} />
          <InfoRow icon="wallet-outline"        label="Account"      value={expense.accountLabel} />
          {expense.description && (
            <InfoRow icon="document-text-outline" label="Description"  value={expense.description} />
          )}
          {expense.notes && (
            <InfoRow icon="create-outline"      label="Notes"        value={expense.notes} />
          )}
          {expense.tags && expense.tags.length > 0 && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFB30018' }]}>
                <Ionicons name="pricetag-outline" size={17} color="#FFB300" />
              </View>
              <View style={styles.infoMeta}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tags</Text>
                <View style={styles.tagRow}>
                  {expense.tags.map(tag => (
                    <View key={tag} style={[styles.tagChip, { backgroundColor: `${PURPLE}22` }]}>
                      <Text style={[styles.tagText, { color: PURPLE }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
          {expense.reminderDate && (
            <InfoRow icon="alarm-outline" label="Reminder Date" value={format(parseISO(expense.reminderDate), 'd MMM yyyy')} color={GREEN} />
          )}
          <InfoRow
            icon="refresh-circle-outline"
            label="Recurring"
            value={expense.isRecurring ? 'Yes — Monthly' : 'No'}
            color={expense.isRecurring ? PURPLE : colors.textSecondary}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/expense/add' as any, params: { id } })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={PURPLE} />
            <Text style={[styles.actionBtnText, { color: PURPLE }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={handleDuplicate}
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
  heroTitle:     { fontSize: 20, fontWeight: '700', marginBottom: 6 },
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
  tagRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagChip:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText:       { fontSize: 12, fontWeight: '600' },
  btnRow:        { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});

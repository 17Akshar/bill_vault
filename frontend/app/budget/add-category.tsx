import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { EXPENSE_CATEGORIES } from '../../utils/formatINR';
import { CAT_COLORS } from './_data';

type BudgetType = 'Monthly' | 'Yearly' | 'Custom';

const BUDGET_TYPES: BudgetType[] = ['Monthly', 'Yearly', 'Custom'];
const ALERT_LIMITS = [50, 70, 80, 90, 100];
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 15000, 25000, 50000];

export default function AddCategoryBudgetScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetType>('Monthly');
  const [alertLimit, setAlertLimit] = useState(80);
  const [notes, setNotes] = useState('');

  const cat = EXPENSE_CATEGORIES.find(c => c.key === selectedCat);
  const catColor = CAT_COLORS[selectedCat] || colors.primary;

  const handleSave = () => {
    if (!selectedCat) { Alert.alert('Required', 'Please select a category'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Required', 'Please enter a valid budget amount'); return; }
    Alert.alert(
      'Budget Saved',
      `${cat?.label} budget set to ₹${parseFloat(amount).toLocaleString('en-IN')}/${budgetType.toLowerCase()}.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Category Budget</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Preview chip */}
          {selectedCat && (
            <View style={[styles.previewChip, { backgroundColor: catColor + '18' }]}>
              <View style={[styles.previewIcon, { backgroundColor: catColor + '30' }]}>
                <Ionicons name={cat?.icon as any} size={22} color={catColor} />
              </View>
              <Text style={[styles.previewLabel, { color: catColor }]}>{cat?.label}</Text>
              {amount ? (
                <Text style={[styles.previewAmt, { color: catColor }]}>
                  ₹{parseFloat(amount).toLocaleString('en-IN')}/{budgetType.toLowerCase()}
                </Text>
              ) : null}
            </View>
          )}

          {/* Category picker */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Category</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.catGrid}>
              {EXPENSE_CATEGORIES.map((c) => {
                const cc = CAT_COLORS[c.key] || '#607D8B';
                const isSelected = selectedCat === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.catChip,
                      { borderColor: colors.border },
                      isSelected && { borderColor: cc, borderWidth: 2, backgroundColor: cc + '15' },
                    ]}
                    onPress={() => setSelectedCat(c.key)}
                  >
                    <View style={[styles.catChipIcon, { backgroundColor: cc + (isSelected ? '30' : '18') }]}>
                      <Ionicons name={c.icon as any} size={16} color={cc} />
                    </View>
                    <Text style={[styles.catChipLabel, { color: isSelected ? colors.text : colors.textSecondary }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Budget Amount */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Amount</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickChip, { borderColor: colors.border }, amount === a.toString() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setAmount(a.toString())}
                  >
                    <Text style={[styles.quickText, { color: amount === a.toString() ? '#FFF' : colors.textSecondary }]}>
                      ₹{a >= 1000 ? `${a / 1000}K` : a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Budget Type */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Type</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.typeRow}>
              {BUDGET_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border },
                    budgetType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setBudgetType(t)}
                >
                  <Text style={[styles.typeText, { color: budgetType === t ? '#FFF' : colors.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Alert Limit */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.alertHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Alert Limit</Text>
              <View style={[styles.alertBadge, { backgroundColor: '#FFB30020' }]}>
                <Text style={[styles.alertBadgeText, { color: '#FFB300' }]}>Notify at {alertLimit}%</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.alertRow}>
              {ALERT_LIMITS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.alertChip, { borderColor: colors.border }, alertLimit === l && { backgroundColor: '#FFB300', borderColor: '#FFB300' }]}
                  onPress={() => setAlertLimit(l)}
                >
                  <Text style={[styles.alertText, { color: alertLimit === l ? '#FFF' : colors.textSecondary }]}>{l}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.notesWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note about this budget..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Save Budget</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16,
    padding: 14, marginBottom: 12,
  },
  previewIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  previewAmt: { fontSize: 14, fontWeight: '700' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  catChipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catChipLabel: { fontSize: 12, fontWeight: '500' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, height: 56,
  },
  rupee: { fontSize: 24, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickText: { fontSize: 13, fontWeight: '600' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 14, fontWeight: '600' },

  alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  alertBadgeText: { fontSize: 12, fontWeight: '600' },
  alertRow: { flexDirection: 'row', gap: 8 },
  alertChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 13, fontWeight: '700' },

  notesWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  notesInput: { fontSize: 14, minHeight: 72 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

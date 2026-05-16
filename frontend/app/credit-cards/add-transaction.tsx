import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { DUMMY_CARDS, EXPENSE_CATEGORIES } from './_data';

type Repeat = 'One Time' | 'Daily' | 'Weekly' | 'Monthly';

function FieldLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>;
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>{children}</View>;
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const initialCard = params.id ?? DUMMY_CARDS[0].card_id;

  const [date, setDate] = useState('27 Apr 2024');
  const [selectedCard, setSelectedCard] = useState(initialCard);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].key);
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDate, setReminderDate] = useState('02 May 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeat, setRepeat] = useState<Repeat>('One Time');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);

  const card = DUMMY_CARDS.find((c) => c.card_id === selectedCard) ?? DUMMY_CARDS[0];
  const cat = EXPENSE_CATEGORIES.find((c) => c.key === category) ?? EXPENSE_CATEGORIES[0];
  const REPEATS: Repeat[] = ['One Time', 'Daily', 'Weekly', 'Monthly'];

  const handleSave = () => {
    if (!merchant.trim()) { Alert.alert('Required', 'Enter merchant name'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Required', 'Enter a valid amount'); return; }
    Alert.alert('Success', 'Transaction saved!', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Transaction</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.formSection, { color: colors.text }]}>Transaction Details</Text>

            {/* Date */}
            <FieldLabel label="Date of Purchase" />
            <FieldWrap>
              <Text style={[styles.fieldText, { color: colors.text }]}>{date}</Text>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </FieldWrap>

            {/* Card */}
            <FieldLabel label="Select Card" />
            <TouchableOpacity
              style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowCardPicker(!showCardPicker)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldText, { color: colors.text }]}>
                  {card.bank_name} {card.name}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showCardPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {DUMMY_CARDS.map((c) => (
                  <TouchableOpacity
                    key={c.card_id}
                    style={[styles.dropItem, c.card_id === selectedCard && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => { setSelectedCard(c.card_id); setShowCardPicker(false); }}
                  >
                    <View style={[styles.dropDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.dropText, { color: colors.text }]}>{c.bank_name} •••• {c.card_number_last4}</Text>
                    {c.card_id === selectedCard && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Merchant */}
            <FieldLabel label="Merchant Name" />
            <FieldWrap>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Amazon India"
                placeholderTextColor={colors.textSecondary}
              />
            </FieldWrap>

            {/* Amount */}
            <FieldLabel label="Amount" />
            <FieldWrap>
              <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </FieldWrap>

            {/* Category */}
            <FieldLabel label="Category" />
            <TouchableOpacity
              style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowCatPicker(!showCatPicker)}
            >
              <View style={[styles.catDot, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon as any} size={16} color={cat.color} />
              </View>
              <Text style={[styles.fieldText, { color: colors.text, flex: 1 }]}>{cat.label}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showCatPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.dropItem, c.key === category && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => { setCategory(c.key); setShowCatPicker(false); }}
                  >
                    <View style={[styles.catDot, { backgroundColor: c.color + '22' }]}>
                      <Ionicons name={c.icon as any} size={14} color={c.color} />
                    </View>
                    <Text style={[styles.dropText, { color: colors.text }]}>{c.label}</Text>
                    {c.key === category && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes */}
            <FieldLabel label="Notes (Optional)" />
            <View style={[styles.notesWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter notes"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Reminder section */}
          <View style={[styles.formCard, { backgroundColor: colors.card, marginTop: 12 }]}>
            <View style={styles.reminderHeader}>
              <Text style={[styles.formSection, { color: colors.text, marginBottom: 0 }]}>Reminder &amp; Payment</Text>
              <View style={styles.reminderToggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Set Reminder</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            {reminderEnabled && (
              <>
                <FieldLabel label="Reminder Date" />
                <FieldWrap>
                  <Text style={[styles.fieldText, { color: colors.text }]}>{reminderDate}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </FieldWrap>

                <FieldLabel label="Reminder Time" />
                <FieldWrap>
                  <Text style={[styles.fieldText, { color: colors.text }]}>{reminderTime}</Text>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                </FieldWrap>

                <FieldLabel label="Repeat" />
                <View style={styles.repeatRow}>
                  {REPEATS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.repeatChip, { borderColor: colors.border }, repeat === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setRepeat(r)}
                    >
                      <Text style={[styles.repeatText, { color: repeat === r ? '#FFF' : colors.textSecondary }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Save Transaction</Text>
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

  formCard: { borderRadius: 18, padding: 18 },
  formSection: { fontSize: 16, fontWeight: '700', marginBottom: 16 },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 48, gap: 10,
  },
  fieldText: { flex: 1, fontSize: 14 },
  input: { flex: 1, fontSize: 15 },
  currencySymbol: { fontSize: 18, fontWeight: '800' },
  notesWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  notesInput: { fontSize: 14, minHeight: 72 },

  dropdown: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 2, marginBottom: 4 },
  dropItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  dropDot: { width: 10, height: 10, borderRadius: 5 },
  dropText: { flex: 1, fontSize: 14 },
  catDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  reminderHeader: { gap: 10, marginBottom: 4 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 14, fontWeight: '600' },

  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  repeatChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  repeatText: { fontSize: 13, fontWeight: '600' },

  saveBtn: { borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

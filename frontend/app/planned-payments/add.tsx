import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  FREQUENCY_OPTIONS, PAYMENT_CATEGORIES, PAYMENT_METHODS, FrequencyKey, PaymentMethod,
} from './_data';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const ACCOUNTS = [
  { id: 'hdfc', label: 'HDFC Bank', suffix: '••1234' },
  { id: 'icici', label: 'ICICI Bank', suffix: '••5678' },
  { id: 'sbi', label: 'SBI', suffix: '••9999' },
];

const REMINDER_OPTIONS = [
  { days: 0, label: 'On due date' },
  { days: 1, label: '1 day before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: '1 week before' },
];

export default function AddPlannedPaymentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const isEdit = Boolean(id);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('12500');
  const [currency, setCurrency] = useState('INR');
  const [paymentDate, setPaymentDate] = useState('25 May 2024');
  const [frequency, setFrequency] = useState<FrequencyKey>('monthly');
  const [accountId, setAccountId] = useState('hdfc');
  const [categoryId, setCategoryId] = useState('loan_emi');
  const [payee, setPayee] = useState('HDFC Bank');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [labels, setLabels] = useState('');
  const [autoReminder, setAutoReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);

  const [showCurrency, setShowCurrency] = useState(false);
  const [showFrequency, setShowFrequency] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);

  const selectedAccount = ACCOUNTS.find(a => a.id === accountId);
  const selectedCategory = PAYMENT_CATEGORIES.find(c => c.id === categoryId);
  const selectedMethod = PAYMENT_METHODS.find(m => m.key === paymentMethod);
  const selectedFrequency = FREQUENCY_OPTIONS.find(f => f.key === frequency);

  const amountNumber = parseFloat(amount.replace(/,/g, '') || '0');

  const numberToWords = (n: number): string => {
    if (!n || isNaN(n)) return '';
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n < 20) return units[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + units[n % 10] : ''}`;
    if (n < 1000) return `${units[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + numberToWords(n % 100) : ''}`;
    if (n < 100000) return `${numberToWords(Math.floor(n / 1000))} Thousand${n % 1000 ? ' ' + numberToWords(n % 1000) : ''}`;
    if (n < 10000000) return `${numberToWords(Math.floor(n / 100000))} Lakh${n % 100000 ? ' ' + numberToWords(n % 100000) : ''}`;
    return `${numberToWords(Math.floor(n / 10000000))} Crore${n % 10000000 ? ' ' + numberToWords(n % 10000000) : ''}`;
  };

  const amountWords = amountNumber > 0 ? `${numberToWords(amountNumber)} Only` : '';

  const nextPaymentDate = paymentDate;
  const reminderDisplay = autoReminder
    ? REMINDER_OPTIONS.find(r => r.days === reminderDays)?.label || 'On due date'
    : 'Disabled';

  const validate = () => {
    if (!amount.trim() || amountNumber <= 0) { Alert.alert('Error', 'Please enter a valid amount'); return false; }
    if (!accountId) { Alert.alert('Error', 'Please select an account'); return false; }
    if (!categoryId) { Alert.alert('Error', 'Please select a category'); return false; }
    if (!paymentDate) { Alert.alert('Error', 'Please select a payment date'); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    Alert.alert(
      isEdit ? 'Payment Updated' : 'Payment Saved',
      `${type === 'income' ? 'Income' : 'Expense'} of ₹${amountNumber.toLocaleString()} saved successfully.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  const Dropdown = ({ label, value, icon, onPress }: { label: string; value: string; icon: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.detailRow, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEdit ? 'Edit Planned Payment' : 'Add Planned Payment'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Type Tabs */}
        <View style={[styles.typeTabs, { backgroundColor: colors.card }]}>
          {(['expense', 'income'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeTab, type === t && { backgroundColor: colors.primary }]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeTabText, { color: type === t ? '#FFF' : colors.textSecondary }]}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Section */}
        <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[styles.currencyBtn, { backgroundColor: colors.background }]}
              onPress={() => setShowCurrency(!showCurrency)}
            >
              <Text style={[styles.currencyBtnText, { color: colors.text }]}>{currency}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {amountWords ? (
            <Text style={[styles.amountWords, { color: colors.textSecondary }]}>{amountWords}</Text>
          ) : null}

          {showCurrency && (
            <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setCurrency(c); setShowCurrency(false); }}>
                  <Text style={[styles.dropdownItemText, { color: currency === c ? colors.primary : colors.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Schedule */}
        <View style={[styles.scheduleRow]}>
          <TouchableOpacity style={[styles.scheduleCard, { backgroundColor: colors.card }]}>
            <View style={[styles.scheduleIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Payment date</Text>
              <Text style={[styles.scheduleValue, { color: colors.text }]}>{paymentDate}</Text>
              <Text style={[styles.scheduleHint, { color: colors.textSecondary }]}>Saturday</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scheduleCard, { backgroundColor: colors.card }]}
            onPress={() => setShowFrequency(!showFrequency)}
          >
            <View style={[styles.scheduleIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="repeat-outline" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Repeat</Text>
              <Text style={[styles.scheduleValue, { color: colors.text }]}>{selectedFrequency?.label}</Text>
              <Text style={[styles.scheduleHint, { color: colors.textSecondary }]}>{selectedFrequency?.description}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {showFrequency && (
          <View style={[styles.frequencySheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FREQUENCY_OPTIONS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.frequencyOption, frequency === f.key && { backgroundColor: colors.primary + '15' }]}
                onPress={() => { setFrequency(f.key); setShowFrequency(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.frequencyLabel, { color: frequency === f.key ? colors.primary : colors.text }]}>{f.label}</Text>
                  <Text style={[styles.frequencyDesc, { color: colors.textSecondary }]}>{f.description}</Text>
                </View>
                {frequency === f.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Payment Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Payment details</Text>

          <Dropdown
            label="Account"
            value={`${selectedAccount?.label} ${selectedAccount?.suffix}`}
            icon="business-outline"
            onPress={() => setShowAccount(!showAccount)}
          />
          {showAccount && (
            <View style={[styles.inlineDropdown, { backgroundColor: colors.background }]}>
              {ACCOUNTS.map(a => (
                <TouchableOpacity key={a.id} style={styles.inlineItem} onPress={() => { setAccountId(a.id); setShowAccount(false); }}>
                  <Text style={[styles.inlineItemText, { color: accountId === a.id ? colors.primary : colors.text }]}>
                    {a.label} {a.suffix}
                  </Text>
                  {accountId === a.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Dropdown
            label="Category"
            value={selectedCategory?.label || 'Select'}
            icon={selectedCategory?.icon || 'grid-outline'}
            onPress={() => setShowCategory(!showCategory)}
          />
          {showCategory && (
            <View style={[styles.categoryGrid, { backgroundColor: colors.background }]}>
              {PAYMENT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catItem, categoryId === cat.id && { borderColor: cat.color, borderWidth: 2 }, { backgroundColor: cat.color + '15' }]}
                  onPress={() => { setCategoryId(cat.id); setShowCategory(false); }}
                >
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{type === 'income' ? 'Payer' : 'Payee'}</Text>
            <TextInput
              style={[styles.detailInput, { color: colors.text }]}
              value={payee}
              onChangeText={setPayee}
              placeholder="Enter name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Dropdown
            label="Payment type"
            value={selectedMethod?.label || 'Select'}
            icon={selectedMethod?.icon || 'card-outline'}
            onPress={() => setShowPaymentMethod(!showPaymentMethod)}
          />
          {showPaymentMethod && (
            <View style={[styles.inlineDropdown, { backgroundColor: colors.background }]}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m.key} style={styles.inlineItem} onPress={() => { setPaymentMethod(m.key); setShowPaymentMethod(false); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={m.icon as any} size={16} color={paymentMethod === m.key ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.inlineItemText, { color: paymentMethod === m.key ? colors.primary : colors.text }]}>{m.label}</Text>
                  </View>
                  {paymentMethod === m.key && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Labels</Text>
            <TextInput
              style={[styles.detailInput, { color: colors.text }]}
              value={labels}
              onChangeText={setLabels}
              placeholder="+ Add"
              placeholderTextColor={colors.primary}
            />
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Note</Text>
            <TextInput
              style={[styles.detailInput, { color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Upcoming Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>Upcoming payment preview</Text>
          <View style={styles.previewRow}>
            <View style={styles.previewItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Next payment</Text>
            </View>
            <Text style={[styles.previewValue, { color: colors.text }]}>{nextPaymentDate}</Text>
          </View>
          <View style={[styles.previewRow, { marginBottom: 0 }]}>
            <View style={styles.previewItem}>
              <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Auto reminders</Text>
            </View>
            <View style={styles.previewReminderRow}>
              <Text style={[styles.previewValue, { color: colors.text }]}>{reminderDisplay}</Text>
              <Switch
                value={autoReminder}
                onValueChange={setAutoReminder}
                trackColor={{ false: colors.border, true: colors.primary }}
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            </View>
          </View>
          {autoReminder && (
            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map(r => (
                <TouchableOpacity
                  key={r.days}
                  style={[styles.reminderChip, { borderColor: colors.border }, reminderDays === r.days && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setReminderDays(r.days)}
                >
                  <Text style={[styles.reminderChipText, { color: reminderDays === r.days ? '#FFF' : colors.textSecondary }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                ₹{amountNumber.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>From account</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedAccount?.label}</Text>
              <Text style={[styles.summarySubValue, { color: colors.textSecondary }]}>{selectedAccount?.suffix}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Frequency</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedFrequency?.label}</Text>
            </View>
          </View>
        </View>

        {/* Why Plan Payments */}
        <View style={[styles.whyCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.whyTitle, { color: colors.primary }]}>Why plan payments?</Text>
          <View style={styles.whyItems}>
            {[
              { icon: 'checkmark-circle-outline', color: '#22C55E', label: 'Never miss a payment' },
              { icon: 'notifications-outline', color: '#F59E0B', label: 'Stay on top of bills' },
              { icon: 'trending-up-outline', color: '#6366F1', label: 'Better cash flow planning' },
            ].map((item, idx) => (
              <View key={idx} style={styles.whyItem}>
                <View style={[styles.whyIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.whyLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Planned Payment</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  typeTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeTabText: { fontSize: 14, fontWeight: '700' },

  amountCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  amountLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencySymbol: { fontSize: 26, fontWeight: '700' },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800' },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  currencyBtnText: { fontSize: 14, fontWeight: '600' },
  amountWords: { fontSize: 11, marginTop: 4 },

  dropdown: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemText: { fontSize: 14, fontWeight: '500' },

  scheduleRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  scheduleCard: { flex: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scheduleLabel: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  scheduleValue: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  scheduleHint: { fontSize: 10 },

  frequencySheet: { borderRadius: 14, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  frequencyOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.1)' },
  frequencyLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  frequencyDesc: { fontSize: 11 },

  detailsCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 13, fontWeight: '500', width: 90 },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  detailInput: { flex: 1, fontSize: 13, fontWeight: '500', textAlign: 'right' },

  inlineDropdown: { borderRadius: 10, marginTop: 4, overflow: 'hidden', marginBottom: 4 },
  inlineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  inlineItemText: { fontSize: 13, fontWeight: '500' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderRadius: 10, marginBottom: 4 },
  catItem: { width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
  catLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  previewCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  previewTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLabel: { fontSize: 12, fontWeight: '500' },
  previewValue: { fontSize: 13, fontWeight: '600' },
  previewReminderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reminderChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  reminderChipText: { fontSize: 11, fontWeight: '600' },

  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summarySubValue: { fontSize: 11 },

  whyCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  whyTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  whyItems: { flexDirection: 'row', justifyContent: 'space-between' },
  whyItem: { alignItems: 'center', flex: 1, gap: 6 },
  whyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  whyLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  saveBtn: { borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

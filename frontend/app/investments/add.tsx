import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../utils/api';

const INVESTMENT_TYPES = [
  { id: 'stocks', label: 'Shares / Stocks', icon: 'trending-up', color: '#00E676' },
  { id: 'mutual_funds', label: 'Mutual Funds', icon: 'pie-chart', color: '#448AFF' },
  { id: 'etf', label: 'ETF', icon: 'stats-chart', color: '#7C4DFF' },
  { id: 'bonds', label: 'Bonds', icon: 'document-text', color: '#14B8A6' },
  { id: 'fd', label: 'Fixed Deposit', icon: 'lock-closed', color: '#FF6B81' },
  { id: 'gold', label: 'Gold', icon: 'diamond', color: '#FF9100' },
  { id: 'ppf', label: 'PPF', icon: 'shield-checkmark', color: '#FF5722' },
  { id: 'nps', label: 'NPS', icon: 'ribbon', color: '#00BCD4' },
  { id: 'epf', label: 'EPF', icon: 'wallet', color: '#9C27B0' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#FF9100' },
  { id: 'others', label: 'Others', icon: 'ellipsis-horizontal', color: '#607D8B' },
];

type StepType = 1 | 2 | 3;

export default function AddInvestmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type: typeParam, id: editId } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState<StepType>(1);
  const [investmentType, setInvestmentType] = useState((typeParam as string) || '');
  const [investmentName, setInvestmentName] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date());
  const [brokerCharges, setBrokerCharges] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);

  const isEditMode = !!editId;

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/investments/${editId}`);
        if (cancelled) return;
        const inv = res.data;
        setInvestmentType(inv.investment_type || '');
        setInvestmentName(inv.name || '');
        setInvestedAmount(String(inv.invested_amount || ''));
        setCurrentValue(String(inv.current_value || ''));
        const tsd = inv.type_specific_data || {};
        setQuantity(String(tsd.quantity || tsd.units || ''));
        setBuyPrice(String(tsd.average_buy_price || tsd.purchase_price_per_gram || ''));
        if (inv.purchase_date) setBuyDate(new Date(inv.purchase_date));
        setNotes(inv.notes || '');
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.detail || 'Failed to load investment');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const validateStep1 = () => {
    if (!investmentType) {
      Alert.alert('Required', 'Please select an investment type');
      return false;
    }
    if (!investmentName.trim()) {
      Alert.alert('Required', 'Please enter investment name');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const amount = parseFloat(investedAmount);
    if (!investedAmount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Invested amount must be greater than zero');
      return false;
    }
    const cv = parseFloat(currentValue);
    if (!currentValue || cv < 0) {
      Alert.alert('Invalid Current Value', 'Current value is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
  };

  const handleSave = async () => {
    if (!validateStep1() || !validateStep2()) return;

    const qty = parseFloat(quantity || '0');
    const price = parseFloat(buyPrice || '0');
    const charges = parseFloat(brokerCharges || '0');

    const typeSpecific: Record<string, any> = {};
    if (qty > 0) typeSpecific.quantity = qty;
    if (price > 0) typeSpecific.average_buy_price = price;
    if (charges > 0) typeSpecific.brokerage_charges = charges;

    const payload = {
      name: investmentName.trim(),
      investment_type: investmentType,
      invested_amount: parseFloat(investedAmount),
      current_value: parseFloat(currentValue),
      purchase_date: buyDate.toISOString(),
      status: 'active',
      notes: notes.trim() || null,
      type_specific_data: typeSpecific,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await api.put(`/investments/${editId}`, {
          name: payload.name,
          current_value: payload.current_value,
          notes: payload.notes,
          type_specific_data: payload.type_specific_data,
        });
      } else {
        await api.post('/investments', payload);
      }
      Alert.alert(
        'Success',
        `Investment ${isEditMode ? 'updated' : 'added'} successfully!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save investment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Investment', 'Are you sure you want to delete this investment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/investments/${editId}`);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const getSelectedType = () => INVESTMENT_TYPES.find((t) => t.id === investmentType);

  const calculateTotal = () => {
    const qty = parseFloat(quantity || '0');
    const price = parseFloat(buyPrice || '0');
    const charges = parseFloat(brokerCharges || '0');
    return (qty * price + charges).toFixed(2);
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="add-back-btn">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditMode ? 'Edit' : 'Add'} Investment
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: currentStep >= step ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.stepNumber, { color: currentStep >= step ? '#FFF' : colors.textSecondary }]}>
                  {step}
                </Text>
              </View>
              {step < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: currentStep > step ? colors.primary : colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {currentStep === 1 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Investment Details</Text>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Investment Type <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {INVESTMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border },
                      investmentType === type.id && {
                        backgroundColor: type.color + '20',
                        borderColor: type.color,
                      },
                    ]}
                    onPress={() => setInvestmentType(type.id)}
                    testID={`type-chip-${type.id}`}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={investmentType === type.id ? type.color : colors.textSecondary}
                    />
                    <Text style={[styles.typeChipText, { color: investmentType === type.id ? type.color : colors.text }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Investment Name <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={investmentName}
                  onChangeText={setInvestmentName}
                  placeholder="e.g., Reliance Industries"
                  placeholderTextColor={colors.textSecondary}
                  testID="investment-name-input"
                />
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Financial Details</Text>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Invested Amount <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.inputPrefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={investedAmount}
                  onChangeText={setInvestedAmount}
                  placeholder="100000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  testID="invested-amount-input"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Current Value <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.inputPrefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  placeholder="125000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  testID="current-value-input"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Quantity / Units (Optional)</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  testID="quantity-input"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Buy Price Per Unit (Optional)</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.inputPrefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={buyPrice}
                  onChangeText={setBuyPrice}
                  placeholder="2000.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  testID="buy-price-input"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Buy Date</Text>
              <TouchableOpacity
                style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {buyDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={buyDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setBuyDate(date);
                  }}
                />
              )}

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Brokerage & Charges (Optional)</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.inputPrefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={brokerCharges}
                  onChangeText={setBrokerCharges}
                  placeholder="20.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              {quantity && buyPrice && (
                <View style={[styles.totalCard, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Cost</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>₹{calculateTotal()}</Text>
                </View>
              )}
            </View>
          )}

          {currentStep === 3 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Additional Information</Text>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes (Optional)</Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: colors.border, backgroundColor: colors.card, height: 120 },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this investment..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Investment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Type</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {getSelectedType()?.label}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Name</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{investmentName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Invested</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>₹{investedAmount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Current Value</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>₹{currentValue}</Text>
                </View>
                <View
                  style={[
                    styles.summaryRow,
                    { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 8 },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>
                    Gain/Loss
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          parseFloat(currentValue || '0') - parseFloat(investedAmount || '0') >= 0
                            ? '#00E676'
                            : '#FF5252',
                        fontWeight: 'bold',
                        fontSize: 16,
                      },
                    ]}
                  >
                    ₹
                    {(
                      parseFloat(currentValue || '0') - parseFloat(investedAmount || '0')
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>

              {isEditMode && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#FF5252' }]}
                  onPress={handleDelete}
                  testID="add-delete-btn"
                >
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                  <Text style={styles.deleteBtnText}>Delete Investment</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomActions, { backgroundColor: colors.background }]}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={() => setCurrentStep((currentStep - 1) as StepType)}
            >
              <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary, flex: currentStep === 1 ? 1 : undefined, opacity: saving ? 0.6 : 1 },
            ]}
            onPress={currentStep === 3 ? handleSave : handleNext}
            disabled={saving}
            testID="add-next-btn"
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.nextButtonText}>
                {currentStep === 3 ? (isEditMode ? 'Update' : 'Save') : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1, marginHorizontal: 12 },
  closeBtn: { padding: 4 },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 16, fontWeight: 'bold' },
  stepLine: { width: 50, height: 2 },

  content: { paddingHorizontal: 20, paddingBottom: 120 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },

  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  inputPrefix: { fontSize: 18, fontWeight: 'bold' },
  dateText: { fontSize: 15 },

  typeScroll: { marginBottom: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 10,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },

  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: 'bold' },

  summaryCard: { borderRadius: 14, padding: 18, marginTop: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 20,
  },
  deleteBtnText: { color: '#FF5252', fontSize: 15, fontWeight: '700' },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  backButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  backButtonText: { fontSize: 16, fontWeight: '700' },
  nextButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

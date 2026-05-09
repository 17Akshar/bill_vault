import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

// Investment type options
const INVESTMENT_TYPES = [
  { id: 'stocks', label: 'Shares / Stocks', icon: 'trending-up', color: '#00E676' },
  { id: 'mutual_funds', label: 'Mutual Funds', icon: 'pie-chart', color: '#448AFF' },
  { id: 'etf', label: 'ETF', icon: 'stats-chart', color: '#7C4DFF' },
  { id: 'bonds', label: 'Bonds', icon: 'document-text', color: '#14B8A6' },
  { id: 'fd', label: 'Fixed Deposit', icon: 'lock-closed', color: '#FF6B81' },
  { id: 'gold', label: 'Gold', icon: 'diamond', color: '#FF9100' },
  { id: 'ppf', label: 'PPF', icon: 'shield-checkmark', color: '#FF5722' },
  { id: 'nps', label: 'NPS', icon: 'ribbon', color: '#00BCD4' },
];

type StepType = 1 | 2 | 3;

export default function AddInvestmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type: typeParam, id: editId } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState<StepType>(1);
  
  // Form fields
  const [investmentType, setInvestmentType] = useState(typeParam as string || '');
  const [investmentName, setInvestmentName] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date());
  const [brokerCharges, setBrokerCharges] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEditMode = !!editId;

  // Validation
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
    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);
    const charges = parseFloat(brokerCharges || '0');

    if (!investedAmount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Invested amount must be greater than zero');
      return false;
    }

    if (!quantity || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be greater than zero');
      return false;
    }

    if (!buyPrice || price <= 0) {
      Alert.alert('Invalid Price', 'Buy price must be greater than zero');
      return false;
    }

    if (charges < 0) {
      Alert.alert('Invalid Charges', 'Broker charges cannot be negative');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleSave = () => {
    if (!validateStep1() || !validateStep2()) return;

    // Here you would call API to save
    Alert.alert(
      'Success',
      `Investment ${isEditMode ? 'updated' : 'added'} successfully!`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      'Are you sure you want to delete this investment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Call API to delete
            router.back();
          },
        },
      ]
    );
  };

  const getSelectedType = () => INVESTMENT_TYPES.find(t => t.id === investmentType);

  // Calculate total amount
  const calculateTotal = () => {
    const qty = parseFloat(quantity || '0');
    const price = parseFloat(buyPrice || '0');
    const charges = parseFloat(brokerCharges || '0');
    return (qty * price + charges).toFixed(2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditMode ? 'Edit' : 'Add'} Investment
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: currentStep >= step ? colors.primary : colors.border,
                  },
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
          {/* Step 1: Type & Name */}
          {currentStep === 1 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Investment Details</Text>

              {/* Investment Type */}
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
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={investmentType === type.id ? type.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: investmentType === type.id ? type.color : colors.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Investment Name */}
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
                />
              </View>
            </View>
          )}

          {/* Step 2: Financial Details */}
          {currentStep === 2 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Financial Details</Text>

              {/* Invested Amount */}
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
                />
              </View>

              {/* Quantity */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Quantity / Units <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Buy Price */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Buy Price (Per Unit) <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.inputPrefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={buyPrice}
                  onChangeText={setBuyPrice}
                  placeholder="900.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Buy Date */}
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

              {/* Broker Charges */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Brokerage & Charges (Optional)
              </Text>
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

              {/* Total Amount Display */}
              {quantity && buyPrice && (
                <View style={[styles.totalCard, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>
                    ₹{calculateTotal()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 3: Additional Info */}
          {currentStep === 3 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Additional Information</Text>

              {/* Notes */}
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

              {/* Summary */}
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
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Quantity</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{quantity} units</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Buy Price</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>₹{buyPrice}</Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 8 }]}>
                  <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>Total Amount</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: 'bold', fontSize: 18 }]}>
                    ₹{calculateTotal()}
                  </Text>
                </View>
              </View>

              {/* Delete Button (Edit Mode) */}
              {isEditMode && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#FF5252' }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                  <Text style={styles.deleteBtnText}>Delete Investment</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
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
              { backgroundColor: colors.primary, flex: currentStep === 1 ? 1 : undefined },
            ]}
            onPress={currentStep === 3 ? handleSave : handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? (isEditMode ? 'Update' : 'Save') : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontSize: 16, fontWeight: 'bold' },
  stepLine: { width: 50, height: 2 },

  // Content
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },

  // Fields
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

  // Type Chips
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

  // Total Card
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

  // Summary
  summaryCard: {
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },

  // Delete Button
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

  // Bottom Actions
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
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  backButtonText: { fontSize: 16, fontWeight: '700' },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

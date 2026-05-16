import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import { FamilyMemberPicker } from '../../components/FamilyMemberSelector';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';
import { format } from 'date-fns';
import { CURRENCIES, getCurrencyByCode } from '../../utils/currencies';

const DEFAULT_CATEGORIES = [
  { name: 'Utilities', color: '#FF6B6B', icon: 'flash' },
  { name: 'Rent', color: '#4ECDC4', icon: 'home' },
  { name: 'Insurance', color: '#45B7D1', icon: 'shield' },
  { name: 'Subscriptions', color: '#FFA07A', icon: 'repeat' },
  { name: 'Phone', color: '#98D8C8', icon: 'phone-portrait' },
  { name: 'Internet', color: '#F7DC6F', icon: 'wifi' },
  { name: 'Credit Card', color: '#BB8FCE', icon: 'card' },
  { name: 'Other', color: '#85C1E2', icon: 'ellipsis-horizontal' },
];

const RECURRENCE_TYPES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export default function AddBillScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState('Utilities');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setReceiptImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!name || !amount) {
      Alert.alert('Error', 'Please fill in bill name and amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/bills', {
        name,
        amount: amountNum,
        currency,
        due_date: dueDate.toISOString(),
        category,
        vendor: vendor || null,
        notes: notes || null,
        receipt_image: receiptImage,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        recurrence_interval: 1,
        family_member_id: familyMemberId,
      });

      Alert.alert('Success', 'Bill added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add bill');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCurrency = getCurrencyByCode(currency);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Bill</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bill Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Bill Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Electric Bill"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Amount & Currency */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Amount *</Text>
            <View style={styles.amountRow}>
              <View style={[styles.amountInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={[styles.currencyButtonText, { color: colors.text }]}>
                    {selectedCurrency.flag} {selectedCurrency.code}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
                  {selectedCurrency.symbol}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: 'transparent', flex: 1, borderWidth: 0 }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Due Date</Text>
            <CrossPlatformPicker
              value={dueDate}
              onChange={(d) => setDueDate(d)}
              mode="date"
              label="Select Due Date"
              colors={colors}
            />
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {DEFAULT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryChip,
                    { borderColor: colors.border },
                    category === cat.name && { backgroundColor: cat.color, borderColor: cat.color }
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={category === cat.name ? '#FFFFFF' : colors.text}
                  />
                  <Text style={[styles.categoryText, { color: category === cat.name ? '#FFFFFF' : colors.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* For Whom */}
          <FamilyMemberPicker
            selectedId={familyMemberId}
            onSelect={(id) => setFamilyMemberId(id)}
            colors={colors}
            label="For whom?"
          />

          {/* Vendor */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Vendor (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., City Electric Company"
              placeholderTextColor={colors.textSecondary}
              value={vendor}
              onChangeText={setVendor}
            />
          </View>

          {/* Recurring */}
          <View style={[styles.switchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.switchInfo}>
              <Ionicons name="repeat" size={24} color={colors.text} />
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Recurring Bill</Text>
                <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>Bill repeats automatically</Text>
              </View>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Recurrence Type */}
          {isRecurring && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Repeat Every</Text>
              <View style={styles.recurrenceButtons}>
                {RECURRENCE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.recurrenceButton,
                      { borderColor: colors.border },
                      recurrenceType === type.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setRecurrenceType(type.value)}
                  >
                    <Text style={[
                      styles.recurrenceText,
                      { color: colors.text },
                      recurrenceType === type.value && { color: '#FFFFFF' }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Receipt */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Receipt (Optional)</Text>
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickImage}
            >
              {receiptImage ? (
                <View style={styles.imagePreview}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={[styles.imageText, { color: colors.success }]}>Receipt attached</Text>
                </View>
              ) : (
                <View style={styles.imagePreview}>
                  <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.imageText, { color: colors.textSecondary }]}>Add receipt image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Add any additional notes..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Add Bill</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.currencyList}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyItem,
                    { borderBottomColor: colors.border },
                    currency === curr.code && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setCurrency(curr.code);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={styles.currencyFlag}>{curr.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: colors.text }]}>{curr.code}</Text>
                    <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{curr.name}</Text>
                  </View>
                  <Text style={[styles.currencySymbolDisplay, { color: colors.text }]}>{curr.symbol}</Text>
                  {currency === curr.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  recurrenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  recurrenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageButton: {
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagePreview: {
    alignItems: 'center',
    gap: 8,
  },
  imageText: {
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  currencyList: {
    maxHeight: 500,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  currencyFlag: {
    fontSize: 32,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
  currencySymbolDisplay: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});

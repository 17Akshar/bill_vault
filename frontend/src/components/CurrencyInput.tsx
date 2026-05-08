import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface CurrencyInputProps {
  value: number;
  onChangeValue: (value: number) => void;
  currency: string;
  onChangeCurrency?: (currency: string) => void;
  label?: string;
  showCurrencySelector?: boolean;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CNY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
];

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeValue,
  currency,
  onChangeCurrency,
  label,
  showCurrencySelector = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || '$';

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setInputValue(cleaned);
    const numValue = parseFloat(cleaned) || 0;
    onChangeValue(numValue);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {showCurrencySelector && onChangeCurrency ? (
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.currencyText}>{currency}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        )}
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={COLORS.textDisabled}
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.currencyOption}
                  onPress={() => {
                    onChangeCurrency?.(item.code);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.currencyOptionText}>
                    {item.symbol} {item.code}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  currencyButton: {
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  currencyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '60%',
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  currencyOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currencyOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  cancelButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

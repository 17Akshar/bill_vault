import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { getInvestmentType, InvestmentField } from './types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddInvestmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type: typeParam, id: editId } = useLocalSearchParams();
  
  const [investmentType, setInvestmentType] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [maturityDate, setMaturityDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [typeSpecificData, setTypeSpecificData] = useState<any>({});

  const loadInvestment = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/investments/${editId}`);
      const inv = response.data;
      
      setName(inv.name);
      setInvestedAmount(String(inv.invested_amount));
      setCurrentValue(String(inv.current_value));
      setPurchaseDate(new Date(inv.purchase_date));
      if (inv.maturity_date) setMaturityDate(new Date(inv.maturity_date));
      setStatus(inv.status);
      setNotes(inv.notes || '');
      setTypeSpecificData(inv.type_specific_data || {});
      
      const type = getInvestmentType(inv.investment_type);
      setInvestmentType(type);
    } catch (e) {
      Alert.alert('Error', 'Failed to load investment');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [editId, router]);

  useEffect(() => {
    if (typeParam) {
      const type = getInvestmentType(typeParam as string);
      setInvestmentType(type);
    }
    
    if (editId) {
      loadInvestment();
    }
  }, [typeParam, editId, loadInvestment]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter investment name');
      return;
    }
    if (!investedAmount || parseFloat(investedAmount) <= 0) {
      Alert.alert('Required', 'Please enter invested amount');
      return;
    }
    if (!currentValue || parseFloat(currentValue) < 0) {
      Alert.alert('Required', 'Please enter current value');
      return;
    }

    // Validate required type-specific fields
    if (investmentType?.fields) {
      for (const field of investmentType.fields) {
        if (field.required && !typeSpecificData[field.key]) {
          Alert.alert('Required', `Please enter ${field.label}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        investment_type: investmentType.key,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue),
        purchase_date: purchaseDate.toISOString(),
        maturity_date: maturityDate ? maturityDate.toISOString() : null,
        status,
        notes: notes.trim() || null,
        type_specific_data: typeSpecificData,
      };

      if (editId) {
        await api.put(`/investments/${editId}`, payload);
        Alert.alert('Success', 'Investment updated successfully');
      } else {
        await api.post('/investments', payload);
        Alert.alert('Success', 'Investment added successfully');
      }
      
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save investment');
    } finally {
      setSaving(false);
    }
  }, [name, investedAmount, currentValue, investmentType, typeSpecificData, purchaseDate, maturityDate, status, notes, editId, router]);

  const renderField = (field: InvestmentField) => {
    const value = typeSpecificData[field.key] || '';

    const updateField = (val: string) => {
      setTypeSpecificData({ ...typeSpecificData, [field.key]: val });
    };

    if (field.type === 'select') {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            {field.label} {field.required && <Text style={{ color: '#FF5252' }}>*</Text>}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {field.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  { borderColor: colors.border },
                  value === option && { backgroundColor: investmentType.color + '20', borderColor: investmentType.color },
                ]}
                onPress={() => updateField(option)}
              >
                <Text style={{ 
                  color: value === option ? investmentType.color : colors.text,
                  fontSize: 13,
                  fontWeight: '600'
                }}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (field.type === 'date') {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            {field.label} {field.required && <Text style={{ color: '#FF5252' }}>*</Text>}
          </Text>
          <TouchableOpacity
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDatePicker(field.key)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.inputText, { color: value ? colors.text : colors.textSecondary }]}>
              {value ? new Date(value).toLocaleDateString() : 'Select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker === field.key && (
            <DateTimePicker
              value={value ? new Date(value) : new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(null);
                if (date) updateField(date.toISOString());
              }}
            />
          )}
        </View>
      );
    }

    if (field.type === 'textarea') {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            {field.label} {field.required && <Text style={{ color: '#FF5252' }}>*</Text>}
          </Text>
          <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, height: 80 }]}>
            <TextInput
              style={[styles.inputText, { color: colors.text, flex: 1, textAlignVertical: 'top' }]}
              value={value}
              onChangeText={updateField}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          {field.label} {field.required && <Text style={{ color: '#FF5252' }}>*</Text>}
        </Text>
        <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {field.prefix && <Text style={[styles.prefix, { color: colors.primary }]}>{field.prefix}</Text>}
          <TextInput
            style={[styles.inputText, { color: colors.text, flex: 1 }]}
            value={value}
            onChangeText={updateField}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
          />
          {field.suffix && <Text style={[styles.suffix, { color: colors.textSecondary }]}>{field.suffix}</Text>}
        </View>
      </View>
    );
  };

  const gainLoss = parseFloat(currentValue || '0') - parseFloat(investedAmount || '0');
  const gainLossPct = parseFloat(investedAmount || '0') > 0 ? (gainLoss / parseFloat(investedAmount)) * 100 : 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!investmentType) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Invalid investment type</Text>
      </View>
    );
  }

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
            {editId ? 'Edit' : 'Add'} {investmentType.label}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type Header */}
          <View style={[styles.typeHeader, { backgroundColor: colors.card }]}>
            <View style={[styles.typeIcon, { backgroundColor: investmentType.color + '20' }]}>
              <Ionicons name={investmentType.icon as any} size={28} color={investmentType.color} />
            </View>
            <Text style={[styles.typeName, { color: colors.text }]}>{investmentType.label}</Text>
          </View>

          {/* Common Fields */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Investment Name <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text, flex: 1 }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., HDFC Flexicap Fund"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Invested Amount <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.prefix, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.inputText, { color: colors.text, flex: 1 }]}
                  value={investedAmount}
                  onChangeText={setInvestedAmount}
                  placeholder="100000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  editable={!editId}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Current Value <Text style={{ color: '#FF5252' }}>*</Text>
              </Text>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.prefix, { color: '#00E676' }]}>₹</Text>
                <TextInput
                  style={[styles.inputText, { color: colors.text, flex: 1 }]}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  placeholder="120000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Auto-calculated Gain/Loss */}
            {investedAmount && currentValue && (
              <View style={[styles.calcCard, { backgroundColor: gainLoss >= 0 ? '#00E67615' : '#FF525215' }]}>
                <Ionicons 
                  name={gainLoss >= 0 ? 'trending-up' : 'trending-down'} 
                  size={20} 
                  color={gainLoss >= 0 ? '#00E676' : '#FF5252'} 
                />
                <View>
                  <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Gain / Loss</Text>
                  <Text style={{ color: gainLoss >= 0 ? '#00E676' : '#FF5252', fontSize: 16, fontWeight: 'bold' }}>
                    {gainLoss >= 0 ? '+' : ''}{formatINR(Math.abs(gainLoss))} ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Purchase Date</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowDatePicker('purchase_date')}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.inputText, { color: colors.text }]}>
                  {purchaseDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker === 'purchase_date' && (
                <DateTimePicker
                  value={purchaseDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(null);
                    if (date) setPurchaseDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Maturity Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowDatePicker('maturity_date')}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.inputText, { color: maturityDate ? colors.text : colors.textSecondary }]}>
                  {maturityDate ? maturityDate.toLocaleDateString() : 'Select maturity date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker === 'maturity_date' && (
                <DateTimePicker
                  value={maturityDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(null);
                    if (date) setMaturityDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Status</Text>
              <View style={styles.statusRow}>
                {['active', 'closed', 'matured'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      { borderColor: colors.border },
                      status === s && { 
                        backgroundColor: s === 'active' ? '#00E67620' : s === 'matured' ? '#448AFF20' : '#64748B20',
                        borderColor: s === 'active' ? '#00E676' : s === 'matured' ? '#448AFF' : '#64748B'
                      },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={{ 
                      color: status === s ? (s === 'active' ? '#00E676' : s === 'matured' ? '#448AFF' : '#64748B') : colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Type-Specific Fields */}
          {investmentType.fields && investmentType.fields.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {investmentType.label} Details
              </Text>
              {investmentType.fields.map(renderField)}
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, height: 80 }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text, flex: 1, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: investmentType.color }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add'} Investment</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 12,
  },
  typeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeName: { fontSize: 18, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 8,
  },
  inputText: { fontSize: 15 },
  prefix: { fontSize: 18, fontWeight: 'bold' },
  suffix: { fontSize: 14, fontWeight: '600' },
  calcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  calcLabel: { fontSize: 12, marginBottom: 2 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 10,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

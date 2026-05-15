import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { PropertyType, PROPERTY_TYPE_LABELS } from './_data';

const PROPERTY_TYPES: { key: PropertyType; icon: string; color: string }[] = [
  { key: 'apartment', icon: 'home-outline', color: '#448AFF' },
  { key: 'flat', icon: 'business-outline', color: '#00C48C' },
  { key: 'shop', icon: 'storefront-outline', color: '#FF9100' },
  { key: 'villa', icon: 'leaf-outline', color: '#00E676' },
  { key: 'office', icon: 'briefcase-outline', color: '#7C4DFF' },
  { key: 'plot', icon: 'map-outline', color: '#E91E63' },
];

const STATUS_OPTIONS = [
  { key: 'rented', label: 'Rented', color: '#00C48C' },
  { key: 'vacant', label: 'Vacant', color: '#FF5252' },
  { key: 'pending', label: 'Pending', color: '#FFB300' },
];

export default function AddPropertyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [status, setStatus] = useState('rented');
  const [notes, setNotes] = useState('');
  const [setReminder, setSetReminder] = useState(true);

  const selectedType = PROPERTY_TYPES.find(t => t.key === propertyType)!;

  const handleSave = () => {
    if (!propertyName.trim()) { Alert.alert('Required', 'Property name is required'); return; }
    if (!propertyType) { Alert.alert('Required', 'Property type is required'); return; }
    if (!monthlyRent || parseFloat(monthlyRent) <= 0) { Alert.alert('Required', 'Monthly rent amount is required'); return; }
    Alert.alert(
      'Property Added',
      `"${propertyName.trim()}" has been added to your portfolio.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Property</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Property Type Picker */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Type</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.typeGrid}>
              {PROPERTY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border },
                    propertyType === t.key && { borderColor: t.color, backgroundColor: t.color + '15' },
                  ]}
                  onPress={() => setPropertyType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={20} color={propertyType === t.key ? t.color : colors.textSecondary} />
                  <Text style={[styles.typeLabel, { color: propertyType === t.key ? t.color : colors.textSecondary }]}>
                    {PROPERTY_TYPE_LABELS[t.key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Basic Details */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Property Name *</Text>
            <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name={selectedType.icon as any} size={16} color={selectedType.color} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={propertyName}
                onChangeText={setPropertyName}
                placeholder="e.g. Nerul Sea View Apartment"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Address</Text>
            <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, Building, Floor"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>City</Text>
            <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Navi Mumbai"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
                <TouchableOpacity style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fieldInput, { color: purchaseDate ? colors.text : colors.textSecondary }]}>
                    {purchaseDate || 'DD MMM YYYY'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Rental Details */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rental Details</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Monthly Rent *</Text>
            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={monthlyRent}
                onChangeText={setMonthlyRent}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Security Deposit</Text>
                <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={securityDeposit}
                    onChangeText={setSecurityDeposit}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={{ flex: 0.5 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Due Day</Text>
                <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={dueDay}
                    onChangeText={setDueDay}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>th</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tenant Name</Text>
            <View style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="Tenant full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Rental Start</Text>
                <TouchableOpacity style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fieldInput, { color: rentalStart ? colors.text : colors.textSecondary }]}>
                    {rentalStart || 'DD MMM YYYY'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Rental End</Text>
                <TouchableOpacity style={[styles.fieldWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fieldInput, { color: rentalEnd ? colors.text : colors.textSecondary }]}>
                    {rentalEnd || 'DD MMM YYYY'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Property Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.statusChip,
                    { borderColor: colors.border },
                    status === s.key && { backgroundColor: s.color, borderColor: s.color },
                  ]}
                  onPress={() => setStatus(s.key)}
                >
                  <Text style={[styles.statusChipText, { color: status === s.key ? '#FFF' : colors.textSecondary }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.notesWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes about this property..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Reminder toggle */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Auto Set Rent Reminder</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  Remind before due date each month
                </Text>
              </View>
              <Switch
                value={setReminder}
                onValueChange={setSetReminder}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="home-outline" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Save Property</Text>
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

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  typeLabel: { fontSize: 12, fontWeight: '600' },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, height: 48, marginBottom: 4,
  },
  fieldInput: { flex: 1, fontSize: 14 },
  fieldHint: { fontSize: 12 },
  rupee: { fontSize: 18, fontWeight: '800' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, height: 54, marginBottom: 4,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700' },

  twoColRow: { flexDirection: 'row', gap: 10 },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statusChipText: { fontSize: 13, fontWeight: '600' },

  notesWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  notesInput: { fontSize: 14, minHeight: 72 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleSub: { fontSize: 12, marginTop: 2 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

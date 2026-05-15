import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddLendBorrowScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { type: queryType } = useLocalSearchParams();

  const [type, setType] = useState<'lent' | 'borrowed'>((queryType as any) || 'lent');
  const [personName, setPersonName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('Today');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [enableReminder, setEnableReminder] = useState(true);

  const quickAmounts = ['10000', '25000', '50000', '100000'];
  const gradient: [string, string] = type === 'lent' ? ['#22C55E', '#16A34A'] : ['#EF4444', '#DC2626'];

  const handleSave = () => {
    if (!personName.trim()) {
      Alert.alert('Error', 'Please enter person name');
      return;
    }
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    Alert.alert(
      'Success',
      `${type === 'lent' ? 'Lent' : 'Borrowed'} entry added for ${personName}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {type === 'lent' ? 'Add Lend Entry' : 'Add Borrow Entry'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Type Toggle */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.typeCard}
        >
          <Text style={styles.typeLabel}>
            {type === 'lent' ? 'You are LENDING' : 'You are BORROWING'}
          </Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'lent' && styles.activeTypeBtn]}
              onPress={() => setType('lent')}
            >
              <Ionicons name="arrow-redo-outline" size={18} color={type === 'lent' ? '#FFF' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.typeBtnText, { color: type === 'lent' ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>Lend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'borrowed' && styles.activeTypeBtn]}
              onPress={() => setType('borrowed')}
            >
              <Ionicons name="arrow-undo-outline" size={18} color={type === 'borrowed' ? '#FFF' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.typeBtnText, { color: type === 'borrowed' ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>Borrow</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Person Details */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Person Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter person name"
              placeholderTextColor={colors.textSecondary}
              value={personName}
              onChangeText={setPersonName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Amount & Reason */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Amount & Reason</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Quick amounts</Text>
          <View style={styles.quickChips}>
            {quickAmounts.map((quick) => (
              <TouchableOpacity
                key={quick}
                style={[styles.chip, { backgroundColor: colors.primary + '20' }]}
                onPress={() => setAmount(quick)}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>₹{(parseInt(quick) / 1000).toFixed(0)}K</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Reason</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 80 }]}
              placeholder="Enter reason (optional)"
              placeholderTextColor={colors.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Dates & Interest */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dates & Terms</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
            <TouchableOpacity style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Due Date (optional)</Text>
            <TouchableOpacity style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateText, { color: dueDate ? colors.text : colors.textSecondary }]}>
                {dueDate || 'Select due date'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Interest Rate % p.a. (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Reminder */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Reminder</Text>
            <Switch
              value={enableReminder}
              onValueChange={setEnableReminder}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {enableReminder && (
            <View style={styles.reminderOptions}>
              <TouchableOpacity style={[styles.reminderOption, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderOptionLabel, { color: colors.text }]}>Payment Reminder</Text>
                  <Text style={[styles.reminderOptionDesc, { color: colors.textSecondary }]}>Due date</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-outline" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>
            {type === 'lent' ? 'Add Lend Entry' : 'Add Borrow Entry'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  typeCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  typeLabel: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  typeToggle: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', gap: 8 },
  activeTypeBtn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },

  section: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '500' },
  dateInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { flex: 1, fontSize: 14, fontWeight: '500' },

  quickLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  quickChips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '600' },

  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reminderOptions: { gap: 8 },
  reminderOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 12 },
  reminderOptionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  reminderOptionDesc: { fontSize: 11 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

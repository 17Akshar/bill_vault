import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChangeUserIDScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentUserId, setCurrentUserId] = useState('john doe123');
  const [newUserId, setNewUserId] = useState('');

  const validate = () => {
    if (!newUserId.trim()) { Alert.alert('Error', 'Please enter new User ID'); return false; }
    if (newUserId.length < 6) { Alert.alert('Error', 'User ID must be at least 6 characters'); return false; }
    if (newUserId.length > 20) { Alert.alert('Error', 'User ID must be at most 20 characters'); return false; }
    if (!/^[a-zA-Z0-9]+$/.test(newUserId)) { Alert.alert('Error', 'User ID can only contain letters and numbers'); return false; }
    return true;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    Alert.alert('Success', `User ID updated to "${newUserId}"`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Change User ID</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="person" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>Change User ID</Text>
          <Text style={styles.heroSubtitle}>Update your User ID for login</Text>
        </LinearGradient>

        {/* Current User ID */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current User ID</Text>
          <View style={[styles.displayField, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.displayValue, { color: colors.text }]}>{currentUserId}</Text>
          </View>
        </View>

        {/* New User ID */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>New User ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter new User ID"
            placeholderTextColor={colors.textSecondary}
            value={newUserId}
            onChangeText={setNewUserId}
          />

          {/* Validation Rules */}
          <View style={styles.rules}>
            {[
              { label: '6 to 20 characters long', pass: newUserId.length >= 6 && newUserId.length <= 20 },
              { label: 'Alphanumeric only', pass: /^[a-zA-Z0-9]*$/.test(newUserId) },
              { label: 'No special characters or spaces', pass: !/[^a-zA-Z0-9]/.test(newUserId) },
            ].map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <Ionicons
                  name={(rule.pass ? 'checkmark-circle' : 'circle-outline') as any}
                  size={16}
                  color={rule.pass ? '#22C55E' : colors.textSecondary}
                />
                <Text style={[styles.ruleText, { color: rule.pass ? '#22C55E' : colors.textSecondary }]}>{rule.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
          <Text style={styles.updateBtnText}>Update User ID</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  heroCard: { borderRadius: 16, paddingVertical: 30, alignItems: 'center', marginBottom: 20, gap: 8 },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },

  card: { borderRadius: 14, padding: 16, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },

  displayField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  displayValue: { fontSize: 14, fontWeight: '500' },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '500', marginBottom: 16 },

  rules: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, fontWeight: '400' },

  updateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  updateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

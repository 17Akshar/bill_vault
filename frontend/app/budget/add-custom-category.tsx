import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

const ICON_OPTIONS = [
  'home-outline', 'car-outline', 'restaurant-outline', 'cart-outline',
  'heart-outline', 'book-outline', 'game-controller-outline', 'airplane-outline',
  'barbell-outline', 'camera-outline', 'musical-notes-outline', 'paw-outline',
  'briefcase-outline', 'gift-outline', 'people-outline', 'star-outline',
  'build-outline', 'leaf-outline', 'flower-outline', 'planet-outline',
];

const COLOR_OPTIONS = [
  '#FF5252', '#FF9100', '#FFB300', '#00C48C', '#00E676',
  '#448AFF', '#7C4DFF', '#E91E63', '#26C6DA', '#AB47BC',
  '#FF7043', '#4CAF50', '#607D8B', '#8D6E63', '#00BCD4',
];

const CAT_TYPES = ['Expense', 'Income', 'Savings'];

export default function AddCustomCategoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star-outline');
  const [selectedColor, setSelectedColor] = useState('#7C4DFF');
  const [catType, setCatType] = useState('Expense');
  const [budgetLimit, setBudgetLimit] = useState('');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a category name'); return; }
    Alert.alert(
      'Category Created',
      `"${name.trim()}" added as a custom ${catType.toLowerCase()} category.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Custom Category</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Preview */}
          <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor + '25' }]}>
              <Ionicons name={selectedIcon as any} size={32} color={selectedColor} />
            </View>
            <Text style={[styles.previewName, { color: colors.text }]}>{name || 'Category Name'}</Text>
            <Text style={[styles.previewType, { color: colors.textSecondary }]}>{catType}</Text>
          </View>

          {/* Category Name */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Name</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.nameWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.nameInput, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pet Care, Hobbies..."
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>{name.length}/30</Text>
            </View>
          </View>

          {/* Category Type */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Type</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.typeRow}>
              {CAT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, { borderColor: colors.border }, catType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCatType(t)}
                >
                  <Text style={[styles.typeText, { color: catType === t ? '#FFF' : colors.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Icon picker */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Icon</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconCell,
                    { backgroundColor: colors.background },
                    selectedIcon === icon && { backgroundColor: selectedColor + '25', borderColor: selectedColor, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons name={icon as any} size={22} color={selectedIcon === icon ? selectedColor : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color picker */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Color</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchSelected]}
                  onPress={() => setSelectedColor(c)}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget Limit */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.budgetLimitHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Limit</Text>
              <Text style={[styles.optionalTag, { color: colors.textSecondary }]}>Optional</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={budgetLimit}
                onChangeText={setBudgetLimit}
                placeholder="Monthly limit"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Create Category</Text>
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

  previewCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 12, gap: 8,
  },
  previewIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontWeight: '700' },
  previewType: { fontSize: 13 },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  nameWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
  },
  nameInput: { flex: 1, fontSize: 15 },
  charCount: { fontSize: 11 },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 14, fontWeight: '600' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconCell: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#FFF' },

  budgetLimitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalTag: { fontSize: 11, fontWeight: '500' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, height: 52,
  },
  rupee: { fontSize: 22, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

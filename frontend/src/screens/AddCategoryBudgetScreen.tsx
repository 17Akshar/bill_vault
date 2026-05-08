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
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { CategoryIcon } from '../components/CategoryIcon';
import { CurrencyInput } from '../components/CurrencyInput';
import { api } from '../services/api';
import { Category, CategoryBudget } from '../types';

export const AddCategoryBudgetScreen = ({ navigation, route }: any) => {
  const editMode = route?.params?.budget !== undefined;
  const existingBudget: CategoryBudget | undefined = route?.params?.budget;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [period, setPeriod] = useState('monthly');
  const [alertLimit, setAlertLimit] = useState(80);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    loadCategories();
    if (editMode && existingBudget) {
      // Populate form with existing budget data
      setSelectedCategory(existingBudget.category_name);
      setBudgetAmount(existingBudget.budget_amount);
      setPeriod(existingBudget.period);
      setAlertLimit(existingBudget.alert_limit);
      setNotes(existingBudget.notes || '');
    }
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
      if (data.length > 0 && !editMode) {
        setSelectedCategory(data[0].name);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = (): boolean => {
    // Check if category is selected
    if (!selectedCategory) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }

    // Check for negative or zero amounts
    if (budgetAmount <= 0) {
      Alert.alert('Validation Error', 'Budget amount must be greater than zero');
      return false;
    }

    // Check for negative amounts
    if (budgetAmount < 0) {
      Alert.alert('Validation Error', 'Negative amounts are not allowed');
      return false;
    }

    // Check alert limit range
    if (alertLimit < 0 || alertLimit > 100) {
      Alert.alert('Validation Error', 'Alert limit must be between 0 and 100');
      return false;
    }

    return true;
  };

  const checkDuplicateBudget = async (): Promise<boolean> => {
    // If editing, skip duplicate check for the same budget
    if (editMode && existingBudget) {
      // Only check if category changed
      if (existingBudget.category_name === selectedCategory) {
        return false; // Not a duplicate, same budget
      }
    }

    try {
      const existingBudgets = await api.getCategoryBudgets(month, year);
      const duplicate = existingBudgets.find(
        (b) => b.category_name === selectedCategory && b.period === period
      );
      
      if (duplicate) {
        Alert.alert(
          'Duplicate Budget',
          `A budget for ${selectedCategory} already exists for this ${period} period. Would you like to edit it instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Edit Existing', 
              onPress: () => {
                // Navigate to edit mode with the existing budget
                navigation.replace('AddCategoryBudget', { budget: duplicate });
              }
            },
          ]
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };

  const handleSave = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check for duplicates (only in create mode)
    if (!editMode) {
      const isDuplicate = await checkDuplicateBudget();
      if (isDuplicate) {
        return;
      }
    }

    try {
      setLoading(true);
      const category = categories.find((c) => c.name === selectedCategory);

      if (editMode && existingBudget?._id) {
        // Update existing budget
        await api.updateCategoryBudget(existingBudget._id, {
          budget_amount: budgetAmount,
          alert_limit: alertLimit,
          notes,
        });
        Alert.alert('Success', 'Budget updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new budget
        await api.createCategoryBudget({
          category_name: selectedCategory,
          category_icon: category?.icon || 'circle',
          budget_amount: budgetAmount,
          period,
          alert_limit: alertLimit,
          notes,
          month,
          year,
        });
        Alert.alert('Success', 'Category budget created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${editMode ? 'update' : 'create'} budget`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existingBudget?._id) return;

    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${selectedCategory}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await api.deleteCategoryBudget(existingBudget._id!);
              Alert.alert('Success', 'Budget deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete budget');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loadingCategories) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const selectedCategoryData = categories.find((c) => c.name === selectedCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editMode ? 'Edit Budget' : 'Add Category Budget'}
        </Text>
        {editMode ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Feather name="trash-2" size={24} color={COLORS.error} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {/* Category Preview Card */}
            {selectedCategoryData && (
              <View style={styles.previewCard}>
                <View style={styles.categoryIconLarge}>
                  <CategoryIcon name={selectedCategoryData.icon} size={32} color={COLORS.primary} />
                </View>
                <View style={styles.previewTextContainer}>
                  <Text style={styles.previewLabel}>Selected Category</Text>
                  <Text style={styles.previewCategory}>{selectedCategory}</Text>
                </View>
              </View>
            )}

            {/* Category Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value)}
                  style={styles.picker}
                  enabled={!editMode} // Disable in edit mode
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat.name} label={cat.name} value={cat.name} />
                  ))}
                </Picker>
              </View>
              {editMode && (
                <Text style={styles.helperText}>
                  Category cannot be changed when editing
                </Text>
              )}
            </View>

            {/* Budget Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Budget Amount <Text style={styles.required}>*</Text>
              </Text>
              <CurrencyInput
                value={budgetAmount}
                onChangeValue={(value) => {
                  // Prevent negative values
                  if (value >= 0) {
                    setBudgetAmount(value);
                  }
                }}
                currency="USD"
              />
              <Text style={styles.helperText}>
                Enter the budget amount for this category
              </Text>
            </View>

            {/* Period Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Period <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.periodButtons}>
                {['monthly', 'yearly', 'custom'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.periodButton,
                      period === p && styles.periodButtonActive,
                    ]}
                    onPress={() => setPeriod(p)}
                    disabled={editMode} // Disable in edit mode
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        period === p && styles.periodButtonTextActive,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {editMode && (
                <Text style={styles.helperText}>
                  Period cannot be changed when editing
                </Text>
              )}
            </View>

            {/* Alert Limit */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Alert Limit (%) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  value={alertLimit.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    // Clamp between 0 and 100
                    if (value >= 0 && value <= 100) {
                      setAlertLimit(value);
                    }
                  }}
                  keyboardType="number-pad"
                  placeholder="80"
                  placeholderTextColor={COLORS.textDisabled}
                  maxLength={3}
                />
                <View style={styles.inputIcon}>
                  <Feather name="bell" size={20} color={COLORS.textSecondary} />
                </View>
              </View>
              <Text style={styles.helperText}>
                Get notified when spending reaches this percentage (0-100)
              </Text>
            </View>

            {/* Spending Progress (Edit Mode Only) */}
            {editMode && existingBudget && (
              <View style={styles.formGroup}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Current Spending</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Spent</Text>
                      <Text style={[styles.statValue, { color: COLORS.error }]}>
                        ${existingBudget.spent.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Remaining</Text>
                      <Text style={[styles.statValue, { color: COLORS.success }]}>
                        ${(existingBudget.budget_amount - existingBudget.spent).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Progress</Text>
                      <Text style={[styles.statValue, { color: COLORS.primary }]}>
                        {Math.round((existingBudget.spent / existingBudget.budget_amount) * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this budget (e.g., goals, restrictions)"
                placeholderTextColor={COLORS.textDisabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                {notes.length}/200 characters
              </Text>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Budget Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category:</Text>
                <Text style={styles.summaryValue}>{selectedCategory}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={styles.summaryValue}>${budgetAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Period:</Text>
                <Text style={styles.summaryValue}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Alert at:</Text>
                <Text style={styles.summaryValue}>{alertLimit}% (${Math.round(budgetAmount * alertLimit / 100).toLocaleString()})</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {editMode && (
            <TouchableOpacity
              style={[styles.deleteButtonLarge, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Feather name="trash-2" size={20} color={COLORS.white} />
                  <Text style={styles.deleteButtonText}>Delete Budget</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, (loading || deleting) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading || deleting}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Feather name={editMode ? 'check' : 'plus'} size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>
                  {editMode ? 'Update Budget' : 'Create Budget'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: SPACING.md,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryLight + '40',
  },
  categoryIconLarge: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.sm,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  previewCategory: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  picker: {
    height: 56,
  },
  inputWithIcon: {
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  inputIcon: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  periodButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  statsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  deleteButtonLarge: {
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { CurrencyInput } from '../components/CurrencyInput';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../services/api';

export const SavingsGoalScreen = ({ navigation }: any) => {
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState(0);
  const [targetDate, setTargetDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Financial data from transactions
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [savedAmount, setSavedAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    // Calculate progress whenever goal amount or saved amount changes
    if (goalAmount > 0) {
      const remaining = goalAmount - savedAmount;
      const progress = (savedAmount / goalAmount) * 100;
      setRemainingAmount(remaining);
      setProgressPercentage(Math.min(progress, 100));
    }
  }, [goalAmount, savedAmount]);

  const loadFinancialData = async () => {
    try {
      setLoadingData(true);
      
      // Get current month's date range
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Fetch all transactions for current month
      const transactions = await api.getTransactions(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      // Calculate income and expenses
      let income = 0;
      let expenses = 0;
      
      transactions.forEach((transaction: any) => {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else if (transaction.type === 'expense') {
          expenses += transaction.amount;
        }
      });
      
      // Saved amount is income minus expenses
      const saved = income - expenses;
      
      setTotalIncome(income);
      setTotalExpenses(expenses);
      setSavedAmount(Math.max(saved, 0)); // Ensure non-negative
      
    } catch (error) {
      console.error('Error loading financial data:', error);
      // Use default values if error
      setSavedAmount(0);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    if (!goalName.trim()) {
      Alert.alert('Validation Error', 'Please enter a goal name');
      return false;
    }

    if (goalAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid goal amount');
      return false;
    }

    if (targetDate <= new Date()) {
      Alert.alert('Validation Error', 'Target date must be in the future');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await api.createSavingsGoal({
        goal_amount: goalAmount,
        target_date: targetDate.toISOString().split('T')[0],
        notes: `${goalName}${notes ? ' - ' + notes : ''}`, // Include goal name in notes
      });
      Alert.alert('Success', 'Savings goal created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create savings goal');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const getMonthlySavingsNeeded = () => {
    const daysRemaining = getDaysRemaining();
    const monthsRemaining = Math.max(daysRemaining / 30, 0.1); // At least 0.1 to avoid division by zero
    return remainingAmount / monthsRemaining;
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading financial data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Savings Goal</Text>
        <TouchableOpacity onPress={loadFinancialData} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {/* Current Savings Overview Card */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <Feather name="trending-up" size={24} color={COLORS.success} />
                <Text style={styles.overviewTitle}>Your Current Savings</Text>
              </View>
              
              <View style={styles.savingsDisplay}>
                <Text style={styles.savingsAmount}>${savedAmount.toLocaleString()}</Text>
                <Text style={styles.savingsLabel}>Available for Goals</Text>
              </View>

              <View style={styles.incomeExpenseRow}>
                <View style={styles.incomeExpenseItem}>
                  <Feather name="arrow-down-circle" size={20} color={COLORS.success} />
                  <View>
                    <Text style={styles.incomeExpenseLabel}>Income</Text>
                    <Text style={[styles.incomeExpenseValue, { color: COLORS.success }]}>
                      ${totalIncome.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.incomeExpenseItem}>
                  <Feather name="arrow-up-circle" size={20} color={COLORS.error} />
                  <View>
                    <Text style={styles.incomeExpenseLabel}>Expenses</Text>
                    <Text style={[styles.incomeExpenseValue, { color: COLORS.error }]}>
                      ${totalExpenses.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Goal Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Goal Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={goalName}
                onChangeText={setGoalName}
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                placeholderTextColor={COLORS.textDisabled}
              />
              <Text style={styles.helperText}>Give your savings goal a descriptive name</Text>
            </View>

            {/* Goal Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Goal Amount <Text style={styles.required}>*</Text>
              </Text>
              <CurrencyInput
                value={goalAmount}
                onChangeValue={(value) => {
                  if (value >= 0) {
                    setGoalAmount(value);
                  }
                }}
                currency="USD"
              />
              <Text style={styles.helperText}>
                Total amount you want to save for this goal
              </Text>
            </View>

            {/* Target Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Target Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.dateText}>
                  {targetDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                {getDaysRemaining()} days remaining ({Math.floor(getDaysRemaining() / 30)} months)
              </Text>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={targetDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setTargetDate(date);
                }}
                minimumDate={new Date()}
              />
            )}

            {/* Goal Progress Display */}
            {goalAmount > 0 && (
              <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>Goal Progress</Text>
                
                <View style={styles.progressStats}>
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatLabel}>Saved</Text>
                    <Text style={[styles.progressStatValue, { color: COLORS.success }]}>
                      ${savedAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatLabel}>Goal</Text>
                    <Text style={[styles.progressStatValue, { color: COLORS.primary }]}>
                      ${goalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatLabel}>Remaining</Text>
                    <Text style={[styles.progressStatValue, { color: remainingAmount > 0 ? COLORS.error : COLORS.success }]}>
                      ${Math.abs(remainingAmount).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <ProgressBar
                    progress={progressPercentage}
                    height={12}
                    color={progressPercentage >= 100 ? COLORS.success : COLORS.primary}
                  />
                  <Text style={styles.progressPercentage}>
                    {Math.round(progressPercentage)}% Complete
                  </Text>
                </View>

                {remainingAmount > 0 && (
                  <View style={styles.savingsNeeded}>
                    <Feather name="info" size={16} color={COLORS.primary} />
                    <Text style={styles.savingsNeededText}>
                      Save ${Math.round(getMonthlySavingsNeeded()).toLocaleString()} per month to reach your goal
                    </Text>
                  </View>
                )}

                {progressPercentage >= 100 && (
                  <View style={styles.goalAchieved}>
                    <Feather name="check-circle" size={20} color={COLORS.success} />
                    <Text style={styles.goalAchievedText}>
                      Goal achieved! You've saved enough for this goal.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add details about your savings goal (e.g., purpose, milestones)"
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
              <Text style={styles.summaryTitle}>Goal Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Goal Name:</Text>
                <Text style={styles.summaryValue}>{goalName || 'Not set'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Target Amount:</Text>
                <Text style={styles.summaryValue}>${goalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current Savings:</Text>
                <Text style={styles.summaryValue}>${savedAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Still Needed:</Text>
                <Text style={[styles.summaryValue, { color: remainingAmount > 0 ? COLORS.error : COLORS.success }]}>
                  ${Math.abs(remainingAmount).toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Target Date:</Text>
                <Text style={styles.summaryValue}>
                  {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Feather name="target" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Create Savings Goal</Text>
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  refreshButton: {
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
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  overviewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  savingsDisplay: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  savingsAmount: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  savingsLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  incomeExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  incomeExpenseLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  incomeExpenseValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dateText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  progressCard: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryLight + '40',
  },
  progressTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  progressStatItem: {
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  progressBarContainer: {
    marginBottom: SPACING.md,
  },
  progressPercentage: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  savingsNeeded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  savingsNeededText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  goalAchieved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight + '40',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  goalAchievedText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.success,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
  },
});

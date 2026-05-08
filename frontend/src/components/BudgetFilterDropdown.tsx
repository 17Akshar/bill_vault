import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';

interface BudgetFilterDropdownProps {
  selectedPeriod: string;
  onPeriodChange: (period: string, fromDate?: Date, toDate?: Date) => void;
  daysInfo?: string;
}

export const BudgetFilterDropdown: React.FC<BudgetFilterDropdownProps> = ({
  selectedPeriod,
  onPeriodChange,
  daysInfo,
}) => {
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const periods = ['This Month', 'Last Month', 'This Year', 'Last Year', 'Custom Range'];

  const handlePeriodSelect = (period: string) => {
    if (period === 'Custom Range') {
      setShowPeriodMenu(false);
      setShowCustomRangeModal(true);
    } else {
      onPeriodChange(period);
      setShowPeriodMenu(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (fromDate > toDate) {
      alert('From Date must be before To Date');
      return;
    }
    onPeriodChange('Custom Range', fromDate, toDate);
    setShowCustomRangeModal(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.periodSelector}
          onPress={() => setShowPeriodMenu(!showPeriodMenu)}
        >
          <Feather name="calendar" size={20} color={COLORS.primary} />
          <Text style={styles.periodText}>{selectedPeriod}</Text>
          <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        
        {daysInfo && (
          <View style={styles.periodInfo}>
            <Text style={styles.periodInfoText}>{daysInfo}</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.filterButton}>
          <Feather name="filter" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Period Dropdown Menu */}
      {showPeriodMenu && (
        <View style={styles.periodMenu}>
          {periods.map((period, index) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodMenuItem,
                selectedPeriod === period && styles.periodMenuItemActive,
                index === periods.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handlePeriodSelect(period)}
            >
              <Feather 
                name={period === 'Custom Range' ? 'calendar' : 'calendar'} 
                size={18} 
                color={selectedPeriod === period ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[
                styles.periodMenuText,
                selectedPeriod === period && styles.periodMenuTextActive,
              ]}>
                {period}
              </Text>
              {period === 'This Year' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              {selectedPeriod === period && (
                <Feather name="check" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Custom Range Modal */}
      <Modal
        visible={showCustomRangeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Range</Text>
              <TouchableOpacity 
                onPress={() => setShowCustomRangeModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* From Date */}
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>From Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(fromDate)}</Text>
                <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* To Date */}
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>To Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowToDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(toDate)}</Text>
                <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Date range info */}
            <View style={styles.dateInfo}>
              <Feather name="info" size={16} color={COLORS.primary} />
              <Text style={styles.dateInfoText}>
                Select a date range to view budget data for that period
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCustomRangeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyCustomRange}
              >
                <Text style={styles.applyButtonText}>Apply Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* From Date Picker */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowFromDatePicker(Platform.OS === 'ios');
            if (date) setFromDate(date);
          }}
          maximumDate={new Date()}
        />
      )}

      {/* To Date Picker */}
      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowToDatePicker(Platform.OS === 'ios');
            if (date) setToDate(date);
          }}
          minimumDate={fromDate}
          maximumDate={new Date()}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  periodText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
  periodInfo: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  periodInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterButton: {
    padding: SPACING.sm,
  },
  periodMenu: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.md,
  },
  periodMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  periodMenuItemActive: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  periodMenuText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  periodMenuTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  popularBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  popularText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  dateSection: {
    marginBottom: SPACING.lg,
  },
  dateLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
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
    fontWeight: FONT_WEIGHTS.medium,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  dateInfoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
  },
});

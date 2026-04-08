import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export default function MonthYearPicker({ selectedDate, onSelect }: Props) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const handleQuickNav = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    onSelect(newDate);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewYear, monthIndex, 1);
    onSelect(newDate);
    setShowPicker(false);
  };

  const changeYear = (direction: 'prev' | 'next') => {
    setViewYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  return (
    <>
      {/* Inline Selector Bar */}
      <View style={[styles.selectorBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => handleQuickNav('prev')} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setViewYear(selectedYear); setShowPicker(true); }} style={styles.centerBtn}>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {FULL_MONTHS[selectedMonth]} {selectedYear}
          </Text>
          <Ionicons name="caret-down" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleQuickNav('next')} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Full Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
            {/* Year Row */}
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => changeYear('prev')} style={styles.yearArrow}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.text }]}>{viewYear}</Text>
              <TouchableOpacity onPress={() => changeYear('next')} style={styles.yearArrow}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => {
                const isSelected = index === selectedMonth && viewYear === selectedYear;
                const isCurrent = index === new Date().getMonth() && viewYear === new Date().getFullYear();
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthCell,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      isCurrent && !isSelected && { borderColor: colors.primary },
                    ]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                        isCurrent && !isSelected && { color: colors.primary },
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Jump */}
            <TouchableOpacity
              style={[styles.todayBtn, { borderColor: colors.border }]}
              onPress={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                onSelect(new Date(now.getFullYear(), now.getMonth(), 1));
                setShowPicker(false);
              }}
            >
              <Text style={[styles.todayText, { color: colors.primary }]}>Go to Current Month</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  arrowBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearArrow: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthCell: {
    width: '22%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

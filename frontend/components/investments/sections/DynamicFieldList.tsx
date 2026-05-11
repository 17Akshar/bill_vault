// Renders an array of FieldDef rows: label on left, value/input on right.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Modal, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { FieldDef, getByPath, setByPath } from '../categoryFields';
import { formatINR } from '../../../utils/formatINR';

interface DynamicFieldListProps {
  fields: FieldDef[];
  values: any;                               // root investment object
  onChange: (next: any) => void;             // returns mutated investment object
  editable: boolean;
  colors: any;
  // Optional list of accounts for fields of type 'account_picker'.
  accounts?: any[];
}

const formatDate = (iso: string | Date | undefined): string => {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatValueRO = (val: any, type: FieldDef['type']): string => {
  if (val === undefined || val === null || val === '') return '—';
  if (type === 'currency') return formatINR(Number(val));
  if (type === 'date') return formatDate(val);
  if (type === 'percentage') return `${val}%`;
  if (type === 'number') return String(Number(val).toLocaleString('en-IN'));
  return String(val);
};

export const DynamicFieldList = ({
  fields,
  values,
  onChange,
  editable,
  colors,
  accounts = [],
}: DynamicFieldListProps) => {
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);
  const [openAccountPicker, setOpenAccountPicker] = useState<string | null>(null);

  const update = (key: string, raw: any, type: FieldDef['type']) => {
    let coerced: any = raw;
    if (type === 'number' || type === 'currency' || type === 'percentage') {
      coerced = raw === '' ? null : Number(raw);
    } else if (type === 'date') {
      coerced = raw instanceof Date ? raw.toISOString() : raw;
    }
    onChange(setByPath(values, key, coerced));
  };

  const renderAccountValue = (accountId: string | null | undefined): string => {
    if (!accountId) return '—';
    const acc = accounts.find((a) => a.account_id === accountId);
    return acc ? acc.name : accountId;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {fields.map((f, idx) => {
        const v = getByPath(values, f.key);
        const isLast = idx === fields.length - 1;

        return (
          <View
            key={f.key}
            style={[
              styles.row,
              !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
            testID={`invfield-${f.key.replace(/\./g, '-')}`}
          >
            <Text style={[styles.label, { color: colors.textSecondary }]}>{f.label}</Text>

            {!editable || f.readOnly ? (
              <Text style={[styles.valueRO, { color: colors.text }]} numberOfLines={1}>
                {f.type === 'account_picker' ? renderAccountValue(v) : formatValueRO(v, f.type)}
              </Text>
            ) : f.type === 'date' ? (
              <>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setOpenDatePicker(f.key)}
                >
                  <Text style={[styles.valueRO, { color: colors.text }]}>{formatDate(v)}</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {openDatePicker === f.key && (
                  <DateTimePicker
                    value={v ? new Date(v) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                      setOpenDatePicker(null);
                      if (date) update(f.key, date, 'date');
                    }}
                  />
                )}
              </>
            ) : f.type === 'account_picker' ? (
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setOpenAccountPicker(f.key)}
                testID={`account-picker-${f.key.replace(/\./g, '-')}`}
              >
                <Text style={[styles.valueRO, { color: v ? colors.text : colors.textSecondary }]}>
                  {v ? renderAccountValue(v) : (f.placeholder || 'Select account')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={v == null ? '' : String(v)}
                onChangeText={(text) => update(f.key, text, f.type)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType={
                  f.type === 'currency' || f.type === 'number' || f.type === 'percentage'
                    ? 'decimal-pad'
                    : 'default'
                }
              />
            )}
          </View>
        );
      })}

      {/* Account picker modal — used by account_picker fields */}
      <Modal
        visible={!!openAccountPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenAccountPicker(null)}
      >
        <TouchableOpacity
          style={apStyles.overlay}
          activeOpacity={1}
          onPress={() => setOpenAccountPicker(null)}
        >
          <View style={[apStyles.sheet, { backgroundColor: colors.card }]}>
            <View style={apStyles.headerRow}>
              <Text style={[apStyles.title, { color: colors.text }]}>Select Account</Text>
              <TouchableOpacity onPress={() => setOpenAccountPicker(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {accounts.length === 0 ? (
              <Text style={[apStyles.empty, { color: colors.textSecondary }]}>
                No accounts found. Add one in the Accounts module first.
              </Text>
            ) : (
              <FlatList
                data={accounts}
                keyExtractor={(it) => it.account_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[apStyles.row, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (openAccountPicker) {
                        update(openAccountPicker, item.account_id, 'text');
                      }
                      setOpenAccountPicker(null);
                    }}
                  >
                    <Text style={[apStyles.rowName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[apStyles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.account_type ? String(item.account_type).toUpperCase() : ''}
                      {item.balance != null ? ` · ${formatINR(item.balance)}` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const apStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '60%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    minHeight: 56,
  },
  label: { fontSize: 13, fontWeight: '400', flex: 1, lineHeight: 18 },
  valueRO: { fontSize: 15, fontWeight: '700', textAlign: 'right', maxWidth: '60%' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 2,
    paddingHorizontal: 0,
    maxWidth: '60%',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '60%',
  },
});

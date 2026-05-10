// Renders an array of FieldDef rows: label on left, value/input on right.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
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
}: DynamicFieldListProps) => {
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);

  const update = (key: string, raw: any, type: FieldDef['type']) => {
    let coerced: any = raw;
    if (type === 'number' || type === 'currency' || type === 'percentage') {
      coerced = raw === '' ? null : Number(raw);
    } else if (type === 'date') {
      coerced = raw instanceof Date ? raw.toISOString() : raw;
    }
    onChange(setByPath(values, key, coerced));
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
                {formatValueRO(v, f.type)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 14, marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  label: { fontSize: 14, fontWeight: '500', flex: 1 },
  valueRO: { fontSize: 15, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 0,
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

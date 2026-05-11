// Section 4c: Withdrawal Details Section — Date of Withdrawal, Amount Received.
// Used by government schemes where members make partial/full withdrawals (EPF, VPF).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DynamicFieldList } from './DynamicFieldList';
import { FieldDef } from '../categoryFields';

const DEFAULT_WITHDRAWAL_FIELDS: FieldDef[] = [
  { key: 'sale_details.date_of_withdrawal', label: 'Date of Withdrawal', type: 'date' },
  { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
];

interface WithdrawalDetailsSectionProps {
  values: any;
  onChange: (next: any) => void;
  editable: boolean;
  colors: any;
  fields?: FieldDef[];
}

export const WithdrawalDetailsSection = ({ fields, ...rest }: WithdrawalDetailsSectionProps) => (
  <View>
    <Text style={styles.heading}>Withdrawal Details (if any)</Text>
    <DynamicFieldList fields={fields || DEFAULT_WITHDRAWAL_FIELDS} {...rest} />
  </View>
);

const styles = StyleSheet.create({
  heading: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

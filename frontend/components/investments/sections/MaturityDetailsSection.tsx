// Section 4b: Maturity Details Section — Date of Maturity, Amount Received.
// Used by interest-based categories (FD, Corporate Deposit).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DynamicFieldList } from './DynamicFieldList';
import { FieldDef } from '../categoryFields';

const MATURITY_FIELDS: FieldDef[] = [
  { key: 'maturity_details.date_of_maturity', label: 'Date of Maturity', type: 'date' },
  { key: 'maturity_details.amount_received', label: 'Amount Received', type: 'currency' },
];

interface MaturityDetailsSectionProps {
  values: any;
  onChange: (next: any) => void;
  editable: boolean;
  colors: any;
  fields?: FieldDef[];
}

export const MaturityDetailsSection = ({ fields, ...rest }: MaturityDetailsSectionProps) => (
  <View>
    <Text style={styles.heading}>Maturity Details</Text>
    <DynamicFieldList fields={fields || MATURITY_FIELDS} {...rest} />
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

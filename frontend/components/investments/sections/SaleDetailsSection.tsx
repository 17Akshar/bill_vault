// Section 4a: Sale Details Section — Date of Sale, Units Sold, NAV at sale, Amount Received.
// Used by units-based categories (MF, ETF, REIT).

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DynamicFieldList } from './DynamicFieldList';
import { FieldDef } from '../categoryFields';

const SALE_FIELDS: FieldDef[] = [
  { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
  { key: 'sale_details.units_sold', label: 'Units Sold', type: 'number' },
  { key: 'sale_details.sold_nav', label: 'Price at which Sold (NAV)', type: 'currency' },
  { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
];

interface SaleDetailsSectionProps {
  values: any;
  onChange: (next: any) => void;
  editable: boolean;
  colors: any;
  fields?: FieldDef[];
}

export const SaleDetailsSection = ({ fields, ...rest }: SaleDetailsSectionProps) => (
  <View>
    <Text style={styles.heading}>Sale Details (if any)</Text>
    <DynamicFieldList fields={fields || SALE_FIELDS} {...rest} />
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

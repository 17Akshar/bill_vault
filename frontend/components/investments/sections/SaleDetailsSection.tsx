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
}

export const SaleDetailsSection = (props: SaleDetailsSectionProps) => (
  <View>
    <Text style={[styles.heading, { color: '#A78BFA' }]}>Sale Details (if any)</Text>
    <DynamicFieldList fields={SALE_FIELDS} {...props} />
  </View>
);

const styles = StyleSheet.create({
  heading: {
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
});

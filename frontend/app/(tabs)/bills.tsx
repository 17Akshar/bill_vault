import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../utils/api';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { formatINR } from '../../utils/formatINR';
import MonthYearPicker from '../../components/MonthYearPicker';

interface Bill {
  bill_id: string;
  name: string;
  amount: number;
  currency: string;
  due_date: string;
  category: string;
  vendor?: string;
  notes?: string;
  receipt_image?: string;
  is_recurring: boolean;
  recurrence_type?: string;
  payment_status: string;
}

export default function BillsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    loadBills();
  }, [isAuthenticated, selectedMonth, filter]);

  const loadBills = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const params: any = { month, year };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await api.get('/bills', { params });
      setBills(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBills();
  }, [selectedMonth, filter]);

  const toggleBillPaid = async (billId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      await api.put(`/bills/${billId}`, { payment_status: newStatus });
      
      // Update local state
      setBills(bills.map(bill => 
        bill.bill_id === billId 
          ? { ...bill, payment_status: newStatus }
          : bill
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to update bill status');
    }
  };

  const deleteBill = (billId: string) => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/bills/${billId}`);
              setBills(bills.filter(bill => bill.bill_id !== billId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  const changeMonth = (_direction: 'prev' | 'next') => {
    // Handled by MonthYearPicker
  };

  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidAmount = bills.filter(b => b.payment_status === 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const unpaidAmount = totalAmount - paidAmount;

  const renderBillItem = ({ item }: { item: Bill }) => {
    const dueDate = parseISO(item.due_date);
    const isPaid = item.payment_status === 'paid';
    const isOverdue = !isPaid && dueDate < new Date();

    return (
      <TouchableOpacity
        style={[styles.billCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/bills/${item.bill_id}` as any)}
      >
        <View style={styles.billHeader}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.border },
              isPaid && { backgroundColor: colors.success, borderColor: colors.success }
            ]}
            onPress={() => toggleBillPaid(item.bill_id, item.payment_status)}
          >
            {isPaid && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </TouchableOpacity>
          
          <View style={styles.billInfo}>
            <Text style={[styles.billName, { color: colors.text }]}>{item.name}</Text>
            {item.vendor && (
              <Text style={[styles.billVendor, { color: colors.textSecondary }]}>
                {item.vendor}
              </Text>
            )}
            <View style={styles.billMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.categoryText, { color: colors.text }]}>
                  {item.category}
                </Text>
              </View>
              {item.is_recurring && (
                <View style={[styles.recurringBadge, { backgroundColor: colors.info + '20' }]}>
                  <Ionicons name="repeat" size={12} color={colors.info} />
                  <Text style={[styles.recurringText, { color: colors.info }]}>
                    {item.recurrence_type}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.billRight}>
            <Text style={[styles.billAmount, { color: colors.text }]}>
              {formatINR(item.amount)}
            </Text>
            <Text 
              style={[
                styles.dueDate,
                { color: isOverdue ? colors.danger : colors.textSecondary }
              ]}
            >
              {format(dueDate, 'MMM d')}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteBill(item.bill_id)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bills</Text>
      </View>

      {/* Month Selector */}
      <MonthYearPicker selectedDate={selectedMonth} onSelect={setSelectedMonth} />

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatINR(totalAmount)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paid</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatINR(paidAmount)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Unpaid</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {formatINR(unpaidAmount)}
          </Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'unpaid', 'paid'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              { borderColor: colors.border },
              filter === filterOption && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.text },
                filter === filterOption && { color: '#FFFFFF' }
              ]}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bills List */}
      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.bill_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No bills for this month
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/bills/add' as any)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  billCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  billVendor: {
    fontSize: 14,
    marginBottom: 8,
  },
  billMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
    fontWeight: '500',
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

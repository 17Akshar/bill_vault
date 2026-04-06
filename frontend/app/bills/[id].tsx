import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { format, parseISO } from 'date-fns';

interface Bill {
  bill_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  vendor?: string;
  notes?: string;
  receipt_image?: string;
  is_recurring: boolean;
  recurrence_type?: string;
  payment_status: string;
  created_at: string;
}

export default function BillDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBill();
  }, [id]);

  const loadBill = async () => {
    try {
      const response = await api.get(`/bills/${id}`);
      setBill(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bill details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const togglePaidStatus = async () => {
    if (!bill) return;
    
    try {
      const newStatus = bill.payment_status === 'paid' ? 'unpaid' : 'paid';
      await api.put(`/bills/${bill.bill_id}`, { payment_status: newStatus });
      setBill({ ...bill, payment_status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update bill status');
    }
  };

  const deleteBill = () => {
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
              await api.delete(`/bills/${id}`);
              Alert.alert('Success', 'Bill deleted successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!bill) return null;

  const isPaid = bill.payment_status === 'paid';
  const dueDate = parseISO(bill.due_date);
  const isOverdue = !isPaid && dueDate < new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bill Details</Text>
        <TouchableOpacity onPress={() => router.push(`/bills/edit?id=${bill.bill_id}` as any)} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: isPaid ? colors.success + '20' : isOverdue ? colors.danger + '20' : colors.warning + '20' }]}>
          <Ionicons 
            name={isPaid ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'} 
            size={24} 
            color={isPaid ? colors.success : isOverdue ? colors.danger : colors.warning} 
          />
          <Text style={[styles.statusText, { color: isPaid ? colors.success : isOverdue ? colors.danger : colors.warning }]}>
            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
          </Text>
        </View>

        {/* Bill Name */}
        <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>

        {/* Amount */}
        <Text style={[styles.amount, { color: colors.text }]}>${bill.amount.toFixed(2)}</Text>

        {/* Details Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <DetailRow icon="calendar-outline" label="Due Date" value={format(dueDate, 'MMM d, yyyy')} colors={colors} />
          <DetailRow icon="pricetag-outline" label="Category" value={bill.category} colors={colors} />
          {bill.vendor && (
            <DetailRow icon="business-outline" label="Vendor" value={bill.vendor} colors={colors} />
          )}
          {bill.is_recurring && (
            <DetailRow 
              icon="repeat" 
              label="Recurring" 
              value={`${bill.recurrence_type?.charAt(0).toUpperCase()}${bill.recurrence_type?.slice(1)}`} 
              colors={colors} 
            />
          )}
          <DetailRow icon="time-outline" label="Created" value={format(parseISO(bill.created_at), 'MMM d, yyyy')} colors={colors} isLast />
        </View>

        {/* Notes */}
        {bill.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{bill.notes}</Text>
          </View>
        )}

        {/* Receipt */}
        {bill.receipt_image && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="image-outline" size={20} color={colors.text} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Receipt</Text>
            </View>
            <Image source={{ uri: bill.receipt_image }} style={styles.receiptImage} resizeMode="contain" />
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isPaid ? colors.warning : colors.success }]}
          onPress={togglePaidStatus}
        >
          <Ionicons name={isPaid ? 'close-circle-outline' : 'checkmark-circle-outline'} size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>
            {isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={deleteBill}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Delete Bill</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ icon, label, value, colors, isLast }: any) => (
  <View style={[styles.detailRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
    <View style={styles.detailLeft}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
    <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  billName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
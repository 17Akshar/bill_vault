import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { getInvestmentType } from './types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function InvestmentDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'notes'>('overview');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [savingTxn, setSavingTxn] = useState(false);
  
  // Transaction form
  const [txnType, setTxnType] = useState('buy');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnQuantity, setTxnQuantity] = useState('');
  const [txnPrice, setTxnPrice] = useState('');
  const [txnDate, setTxnDate] = useState(new Date());
  const [txnNotes, setTxnNotes] = useState('');
  const [showTxnDatePicker, setShowTxnDatePicker] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      const response = await api.get(`/investments/${id}`);
      setInvestment(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load investment');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to remove "${investment?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/investments/${id}`);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete investment');
            }
          },
        },
      ]
    );
  };

  const handleAddTransaction = async () => {
    if (!txnAmount || parseFloat(txnAmount) <= 0) {
      Alert.alert('Required', 'Please enter transaction amount');
      return;
    }

    setSavingTxn(true);
    try {
      await api.post(`/investments/${id}/transactions`, {
        transaction_type: txnType,
        amount: parseFloat(txnAmount),
        quantity: txnQuantity ? parseFloat(txnQuantity) : null,
        price_per_unit: txnPrice ? parseFloat(txnPrice) : null,
        transaction_date: txnDate.toISOString(),
        notes: txnNotes.trim() || null,
      });
      
      setShowAddTransaction(false);
      setTxnType('buy');
      setTxnAmount('');
      setTxnQuantity('');
      setTxnPrice('');
      setTxnNotes('');
      
      load();
      Alert.alert('Success', 'Transaction added successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add transaction');
    } finally {
      setSavingTxn(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!investment) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Investment not found</Text>
      </View>
    );
  }

  const type = getInvestmentType(investment.investment_type);
  const gainLoss = investment.current_value - investment.invested_amount;
  const gainLossPct = investment.invested_amount > 0 ? (gainLoss / investment.invested_amount) * 100 : 0;
  const gainLossColor = gainLoss >= 0 ? '#00E676' : '#FF5252';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {investment.name}
        </Text>
        <TouchableOpacity onPress={() => router.push(`/investments/add?id=${id}` as any)}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Investment Header */}
        <View style={[styles.invHeader, { backgroundColor: colors.card }]}>
          <View style={styles.invHeaderTop}>
            <View style={[styles.typeIcon, { backgroundColor: type?.color + '20' }]}>
              <Ionicons name={type?.icon as any} size={32} color={type?.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.invName, { color: colors.text }]}>{investment.name}</Text>
              <Text style={[styles.invType, { color: colors.textSecondary }]}>{type?.label}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: investment.status === 'active' ? '#00E67615' : investment.status === 'matured' ? '#448AFF15' : '#64748B15'
            }]}>
              <Text style={{ 
                color: investment.status === 'active' ? '#00E676' : investment.status === 'matured' ? '#448AFF' : '#64748B',
                fontSize: 12,
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {investment.status}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invested</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatINR(investment.invested_amount)}</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Current Value</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatINR(investment.current_value)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Gain / Loss</Text>
              <Text style={[styles.metricValue, { color: gainLossColor }]}>
                {gainLoss >= 0 ? '+' : ''}{formatINR(Math.abs(gainLoss))}
              </Text>
              <Text style={{ color: gainLossColor, fontSize: 13, fontWeight: '700' }}>
                ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {[
            { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
            { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
            { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? type?.color : colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? type?.color : colors.textSecondary }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View>
              {/* Basic Info */}
              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Basic Information</Text>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(investment.purchase_date).toLocaleDateString()}
                  </Text>
                </View>
                {investment.maturity_date && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Maturity Date</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {new Date(investment.maturity_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Created</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(investment.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Type-Specific Data */}
              {investment.type_specific_data && Object.keys(investment.type_specific_data).length > 0 && (
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>{type?.label} Details</Text>
                  {Object.entries(investment.type_specific_data).map(([key, value]: [string, any]) => {
                    if (!value) return null;
                    const field = type?.fields?.find(f => f.key === key);
                    return (
                      <View key={key} style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                          {field?.label || key}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {field?.prefix || ''}{value}{field?.suffix || ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {activeTab === 'transactions' && (
            <View>
              <View style={styles.txnHeader}>
                <Text style={[styles.txnTitle, { color: colors.text }]}>
                  Transaction History ({investment.transactions?.length || 0})
                </Text>
                <TouchableOpacity
                  style={[styles.addTxnBtn, { backgroundColor: type?.color }]}
                  onPress={() => setShowAddTransaction(true)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.addTxnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {investment.transactions && investment.transactions.length > 0 ? (
                investment.transactions.map((txn: any) => (
                  <View key={txn.transaction_id} style={[styles.txnCard, { backgroundColor: colors.card }]}>
                    <View style={styles.txnCardHeader}>
                      <View style={[
                        styles.txnTypeBadge,
                        { backgroundColor: 
                          txn.transaction_type === 'buy' ? '#00E67620' :
                          txn.transaction_type === 'sell' ? '#FF525220' :
                          txn.transaction_type === 'mature' ? '#448AFF20' : '#FFB30020'
                        }
                      ]}>
                        <Text style={{
                          color: 
                            txn.transaction_type === 'buy' ? '#00E676' :
                            txn.transaction_type === 'sell' ? '#FF5252' :
                            txn.transaction_type === 'mature' ? '#448AFF' : '#FFB300',
                          fontSize: 12,
                          fontWeight: '700',
                          textTransform: 'capitalize'
                        }}>
                          {txn.transaction_type}
                        </Text>
                      </View>
                      <Text style={[styles.txnAmount, { color: colors.text }]}>
                        {formatINR(txn.amount)}
                      </Text>
                    </View>
                    <View style={styles.txnDetails}>
                      <View style={styles.txnDetailRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.txnDetailText, { color: colors.textSecondary }]}>
                          {new Date(txn.transaction_date).toLocaleDateString()}
                        </Text>
                      </View>
                      {txn.quantity && (
                        <View style={styles.txnDetailRow}>
                          <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.txnDetailText, { color: colors.textSecondary }]}>
                            Qty: {txn.quantity}
                          </Text>
                        </View>
                      )}
                      {txn.price_per_unit && (
                        <View style={styles.txnDetailRow}>
                          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.txnDetailText, { color: colors.textSecondary }]}>
                            ₹{txn.price_per_unit}/unit
                          </Text>
                        </View>
                      )}
                    </View>
                    {txn.notes && (
                      <Text style={[styles.txnNotes, { color: colors.textSecondary }]}>{txn.notes}</Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="swap-horizontal-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    Add buy, sell, or other transactions to track your investment activity
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'notes' && (
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Notes</Text>
              {investment.notes ? (
                <Text style={[styles.notesText, { color: colors.text }]}>{investment.notes}</Text>
              ) : (
                <Text style={[styles.emptyNotes, { color: colors.textSecondary }]}>
                  No notes added. Tap edit to add notes.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: '#FF5252' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
            <Text style={{ color: '#FF5252', fontSize: 15, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={showAddTransaction} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddTransaction(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Transaction Type</Text>
              <View style={styles.txnTypeRow}>
                {['buy', 'sell', 'mature', 'redeem'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.txnTypeChip,
                      { borderColor: colors.border },
                      txnType === t && { backgroundColor: type?.color + '20', borderColor: type?.color },
                    ]}
                    onPress={() => setTxnType(t)}
                  >
                    <Text style={{
                      color: txnType === t ? type?.color : colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Amount *</Text>
              <View style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: type?.color, fontSize: 18, fontWeight: 'bold' }}>₹</Text>
                <TextInput
                  style={[styles.fieldInputText, { color: colors.text }]}
                  value={txnAmount}
                  onChangeText={setTxnAmount}
                  placeholder="10000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Quantity (Optional)</Text>
              <View style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.fieldInputText, { color: colors.text }]}
                  value={txnQuantity}
                  onChangeText={setTxnQuantity}
                  placeholder="50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Price per Unit (Optional)</Text>
              <View style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>₹</Text>
                <TextInput
                  style={[styles.fieldInputText, { color: colors.text }]}
                  value={txnPrice}
                  onChangeText={setTxnPrice}
                  placeholder="200"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Transaction Date</Text>
              <TouchableOpacity
                style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowTxnDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.fieldInputText, { color: colors.text }]}>
                  {txnDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showTxnDatePicker && (
                <DateTimePicker
                  value={txnDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowTxnDatePicker(false);
                    if (date) setTxnDate(date);
                  }}
                />
              )}

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes (Optional)</Text>
              <View style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.background, height: 80 }]}>
                <TextInput
                  style={[styles.fieldInputText, { color: colors.text, textAlignVertical: 'top' }]}
                  value={txnNotes}
                  onChangeText={setTxnNotes}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: type?.color }]}
                onPress={handleAddTransaction}
                disabled={savingTxn}
              >
                {savingTxn ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Add Transaction</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1, marginHorizontal: 12 },
  invHeader: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  invHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  invName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  invType: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  metricsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)', paddingTop: 16 },
  metricCard: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 12, marginBottom: 6 },
  metricValue: { fontSize: 16, fontWeight: 'bold' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    opacity: 0.5,
  },
  activeTab: { opacity: 1, borderBottomWidth: 2, borderBottomColor: 'currentColor' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabContent: { paddingHorizontal: 20 },
  infoCard: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.05)',
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  txnTitle: { fontSize: 16, fontWeight: '700' },
  addTxnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addTxnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  txnCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  txnCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txnTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  txnAmount: { fontSize: 16, fontWeight: 'bold' },
  txnDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  txnDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txnDetailText: { fontSize: 12 },
  txnNotes: { fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  notesText: { fontSize: 14, lineHeight: 22 },
  emptyNotes: { fontSize: 14, fontStyle: 'italic' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 8,
  },
  fieldInputText: { flex: 1, fontSize: 15 },
  txnTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  txnTypeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const downloadCSV = async (endpoint: string, filename: string) => {
    try {
      const res = await api.get(endpoint, { responseType: 'text' });
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, typeof res.data === 'string' ? res.data : JSON.stringify(res.data), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Export ${filename}` });
      } else {
        Alert.alert('Export Ready', `File saved as ${filename}`);
      }
    } catch (e) {
      Alert.alert('Export Error', 'Failed to download. Please try again.');
      console.error(e);
    }
  };

  const sections = [
    {
      title: 'Analytics',
      items: [
        { icon: 'trending-up', label: 'Investment Analytics', desc: 'CAGR, Portfolio, Top Performers', color: '#00E676', route: '/reports/investment-analytics' },
        { icon: 'bar-chart', label: 'Cash Flow', desc: 'Income vs Expense trends, Savings rate', color: '#448AFF', route: '/reports/cashflow' },
        { icon: 'pie-chart', label: 'Expense Breakdown', desc: 'Category-wise spending analysis', color: '#FF5252', route: '/reports/expense-breakdown' },
      ]
    },
    {
      title: 'Export Data',
      items: [
        { icon: 'document-text', label: 'Transactions CSV', desc: 'Download all income & expenses', color: '#7C4DFF', onPress: () => downloadCSV('/export/transactions-csv', 'transactions.csv') },
        { icon: 'analytics', label: 'Investments CSV', desc: 'Download investment portfolio', color: '#00E676', onPress: () => downloadCSV('/export/investments-csv', 'investments.csv') },
        { icon: 'diamond', label: 'Net Worth CSV', desc: 'Download assets & liabilities', color: '#448AFF', onPress: () => downloadCSV('/export/networth-csv', 'networth.csv') },
      ]
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Reports & Analytics</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => item.route ? router.push(item.route as any) : item.onPress?.()}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
                <Ionicons name={item.route ? 'chevron-forward' : 'download-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 10 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  cardDesc: { fontSize: 12 },
});

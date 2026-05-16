import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const FAQ_ITEMS = [
  {
    q: 'How do I add a transaction?',
    a: 'Go to the Transactions tab and tap the + button. Select income or expense, fill in the details, and tap Save.',
  },
  {
    q: 'How do I set up a budget?',
    a: 'Navigate to More → Budget Limits. Tap "Add Budget" and set your category, amount, and period.',
  },
  {
    q: 'Can I track multiple accounts?',
    a: 'Yes! Go to Accounts and tap "Add Account". You can add bank accounts, cash, UPI, and more.',
  },
  {
    q: 'How do I back up my data?',
    a: 'Go to Settings → Backup, Sync & Export. You can back up to your phone, Google Drive, or OneDrive.',
  },
  {
    q: 'How do I change my MPIN?',
    a: 'Go to Settings → Security → MPIN (App PIN) and follow the steps to change your PIN.',
  },
  {
    q: 'How do I set up reminders?',
    a: 'Go to More → Reminders and tap the + button. Set the title, date, and recurrence for your reminder.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const contactOptions = [
    {
      icon: 'mail-outline',
      label: 'Email Support',
      value: 'support@fintracker.app',
      action: () => Linking.openURL('mailto:support@fintracker.app'),
    },
    {
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      value: '+91 98765 43210',
      action: () => Alert.alert('WhatsApp', 'Connect via WhatsApp at +91 98765 43210'),
    },
    {
      icon: 'chatbubble-outline',
      label: 'Live Chat',
      value: 'Available 9AM - 6PM',
      action: () => Alert.alert('Live Chat', 'Live chat will open shortly'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={[styles.heroIcon, { backgroundColor: '#EF444415' }]}>
            <Ionicons name="help-circle" size={40} color="#EF4444" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>How can we help you?</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Find answers to common questions or contact our support team</Text>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        <View style={[styles.faqCard, { backgroundColor: colors.card }]}>
          {FAQ_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.faqItem, idx < FAQ_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: colors.text, flex: 1 }]}>{item.q}</Text>
                <Ionicons
                  name={expandedFaq === idx ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
              {expandedFaq === idx && (
                <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
        <View style={[styles.contactCard, { backgroundColor: colors.card }]}>
          {contactOptions.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.contactItem, idx < contactOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={opt.action}
            >
              <View style={[styles.contactIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={opt.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>{opt.label}</Text>
                <Text style={[styles.contactValue, { color: colors.textSecondary }]}>{opt.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Version</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>Fintracker v2.0</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  heroCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, gap: 12 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },

  faqCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  faqItem: { padding: 16 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQuestion: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqAnswer: { fontSize: 13, fontWeight: '400', lineHeight: 20, marginTop: 8 },

  contactCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  contactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  contactValue: { fontSize: 12, fontWeight: '400' },

  infoCard: { borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600' },
});

/**
 * Add Account screen — supports Bank, Cash, UPI, Overdraft per finalized UI spec.
 *
 * The screen renders a horizontal type-picker at top, then conditionally shows
 * the form body that matches the chosen type:
 *   - Bank      → Bank Account, Holder, A/c No, IFSC, Bank Name, Branch, Account Type, Opening Balance, Color
 *   - Cash      → Name, Type, Currency, Initial Balance, Location, Include-in-NetWorth, Notes
 *   - UPI       → Name, Type, Bank Name, UPI ID, Linked App, Status, Primary, VPA
 *   - Overdraft → Name, Type, Bank Name, Limit, Interest, Used, Available (derived), Start, End, Charges
 *
 * On save we POST a single payload to `/api/accounts`; the backend persists every
 * field and validates per-type requirements.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

type AccountTypeKey = 'bank' | 'cash' | 'upi' | 'overdraft';

const TYPE_OPTIONS: { key: AccountTypeKey; label: string; icon: string; color: string }[] = [
  { key: 'bank', label: 'Bank', icon: 'business-outline', color: '#3B82F6' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline', color: '#22C55E' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline', color: '#10B981' },
  { key: 'overdraft', label: 'Overdraft', icon: 'business', color: '#7C3AED' },
];

const BANK_SUB_TYPES = ['Savings', 'Current', 'Other'];
const UPI_LINKED_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Other'];
const COLOR_SWATCHES = [
  '#FFC107', '#FF7043', '#42A5F5', '#66BB6A', '#AB47BC',
  '#26C6DA', '#EC407A', '#7C4DFF', '#FFEB3B', '#8D6E63',
];

export default function AddAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { colors } = useTheme();

  const initialType =
    (params.type as AccountTypeKey) && ['bank', 'cash', 'upi', 'overdraft'].includes(params.type as string)
      ? (params.type as AccountTypeKey)
      : 'bank';
  const [accountType, setAccountType] = useState<AccountTypeKey>(initialType);

  // ---- Bank fields ----
  const [bankNickname, setBankNickname] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [bankSubType, setBankSubType] = useState('Savings');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountColor, setAccountColor] = useState<string>(COLOR_SWATCHES[0]);

  // ---- Cash fields ----
  const [cashName, setCashName] = useState('Cash in Hand');
  const [currency] = useState('INR');
  const [initialCashBalance, setInitialCashBalance] = useState('');
  const [cashLocation, setCashLocation] = useState('');
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);
  const [cashNotes, setCashNotes] = useState('');

  // ---- UPI fields ----
  const [upiName, setUpiName] = useState('');
  const [upiSubType, setUpiSubType] = useState('Savings');
  const [upiBankName, setUpiBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiLinkedApp, setUpiLinkedApp] = useState('Google Pay');
  const [isPrimaryUpi, setIsPrimaryUpi] = useState(false);
  const [vpa, setVpa] = useState('');

  // ---- Overdraft fields ----
  const [odName, setOdName] = useState('');
  const [odBankName, setOdBankName] = useState('');
  const [odSubType, setOdSubType] = useState('Current');
  const [odLimit, setOdLimit] = useState('');
  const [odInterest, setOdInterest] = useState('');
  const [odUsed, setOdUsed] = useState('');
  const [odStart, setOdStart] = useState<Date>(new Date());
  const [odEnd, setOdEnd] = useState<Date>(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d;
  });
  const [odCharges, setOdCharges] = useState('');

  const [saving, setSaving] = useState(false);

  // Available Overdraft = Limit − Used (derived, read-only)
  const odAvailable = useMemo(() => {
    const lim = parseFloat(odLimit);
    const usd = parseFloat(odUsed);
    if (Number.isFinite(lim) && Number.isFinite(usd)) return Math.max(0, lim - usd);
    if (Number.isFinite(lim)) return lim;
    return 0;
  }, [odLimit, odUsed]);

  const buildPayload = () => {
    if (accountType === 'bank') {
      if (!bankNickname.trim()) throw new Error('Please enter a Bank Account name');
      if (!accountHolderName.trim()) throw new Error('Account holder name required');
      if (!accountNumber.trim()) throw new Error('Account number required');
      if (!ifscCode.trim() || ifscCode.trim().length < 4)
        throw new Error('Valid IFSC code required');
      if (!bankName.trim()) throw new Error('Please select a Bank name');
      return {
        name: bankNickname.trim(),
        account_type: 'bank',
        sub_type: bankSubType.toLowerCase(),
        institution: bankName.trim(),
        initial_balance: parseFloat(openingBalance) || 0,
        account_holder_name: accountHolderName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        branch_name: branchName.trim() || null,
        color: accountColor,
      };
    }
    if (accountType === 'cash') {
      if (!cashName.trim()) throw new Error('Account name required');
      return {
        name: cashName.trim(),
        account_type: 'cash',
        currency,
        initial_balance: parseFloat(initialCashBalance) || 0,
        cash_location: cashLocation.trim() || null,
        include_in_net_worth: includeInNetWorth,
        notes: cashNotes.trim() || null,
      };
    }
    if (accountType === 'upi') {
      if (!upiName.trim()) throw new Error('Account name required');
      if (!upiBankName.trim()) throw new Error('Bank name required');
      if (!upiId.trim() || !upiId.includes('@'))
        throw new Error('Valid UPI ID required (e.g., name@bank)');
      return {
        name: upiName.trim(),
        account_type: 'upi',
        sub_type: upiSubType.toLowerCase(),
        institution: upiBankName.trim(),
        upi_id: upiId.trim(),
        linked_app: upiLinkedApp,
        upi_status: 'active',
        is_primary_upi: isPrimaryUpi,
        vpa: vpa.trim() || null,
      };
    }
    // overdraft
    if (!odName.trim()) throw new Error('Account name required');
    if (!odBankName.trim()) throw new Error('Bank name required');
    const lim = parseFloat(odLimit);
    if (!Number.isFinite(lim) || lim <= 0) throw new Error('Overdraft Limit must be > 0');
    const usd = parseFloat(odUsed) || 0;
    if (usd < 0) throw new Error('Currently Used cannot be negative');
    if (usd > lim) throw new Error('Currently Used cannot exceed Overdraft Limit');
    return {
      name: odName.trim(),
      account_type: 'overdraft',
      sub_type: odSubType.toLowerCase(),
      institution: odBankName.trim(),
      overdraft_limit: lim,
      interest_rate: parseFloat(odInterest) || 0,
      overdraft_used: usd,
      overdraft_start_date: odStart.toISOString(),
      overdraft_end_date: odEnd.toISOString(),
      overdraft_charges: parseFloat(odCharges) || 0,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = buildPayload();
      await api.post('/accounts', body);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/accounts' as any);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create account';
      Alert.alert('Cannot save', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const accent = TYPE_OPTIONS.find((t) => t.key === accountType)!.color;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="add-account-back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/accounts' as any))}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Account</Text>
          <TouchableOpacity testID="add-account-save-top" onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Text style={{ color: accent, fontWeight: '700', fontSize: 16 }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Type picker */}
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((t) => {
            const active = accountType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                testID={`account-type-${t.key}`}
                style={[
                  styles.typeChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  active && { borderColor: t.color, borderWidth: 2, backgroundColor: t.color + '14' },
                ]}
                onPress={() => setAccountType(t.key)}
              >
                <Ionicons name={t.icon as any} size={18} color={active ? t.color : colors.textSecondary} />
                <Text style={{ color: active ? t.color : colors.text, fontSize: 13, fontWeight: '600' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {accountType === 'bank' && (
            <BankForm
              colors={colors}
              accent={accent}
              bankNickname={bankNickname}
              setBankNickname={setBankNickname}
              accountHolderName={accountHolderName}
              setAccountHolderName={setAccountHolderName}
              accountNumber={accountNumber}
              setAccountNumber={setAccountNumber}
              ifscCode={ifscCode}
              setIfscCode={setIfscCode}
              bankName={bankName}
              setBankName={setBankName}
              branchName={branchName}
              setBranchName={setBranchName}
              bankSubType={bankSubType}
              setBankSubType={setBankSubType}
              openingBalance={openingBalance}
              setOpeningBalance={setOpeningBalance}
              accountColor={accountColor}
              setAccountColor={setAccountColor}
            />
          )}

          {accountType === 'cash' && (
            <CashForm
              colors={colors}
              cashName={cashName}
              setCashName={setCashName}
              currency={currency}
              initialCashBalance={initialCashBalance}
              setInitialCashBalance={setInitialCashBalance}
              cashLocation={cashLocation}
              setCashLocation={setCashLocation}
              includeInNetWorth={includeInNetWorth}
              setIncludeInNetWorth={setIncludeInNetWorth}
              cashNotes={cashNotes}
              setCashNotes={setCashNotes}
            />
          )}

          {accountType === 'upi' && (
            <UpiForm
              colors={colors}
              accent={accent}
              upiName={upiName}
              setUpiName={setUpiName}
              upiSubType={upiSubType}
              setUpiSubType={setUpiSubType}
              upiBankName={upiBankName}
              setUpiBankName={setUpiBankName}
              upiId={upiId}
              setUpiId={setUpiId}
              upiLinkedApp={upiLinkedApp}
              setUpiLinkedApp={setUpiLinkedApp}
              isPrimaryUpi={isPrimaryUpi}
              setIsPrimaryUpi={setIsPrimaryUpi}
              vpa={vpa}
              setVpa={setVpa}
            />
          )}

          {accountType === 'overdraft' && (
            <OverdraftForm
              colors={colors}
              accent={accent}
              odName={odName}
              setOdName={setOdName}
              odBankName={odBankName}
              setOdBankName={setOdBankName}
              odSubType={odSubType}
              setOdSubType={setOdSubType}
              odLimit={odLimit}
              setOdLimit={setOdLimit}
              odInterest={odInterest}
              setOdInterest={setOdInterest}
              odUsed={odUsed}
              setOdUsed={setOdUsed}
              odAvailable={odAvailable}
              odStart={odStart}
              setOdStart={setOdStart}
              odEnd={odEnd}
              setOdEnd={setOdEnd}
              odCharges={odCharges}
              setOdCharges={setOdCharges}
            />
          )}

          {/* Save button (bottom) */}
          <TouchableOpacity
            testID="add-account-save"
            style={[styles.saveButton, { backgroundColor: accent }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ===========================================================================
   FORM SUB-COMPONENTS
   =========================================================================== */

type ColorTokens = ReturnType<typeof useTheme>['colors'];

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      {title ? (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            opacity: 0.6,
            letterSpacing: 1,
            marginBottom: 8,
            color: '#A0A3BD',
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function Row({
  colors,
  icon,
  label,
  required,
  children,
}: {
  colors: ColorTokens;
  icon: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        gap: 12,
      }}
    >
      <Ionicons name={icon as any} size={20} color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 2 }}>
          {label}
          {required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
        </Text>
        {children}
      </View>
    </View>
  );
}

function PlainInput({
  colors,
  ...rest
}: { colors: ColorTokens } & React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      style={{ color: colors.text, fontSize: 15, padding: 0 }}
      placeholderTextColor={colors.textSecondary}
      {...rest}
    />
  );
}

function ChipPicker({
  options,
  value,
  onChange,
  accent,
  colors,
  testIdPrefix,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
  colors: ColorTokens;
  testIdPrefix: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value.toLowerCase() === opt.toLowerCase();
        return (
          <TouchableOpacity
            key={opt}
            testID={`${testIdPrefix}-${opt.toLowerCase().replace(/\s+/g, '-')}`}
            onPress={() => onChange(opt)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: active ? accent : colors.border,
              backgroundColor: active ? accent + '20' : colors.card,
            }}
          >
            <Text style={{ color: active ? accent : colors.text, fontSize: 13, fontWeight: '500' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ---------------------------- Bank ---------------------------- */
function BankForm(props: any) {
  const { colors, accent } = props;
  const [ifscLookupBusy, setIfscLookupBusy] = React.useState(false);
  const [ifscError, setIfscError] = React.useState<string | null>(null);

  const findIfsc = async (code?: string) => {
    const ifsc = (code || props.ifscCode || '').trim().toUpperCase();
    setIfscError(null);
    if (ifsc.length !== 11) {
      setIfscError('IFSC must be 11 characters');
      return;
    }
    setIfscLookupBusy(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
      if (!res.ok) {
        setIfscError('IFSC not found');
        return;
      }
      const data = await res.json();
      // Auto-populate Bank Name + Branch
      if (data?.BANK) props.setBankName(String(data.BANK));
      if (data?.BRANCH) props.setBranchName(String(data.BRANCH));
    } catch {
      setIfscError('Lookup failed — check your connection');
    } finally {
      setIfscLookupBusy(false);
    }
  };

  return (
    <>
      <Section title="ACCOUNT DETAILS">
        <Row colors={colors} icon="business-outline" label="Bank Account" required>
          <PlainInput
            colors={colors}
            testID="bank-nickname"
            value={props.bankNickname}
            onChangeText={props.setBankNickname}
            placeholder="e.g., HDFC Salary A/c"
          />
        </Row>
        <Row colors={colors} icon="person-outline" label="Account holder name" required>
          <PlainInput
            colors={colors}
            testID="bank-holder"
            value={props.accountHolderName}
            onChangeText={props.setAccountHolderName}
            placeholder="Full name"
          />
        </Row>
        <Row colors={colors} icon="card-outline" label="Account number" required>
          <PlainInput
            colors={colors}
            testID="bank-account-number"
            value={props.accountNumber}
            onChangeText={props.setAccountNumber}
            placeholder="Enter account number"
            keyboardType="number-pad"
          />
        </Row>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
            gap: 12,
          }}
        >
          <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 2 }}
            >
              IFSC code <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <PlainInput
              colors={colors}
              testID="bank-ifsc"
              value={props.ifscCode}
              onChangeText={(v: string) => {
                const up = v.toUpperCase();
                props.setIfscCode(up);
                setIfscError(null);
                if (up.length === 11) findIfsc(up);
              }}
              placeholder="HDFC0000123"
              autoCapitalize="characters"
              maxLength={11}
            />
            {ifscError && (
              <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{ifscError}</Text>
            )}
          </View>
          <TouchableOpacity
            testID="bank-find-ifsc"
            disabled={ifscLookupBusy}
            onPress={() => findIfsc()}
          >
            {ifscLookupBusy ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Text style={{ color: accent, fontWeight: '600', fontSize: 13 }}>Find IFSC</Text>
            )}
          </TouchableOpacity>
        </View>
        <Row colors={colors} icon="business-outline" label="Bank name" required>
          <PlainInput
            colors={colors}
            testID="bank-name"
            value={props.bankName}
            onChangeText={props.setBankName}
            placeholder="HDFC Bank, ICICI Bank…"
          />
        </Row>
        <Row colors={colors} icon="git-branch-outline" label="Branch name (Optional)">
          <PlainInput
            colors={colors}
            testID="bank-branch"
            value={props.branchName}
            onChangeText={props.setBranchName}
            placeholder="Mumbai, Andheri…"
          />
        </Row>
        <Row colors={colors} icon="pricetag-outline" label="Account type" required>
          <ChipPicker
            options={BANK_SUB_TYPES}
            value={props.bankSubType}
            onChange={props.setBankSubType}
            accent={accent}
            colors={colors}
            testIdPrefix="bank-subtype"
          />
        </Row>
      </Section>

      <Section title="OPENING BALANCE (OPTIONAL)">
        <Row colors={colors} icon="cash-outline" label="Current balance">
          <PlainInput
            colors={colors}
            testID="bank-opening-balance"
            value={props.openingBalance}
            onChangeText={props.setOpeningBalance}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </Row>
      </Section>

      <Section title="ADDITIONAL SETTINGS">
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
          Account color
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {COLOR_SWATCHES.map((c) => (
            <TouchableOpacity
              key={c}
              testID={`bank-color-${c}`}
              onPress={() => props.setAccountColor(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c,
                borderWidth: props.accountColor === c ? 3 : 0,
                borderColor: '#FFFFFF',
              }}
            />
          ))}
        </View>
      </Section>
    </>
  );
}

/* ---------------------------- Cash ---------------------------- */
function CashForm(props: any) {
  const { colors } = props;
  return (
    <>
      <Section title="BASIC INFORMATION">
        <Row colors={colors} icon="person-outline" label="Account Name" required>
          <PlainInput
            colors={colors}
            testID="cash-name"
            value={props.cashName}
            onChangeText={props.setCashName}
            placeholder="Cash in Hand"
          />
        </Row>
        <Row colors={colors} icon="wallet-outline" label="Account Type">
          <Text style={{ color: colors.text, fontSize: 15 }}>Cash</Text>
        </Row>
        <Row colors={colors} icon="cash-outline" label="Currency">
          <Text style={{ color: colors.text, fontSize: 15 }}>{props.currency} - Indian Rupee</Text>
        </Row>
      </Section>

      <Section title="CASH DETAILS">
        <Row colors={colors} icon="cash-outline" label="Initial Cash Balance">
          <PlainInput
            colors={colors}
            testID="cash-initial-balance"
            value={props.initialCashBalance}
            onChangeText={props.setInitialCashBalance}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </Row>
        <Row colors={colors} icon="location-outline" label="Cash Location">
          <PlainInput
            colors={colors}
            testID="cash-location"
            value={props.cashLocation}
            onChangeText={props.setCashLocation}
            placeholder="Home, Wallet, Locker…"
          />
        </Row>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 14,
            marginBottom: 10,
            gap: 12,
          }}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' }}>
            Include in Reports & Net Worth
          </Text>
          <Switch
            testID="cash-include-nw"
            value={props.includeInNetWorth}
            onValueChange={props.setIncludeInNetWorth}
          />
        </View>
        <Row colors={colors} icon="document-text-outline" label="Notes (Optional)">
          <PlainInput
            colors={colors}
            testID="cash-notes"
            value={props.cashNotes}
            onChangeText={props.setCashNotes}
            placeholder="Emergency cash for daily needs"
            multiline
          />
        </Row>
      </Section>
    </>
  );
}

/* ---------------------------- UPI ---------------------------- */
function UpiForm(props: any) {
  const { colors, accent } = props;
  return (
    <>
      <Section title="BASIC INFORMATION">
        <Row colors={colors} icon="person-outline" label="Account Name" required>
          <PlainInput
            colors={colors}
            testID="upi-name"
            value={props.upiName}
            onChangeText={props.setUpiName}
            placeholder="My UPI Account"
          />
        </Row>
        <Row colors={colors} icon="wallet-outline" label="Account Type">
          <ChipPicker
            options={['Savings', 'Current']}
            value={props.upiSubType}
            onChange={props.setUpiSubType}
            accent={accent}
            colors={colors}
            testIdPrefix="upi-subtype"
          />
        </Row>
        <Row colors={colors} icon="business-outline" label="Bank Name" required>
          <PlainInput
            colors={colors}
            testID="upi-bank-name"
            value={props.upiBankName}
            onChangeText={props.setUpiBankName}
            placeholder="ICICI Bank"
          />
        </Row>
      </Section>

      <Section title="UPI DETAILS">
        <Row colors={colors} icon="at-outline" label="UPI ID" required>
          <PlainInput
            colors={colors}
            testID="upi-id"
            value={props.upiId}
            onChangeText={props.setUpiId}
            placeholder="myname@icici"
            autoCapitalize="none"
          />
        </Row>
        <Row colors={colors} icon="link-outline" label="Linked With">
          <ChipPicker
            options={UPI_LINKED_APPS}
            value={props.upiLinkedApp}
            onChange={props.setUpiLinkedApp}
            accent={accent}
            colors={colors}
            testIdPrefix="upi-linkedapp"
          />
        </Row>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 14,
            marginBottom: 10,
            gap: 12,
          }}
        >
          <Ionicons name="star-outline" size={20} color={colors.textSecondary} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' }}>
            Set as Primary UPI Account
          </Text>
          <Switch
            testID="upi-primary"
            value={props.isPrimaryUpi}
            onValueChange={props.setIsPrimaryUpi}
          />
        </View>
        <Row colors={colors} icon="document-text-outline" label="Virtual Payment Address (VPA) (Optional)">
          <PlainInput
            colors={colors}
            testID="upi-vpa"
            value={props.vpa}
            onChangeText={props.setVpa}
            placeholder="myname@okicici"
            autoCapitalize="none"
          />
        </Row>
      </Section>
    </>
  );
}

/* ---------------------------- Overdraft ---------------------------- */
function OverdraftForm(props: any) {
  const { colors, accent } = props;
  return (
    <>
      <Section title="BASIC INFORMATION">
        <Row colors={colors} icon="person-outline" label="Account Name" required>
          <PlainInput
            colors={colors}
            testID="od-name"
            value={props.odName}
            onChangeText={props.setOdName}
            placeholder="HDFC Overdraft Account"
          />
        </Row>
        <Row colors={colors} icon="wallet-outline" label="Account Type">
          <ChipPicker
            options={['Current', 'Savings']}
            value={props.odSubType}
            onChange={props.setOdSubType}
            accent={accent}
            colors={colors}
            testIdPrefix="od-subtype"
          />
        </Row>
        <Row colors={colors} icon="business-outline" label="Bank Name" required>
          <PlainInput
            colors={colors}
            testID="od-bank-name"
            value={props.odBankName}
            onChangeText={props.setOdBankName}
            placeholder="HDFC Bank"
          />
        </Row>
      </Section>

      <Section title="OVERDRAFT DETAILS">
        <Row colors={colors} icon="cash-outline" label="Overdraft Limit" required>
          <PlainInput
            colors={colors}
            testID="od-limit"
            value={props.odLimit}
            onChangeText={props.setOdLimit}
            placeholder="100000"
            keyboardType="decimal-pad"
          />
        </Row>
        <Row colors={colors} icon="trending-up-outline" label="Interest Rate (% p.a.)">
          <PlainInput
            colors={colors}
            testID="od-interest"
            value={props.odInterest}
            onChangeText={props.setOdInterest}
            placeholder="13.50"
            keyboardType="decimal-pad"
          />
        </Row>
        <Row colors={colors} icon="eye-outline" label="Currently Used">
          <PlainInput
            colors={colors}
            testID="od-used"
            value={props.odUsed}
            onChangeText={props.setOdUsed}
            placeholder="0"
            keyboardType="decimal-pad"
          />
        </Row>
        <Row colors={colors} icon="cloud-outline" label="Available Overdraft">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
            ₹ {props.odAvailable.toLocaleString('en-IN')}
          </Text>
        </Row>
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
            Overdraft Start Date
          </Text>
          <CrossPlatformPicker
            value={props.odStart}
            onChange={props.setOdStart}
            mode="date"
            label="Start Date"
            colors={colors}
          />
        </View>
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
            Overdraft End Date
          </Text>
          <CrossPlatformPicker
            value={props.odEnd}
            onChange={props.setOdEnd}
            mode="date"
            label="End Date"
            colors={colors}
          />
        </View>
        <Row colors={colors} icon="receipt-outline" label="Overdraft Charges (Optional)">
          <PlainInput
            colors={colors}
            testID="od-charges"
            value={props.odCharges}
            onChangeText={props.setOdCharges}
            placeholder="500"
            keyboardType="decimal-pad"
          />
        </Row>
      </Section>

      <View
        style={{
          backgroundColor: accent + '15',
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <Ionicons name="information-circle-outline" size={18} color={accent} />
        <Text style={{ color: accent, fontSize: 12, flex: 1, lineHeight: 18 }}>
          Overdraft amount will be considered as part of your liability in reports.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  typeRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

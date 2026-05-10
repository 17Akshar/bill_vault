// Reusable atomic components used by Transactions screens.
// Extracted from /app/frontend/app/(tabs)/transactions.tsx and
// /app/frontend/app/transactions/add.tsx to keep those files lean.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { formatINR, ACCOUNT_TYPE_META } from '../../utils/formatINR';

// =============================================================================
// CategoryGrid — wrap-grid of category chips with selection highlight.
// Used in Add Transaction screen for income / expense category selection.
// =============================================================================
interface CategoryGridProps {
  categories: { key: string; label: string; icon: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  accentColor: string; // green for income, red for expense
  colors: any; // ThemeContext colors
}

export const CategoryGrid = ({
  categories,
  selectedKey,
  onSelect,
  accentColor,
  colors,
}: CategoryGridProps) => (
  <View style={atomStyles.categoryGrid}>
    {categories.map((cat) => {
      const isActive = selectedKey === cat.key;
      return (
        <TouchableOpacity
          key={cat.key}
          testID={`category-chip-${cat.key}`}
          style={[
            atomStyles.categoryChip,
            { backgroundColor: colors.card, borderColor: colors.border },
            isActive && {
              borderColor: accentColor,
              borderWidth: 2,
              backgroundColor: accentColor + '1A',
            },
          ]}
          onPress={() => onSelect(cat.key)}
        >
          <Ionicons
            name={cat.icon as any}
            size={18}
            color={isActive ? accentColor : colors.textSecondary}
          />
          <Text
            style={[
              atomStyles.categoryLabel,
              { color: isActive ? colors.text : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// =============================================================================
// SubCategoryChips — horizontal scroll of sub-category pills.
// =============================================================================
interface SubCategoryChipsProps {
  options: string[];
  selected: string;
  onToggle: (sub: string) => void;
  accentColor: string;
  colors: any;
}

export const SubCategoryChips = ({
  options,
  selected,
  onToggle,
  accentColor,
  colors,
}: SubCategoryChipsProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
    {options.map((sub) => {
      const isActive = selected === sub;
      return (
        <TouchableOpacity
          key={sub}
          style={[
            atomStyles.subCatChip,
            { backgroundColor: colors.card, borderColor: colors.border },
            isActive && {
              borderColor: accentColor,
              borderWidth: 2,
              backgroundColor: accentColor + '18',
            },
          ]}
          onPress={() => onToggle(isActive ? '' : sub)}
        >
          <Text
            style={{
              color: isActive ? accentColor : colors.textSecondary,
              fontSize: 12,
              fontWeight: isActive ? '600' : '400',
            }}
          >
            {sub}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// =============================================================================
// AccountPickerButton — labelled picker that opens a modal.
// =============================================================================
interface AccountPickerButtonProps {
  account: any | null;
  onPress: () => void;
  placeholder: string;
  colors: any;
  testID?: string;
}

export const AccountPickerButton = ({
  account,
  onPress,
  placeholder,
  colors,
  testID,
}: AccountPickerButtonProps) => {
  const meta = account ? (ACCOUNT_TYPE_META[account.account_type] || ACCOUNT_TYPE_META.bank) : null;
  return (
    <TouchableOpacity
      testID={testID}
      style={[atomStyles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
    >
      {account ? (
        <View style={atomStyles.pickerContent}>
          <Ionicons name={(meta?.icon || 'business-outline') as any} size={20} color={meta?.color || colors.text} />
          <Text style={[atomStyles.pickerText, { color: colors.text }]}>{account.name}</Text>
          <Text style={[atomStyles.pickerBalance, { color: colors.textSecondary }]}>
            {formatINR(account.balance)}
          </Text>
        </View>
      ) : (
        <Text style={[atomStyles.pickerText, { color: colors.textSecondary }]}>{placeholder}</Text>
      )}
      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

// =============================================================================
// AccountPickerModal — bottom-sheet modal listing accounts.
// =============================================================================
interface AccountPickerModalProps {
  visible: boolean;
  title: string;
  accounts: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  emptyMessage?: string;
  emptyAction?: { label: string; onPress: () => void };
  itemTestIdPrefix?: string;
  colors: any;
}

export const AccountPickerModal = ({
  visible,
  title,
  accounts,
  selectedId,
  onSelect,
  onClose,
  emptyMessage = 'No accounts found.',
  emptyAction,
  itemTestIdPrefix,
  colors,
}: AccountPickerModalProps) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={atomStyles.modalOverlay}>
      <View style={[atomStyles.modalContent, { backgroundColor: colors.card }]}>
        <View style={atomStyles.modalHeader}>
          <Text style={[atomStyles.modalTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        {accounts.length === 0 ? (
          <View style={atomStyles.modalEmpty}>
            <Text style={[atomStyles.modalEmptyText, { color: colors.textSecondary }]}>{emptyMessage}</Text>
            {emptyAction && (
              <TouchableOpacity
                style={[atomStyles.modalCreateBtn, { backgroundColor: colors.primary }]}
                onPress={emptyAction.onPress}
              >
                <Text style={atomStyles.modalCreateBtnText}>{emptyAction.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.account_id}
            renderItem={({ item }) => {
              const meta = ACCOUNT_TYPE_META[item.account_type] || ACCOUNT_TYPE_META.bank;
              return (
                <TouchableOpacity
                  testID={itemTestIdPrefix ? `${itemTestIdPrefix}${item.account_id}` : undefined}
                  style={[
                    atomStyles.modalItem,
                    { borderBottomColor: colors.border },
                    selectedId === item.account_id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => onSelect(item.account_id)}
                >
                  <View style={[atomStyles.modalItemIcon, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={atomStyles.modalItemInfo}>
                    <Text style={[atomStyles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[atomStyles.modalItemType, { color: colors.textSecondary }]}>{meta.label}</Text>
                  </View>
                  <Text style={[atomStyles.modalItemBalance, { color: colors.text }]}>
                    {formatINR(item.balance)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  </Modal>
);

// =============================================================================
// PaymentTypeRow — row of payment type chips (cash / bank / credit card / UPI ...)
// =============================================================================
interface PaymentTypeRowProps {
  paymentTypes: { key: string; label: string; icon: string }[];
  selected: string;
  onSelect: (key: string) => void;
  colors: any;
}

export const PaymentTypeRow = ({
  paymentTypes,
  selected,
  onSelect,
  colors,
}: PaymentTypeRowProps) => (
  <View style={atomStyles.paymentTypeRow}>
    {paymentTypes.map((pt) => {
      const isActive = selected === pt.key;
      return (
        <TouchableOpacity
          key={pt.key}
          style={[
            atomStyles.paymentChip,
            { backgroundColor: colors.card, borderColor: colors.border },
            isActive && { borderColor: colors.primary, borderWidth: 2 },
          ]}
          onPress={() => onSelect(pt.key)}
        >
          <Ionicons
            name={pt.icon as any}
            size={16}
            color={isActive ? colors.primary : colors.textSecondary}
          />
          <Text style={[atomStyles.paymentLabel, { color: isActive ? colors.text : colors.textSecondary }]}>
            {pt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// =============================================================================
// TxRow — single row in a transaction list (used in /(tabs)/transactions.tsx).
// =============================================================================
interface TxRowProps {
  item: {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    sub_category?: string;
    description: string;
    date: string;
    account_id: string;
  };
  iconName: string;
  accountName: string;
  onPress: () => void;
  onLongPress?: () => void;
  colors: any;
}

export const TxRow = ({ item, iconName, accountName, onPress, onLongPress, colors }: TxRowProps) => {
  const isIncome = item.type === 'income';
  return (
    <TouchableOpacity
      style={[txStyles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
      testID={`tx-row-${item.id}`}
    >
      <View
        style={[
          txStyles.icon,
          { backgroundColor: isIncome ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)' },
        ]}
      >
        <Ionicons name={iconName as any} size={20} color={isIncome ? '#00E676' : '#FF5252'} />
      </View>
      <View style={txStyles.info}>
        <Text style={[txStyles.desc, { color: colors.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[txStyles.meta, { color: colors.textSecondary }]}>
          {item.category}
          {item.sub_category ? ` › ${item.sub_category}` : ''}
          {' · '}
          {item.date ? format(parseISO(item.date), 'dd MMM') : ''}
          {accountName ? ` · ${accountName}` : ''}
        </Text>
      </View>
      <View style={txStyles.right}>
        <Text style={[txStyles.amount, { color: isIncome ? '#00E676' : '#FF5252' }]}>
          {isIncome ? '+' : '-'}
          {formatINR(item.amount)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// FilterChip — pill for income / expense / all toggle (and similar)
// =============================================================================
interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor?: string;
  activeTextColor?: string;
  icon?: string;
  testID?: string;
  colors: any;
}

export const FilterChip = ({
  label,
  active,
  onPress,
  activeColor,
  activeTextColor = '#FFF',
  icon,
  testID,
  colors,
}: FilterChipProps) => {
  const bg = active ? activeColor || colors.primary : 'transparent';
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        txStyles.filterBtn,
        { borderColor: colors.border },
        active && { backgroundColor: bg, borderColor: bg },
      ]}
      onPress={onPress}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={14}
          color={active ? activeTextColor : colors.textSecondary}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[txStyles.filterText, { color: active ? activeTextColor : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// =============================================================================
// EmptyState — centered placeholder for empty lists.
// =============================================================================
interface EmptyStateProps {
  iconName: string;
  title: string;
  description?: string;
  colors: any;
}

export const EmptyState = ({ iconName, title, description, colors }: EmptyStateProps) => (
  <View style={txStyles.emptyContainer} testID="empty-state">
    <Ionicons name={iconName as any} size={64} color={colors.textSecondary} />
    <Text style={[txStyles.emptyTitle, { color: colors.textSecondary }]}>{title}</Text>
    {!!description && (
      <Text style={[txStyles.emptyDesc, { color: colors.textSecondary }]}>{description}</Text>
    )}
  </View>
);

// =============================================================================
// Stylesheets
// =============================================================================

const atomStyles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 13, fontWeight: '500' },

  subCatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  pickerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerText: { fontSize: 16 },
  pickerBalance: { fontSize: 13 },

  paymentTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentLabel: { fontSize: 13, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalEmpty: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  modalEmptyText: { fontSize: 14 },
  modalCreateBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  modalCreateBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalItemInfo: { flex: 1 },
  modalItemName: { fontSize: 15, fontWeight: '500' },
  modalItemType: { fontSize: 12 },
  modalItemBalance: { fontSize: 15, fontWeight: '600' },
});

const txStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 15, fontWeight: '700' },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: '600' },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});

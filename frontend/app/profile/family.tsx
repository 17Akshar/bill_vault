import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { FAMILY_ROLES } from '../../utils/formatINR';

interface FamilyMember {
  family_member_id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export default function FamilyMembersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('self');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await api.get('/family-members');
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to load family members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMembers();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter a name');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/family-members', {
        name: newName.trim(),
        role: newRole,
      });
      setMembers([...members, res.data]);
      setShowAddModal(false);
      setNewName('');
      setNewRole('self');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member: FamilyMember) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove "${member.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/family-members/${member.family_member_id}`);
              setMembers(members.filter(m => m.family_member_id !== member.family_member_id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      self: 'person',
      spouse: 'heart',
      child: 'happy',
      parent: 'people',
      sibling: 'people-circle',
      other: 'person-add',
    };
    return icons[role] || 'person';
  };

  const getRoleColor = (role: string) => {
    const colorsMap: Record<string, string> = {
      self: '#6C5CE7',
      spouse: '#FF6B81',
      child: '#00E676',
      parent: '#448AFF',
      sibling: '#FFB300',
      other: '#8E8EA0',
    };
    return colorsMap[role] || '#8E8EA0';
  };

  const renderItem = ({ item }: { item: FamilyMember }) => {
    const roleColor = getRoleColor(item.role);
    const roleLabel = FAMILY_ROLES.find(r => r.key === item.role)?.label || item.role;
    return (
      <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
        <View style={[styles.memberIcon, { backgroundColor: roleColor + '20' }]}>
          <Ionicons name={getRoleIcon(item.role) as any} size={24} color={roleColor} />
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.memberRole, { color: roleColor }]}>{roleLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Family Members</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderItem}
        keyExtractor={(item) => item.family_member_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No family members</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add family members to track their finances
            </Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Name</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Role</Text>
            <View style={styles.rolesGrid}>
              {FAMILY_ROLES.map((role) => (
                <TouchableOpacity
                  key={role.key}
                  style={[
                    styles.roleChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    newRole === role.key && {
                      borderColor: getRoleColor(role.key),
                      borderWidth: 2,
                      backgroundColor: getRoleColor(role.key) + '15',
                    },
                  ]}
                  onPress={() => setNewRole(role.key)}
                >
                  <Ionicons
                    name={getRoleIcon(role.key) as any}
                    size={18}
                    color={newRole === role.key ? getRoleColor(role.key) : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      { color: newRole === role.key ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Member</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  memberRole: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

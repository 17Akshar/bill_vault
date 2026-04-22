import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { format, parseISO } from 'date-fns';

const { width: SW } = Dimensions.get('window');

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  normal: '#5B2FBF',
  low: '#8E8EA0',
};

const NOTE_COLORS = ['#5B2FBF', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6', '#EF4444', '#8B5CF6'];

const TAG_OPTIONS = ['finance', 'investment', 'tax', 'insurance', 'planning', 'personal', 'work', 'idea'];

export default function NotesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editNote, setEditNote] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    content: '',
    sections: [] as { heading: string; content: string }[],
    tags: [] as string[],
    priority: 'normal',
    color: '#5B2FBF',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const resetForm = () => {
    setForm({ title: '', content: '', sections: [], tags: [], priority: 'normal', color: '#5B2FBF' });
    setEditNote(null);
  };

  const openEdit = (note: any) => {
    setForm({
      title: note.title || '',
      content: note.content || '',
      sections: note.sections || [],
      tags: note.tags || [],
      priority: note.priority || 'normal',
      color: note.color || '#5B2FBF',
    });
    setEditNote(note);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Enter a title'); return; }
    setSaving(true);
    try {
      if (editNote) {
        await api.put(`/notes/${editNote.note_id}`, form);
      } else {
        await api.post('/notes', form);
      }
      setShowAdd(false);
      resetForm();
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save note');
    } finally { setSaving(false); }
  };

  const deleteNote = (note: any) => {
    Alert.alert('Delete Note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/notes/${note.note_id}`); load(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const addSection = () => {
    setForm(prev => ({ ...prev, sections: [...prev.sections, { heading: '', content: '' }] }));
  };

  const updateSection = (idx: number, field: 'heading' | 'content', value: string) => {
    setForm(prev => {
      const sections = [...prev.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...prev, sections };
    });
  };

  const removeSection = (idx: number) => {
    setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const filteredNotes = searchQuery
    ? notes.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notes</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Notes Grid */}
      <FlatList
        data={filteredNotes}
        numColumns={2}
        keyExtractor={(item) => item.note_id}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const noteColor = item.color || '#5B2FBF';
          return (
            <TouchableOpacity
              style={[styles.noteCard, { backgroundColor: colors.card }]}
              onPress={() => openEdit(item)}
              onLongPress={() => deleteNote(item)}
              delayLongPress={500}
              activeOpacity={0.7}
            >
              <View style={[styles.noteColorBar, { backgroundColor: noteColor }]} />
              <View style={styles.noteContent}>
                <View style={styles.noteHeader}>
                  <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] || '#5B2FBF' }]} />
                </View>
                {item.content ? (
                  <Text style={[styles.noteBody, { color: colors.textSecondary }]} numberOfLines={3}>{item.content}</Text>
                ) : null}
                {item.sections?.length > 0 && (
                  <Text style={[styles.sectionCount, { color: noteColor }]}>{item.sections.length} section{item.sections.length > 1 ? 's' : ''}</Text>
                )}
                {item.tags?.length > 0 && (
                  <View style={styles.tagsRow}>
                    {item.tags.slice(0, 2).map((tag: string, i: number) => (
                      <View key={i} style={[styles.tagChip, { backgroundColor: noteColor + '15' }]}>
                        <Text style={[styles.tagText, { color: noteColor }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                  {item.updated_at ? format(parseISO(item.updated_at), 'dd MMM yyyy') : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to create your first note</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editNote ? 'Edit Note' : 'New Note'}</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <TextInput
                style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Note title"
                placeholderTextColor={colors.textSecondary}
                value={form.title}
                onChangeText={(v) => setForm(prev => ({ ...prev, title: v }))}
              />

              {/* Content */}
              <TextInput
                style={[styles.contentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Write your note..."
                placeholderTextColor={colors.textSecondary}
                value={form.content}
                onChangeText={(v) => setForm(prev => ({ ...prev, content: v }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Sections */}
              <View style={styles.sectionRow}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Sections</Text>
                <TouchableOpacity onPress={addSection}>
                  <Text style={[styles.addSectionBtn, { color: colors.primary }]}>+ Add Section</Text>
                </TouchableOpacity>
              </View>
              {form.sections.map((sec, idx) => (
                <View key={idx} style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <TextInput
                      style={[styles.sectionHeading, { color: colors.text }]}
                      placeholder="Section heading"
                      placeholderTextColor={colors.textSecondary}
                      value={sec.heading}
                      onChangeText={(v) => updateSection(idx, 'heading', v)}
                    />
                    <TouchableOpacity onPress={() => removeSection(idx)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.sectionContent, { color: colors.text }]}
                    placeholder="Section content..."
                    placeholderTextColor={colors.textSecondary}
                    value={sec.content}
                    onChangeText={(v) => updateSection(idx, 'content', v)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              ))}

              {/* Priority */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityChip, { borderColor: PRIORITY_COLORS[p] }, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '20' }]}
                    onPress={() => setForm(prev => ({ ...prev, priority: p }))}
                  >
                    <View style={[styles.priDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                    <Text style={[styles.priorityLabel, { color: form.priority === p ? PRIORITY_COLORS[p] : colors.text }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Tags</Text>
              <View style={styles.tagsGrid}>
                {TAG_OPTIONS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagOption, { borderColor: colors.border }, form.tags.includes(tag) && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagOptionText, { color: form.tags.includes(tag) ? colors.primary : colors.textSecondary }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Color</Text>
              <View style={styles.colorRow}>
                {NOTE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorCircle, { backgroundColor: c }, form.color === c && { borderWidth: 3, borderColor: '#FFF' }]}
                    onPress={() => setForm(prev => ({ ...prev, color: c }))}
                  />
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editNote ? 'Update Note' : 'Create Note'}</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  noteCard: { width: (SW - 42) / 2, borderRadius: 14, overflow: 'hidden' },
  noteColorBar: { height: 4 },
  noteContent: { padding: 14 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  noteTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  noteBody: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  sectionCount: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  tagsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '600' },
  noteDate: { fontSize: 10 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  titleInput: { fontSize: 18, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 10, marginBottom: 12 },
  contentInput: { fontSize: 15, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 100, marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  addSectionBtn: { fontSize: 13, fontWeight: '600' },
  sectionCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionHeading: { fontSize: 15, fontWeight: '600', flex: 1 },
  sectionContent: { fontSize: 14, minHeight: 50 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  priDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 13, fontWeight: '600' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagOptionText: { fontSize: 12, fontWeight: '500' },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  colorCircle: { width: 30, height: 30, borderRadius: 15 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

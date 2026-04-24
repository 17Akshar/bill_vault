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

const PRIORITY_COLORS: Record<string, string> = { high: '#EF4444', normal: '#5B2FBF', low: '#8E8EA0' };
const NOTE_COLORS = ['#5B2FBF', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6', '#EF4444', '#8B5CF6'];
const HEADING_COLORS = ['#5B2FBF', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6', '#EF4444', '#8B5CF6', '#0EA5E9', '#6366F1'];
const HEADING_ICONS = ['folder-outline', 'briefcase-outline', 'bulb-outline', 'flag-outline', 'bookmark-outline', 'star-outline', 'heart-outline', 'rocket-outline', 'school-outline', 'cash-outline'];
const TAG_OPTIONS = ['finance', 'investment', 'tax', 'insurance', 'planning', 'personal', 'work', 'idea'];

interface NoteHeading { heading_id: string; name: string; icon: string; color: string; }

export default function NotesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [headings, setHeadings] = useState<NoteHeading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showHeadingModal, setShowHeadingModal] = useState(false);
  const [editNote, setEditNote] = useState<any>(null);
  const [editHeading, setEditHeading] = useState<NoteHeading | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(new Set(['ungrouped']));

  const [form, setForm] = useState({
    title: '', content: '', heading_id: null as string | null,
    sections: [] as { heading: string; content: string }[],
    tags: [] as string[], priority: 'normal', color: '#5B2FBF',
  });
  const [headingForm, setHeadingForm] = useState({ name: '', icon: 'folder-outline', color: '#5B2FBF' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [nRes, hRes] = await Promise.all([api.get('/notes'), api.get('/note-headings')]);
      setNotes(nRes.data);
      setHeadings(hRes.data);
      // Auto-expand all headings that have notes
      const used = new Set(nRes.data.filter((n: any) => n.heading_id).map((n: any) => n.heading_id));
      used.add('ungrouped');
      setExpandedHeadings(used);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const resetForm = () => {
    setForm({ title: '', content: '', heading_id: null, sections: [], tags: [], priority: 'normal', color: '#5B2FBF' });
    setEditNote(null);
  };

  const openEdit = (note: any) => {
    setForm({
      title: note.title || '', content: note.content || '',
      heading_id: note.heading_id || null,
      sections: note.sections || [], tags: note.tags || [],
      priority: note.priority || 'normal', color: note.color || '#5B2FBF',
    });
    setEditNote(note);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Enter a title'); return; }
    setSaving(true);
    try {
      if (editNote) { await api.put(`/notes/${editNote.note_id}`, form); }
      else { await api.post('/notes', form); }
      setShowAdd(false); resetForm(); load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
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

  // Heading CRUD
  const saveHeading = async () => {
    if (!headingForm.name.trim()) { Alert.alert('Required', 'Enter a heading name'); return; }
    setSaving(true);
    try {
      if (editHeading) { await api.put(`/note-headings/${editHeading.heading_id}`, headingForm); }
      else { await api.post('/note-headings', headingForm); }
      setShowHeadingModal(false); setEditHeading(null);
      setHeadingForm({ name: '', icon: 'folder-outline', color: '#5B2FBF' });
      load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to save heading'); }
    finally { setSaving(false); }
  };

  const deleteHeading = (h: NoteHeading) => {
    Alert.alert('Delete Heading', `Delete "${h.name}"? Notes will be ungrouped.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/note-headings/${h.heading_id}`); load(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const openEditHeading = (h: NoteHeading) => {
    setHeadingForm({ name: h.name, icon: h.icon, color: h.color });
    setEditHeading(h);
    setShowHeadingModal(true);
  };

  const addSection = () => setForm(prev => ({ ...prev, sections: [...prev.sections, { heading: '', content: '' }] }));
  const updateSection = (idx: number, field: 'heading' | 'content', value: string) => {
    setForm(prev => { const s = [...prev.sections]; s[idx] = { ...s[idx], [field]: value }; return { ...prev, sections: s }; });
  };
  const removeSection = (idx: number) => setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
  const toggleTag = (tag: string) => setForm(prev => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag] }));

  const toggleExpand = (id: string) => {
    setExpandedHeadings(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Filter + group notes
  const filteredNotes = searchQuery
    ? notes.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  const notesByHeading: Record<string, any[]> = {};
  filteredNotes.forEach(n => {
    const key = n.heading_id || 'ungrouped';
    if (!notesByHeading[key]) notesByHeading[key] = [];
    notesByHeading[key].push(n);
  });

  const headingMap = new Map(headings.map(h => [h.heading_id, h]));

  if (loading) {
    return <View style={[st.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  // Build section data: headings with notes first, then ungrouped
  const sections: { heading: NoteHeading | null; notes: any[] }[] = [];
  headings.forEach(h => {
    const hnotes = notesByHeading[h.heading_id] || [];
    sections.push({ heading: h, notes: hnotes });
  });
  const ungrouped = notesByHeading['ungrouped'] || [];
  if (ungrouped.length > 0 || headings.length === 0) {
    sections.push({ heading: null, notes: ungrouped });
  }

  const renderNote = (item: any) => {
    const noteColor = item.color || '#5B2FBF';
    return (
      <TouchableOpacity
        style={[st.noteCard, { backgroundColor: colors.card }]}
        onPress={() => openEdit(item)} onLongPress={() => deleteNote(item)} delayLongPress={500} activeOpacity={0.7}
      >
        <View style={[st.noteColorBar, { backgroundColor: noteColor }]} />
        <View style={st.noteContent}>
          <View style={st.noteHeader}>
            <Text style={[st.noteTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
            <View style={[st.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] || '#5B2FBF' }]} />
          </View>
          {item.content ? <Text style={[st.noteBody, { color: colors.textSecondary }]} numberOfLines={3}>{item.content}</Text> : null}
          {item.sections?.length > 0 && <Text style={[st.sectionCount, { color: noteColor }]}>{item.sections.length} section{item.sections.length > 1 ? 's' : ''}</Text>}
          {item.tags?.length > 0 && (
            <View style={st.tagsRow}>
              {item.tags.slice(0, 2).map((tag: string, i: number) => (
                <View key={i} style={[st.tagChip, { backgroundColor: noteColor + '15' }]}><Text style={[st.tagText, { color: noteColor }]}>{tag}</Text></View>
              ))}
            </View>
          )}
          <Text style={[st.noteDate, { color: colors.textSecondary }]}>{item.updated_at ? format(parseISO(item.updated_at), 'dd MMM yyyy') : ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>Notes</Text>
        <View style={st.headerActions}>
          <TouchableOpacity onPress={() => { setEditHeading(null); setHeadingForm({ name: '', icon: 'folder-outline', color: '#5B2FBF' }); setShowHeadingModal(true); }} style={st.headerBtn}>
            <Ionicons name="folder-open-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput style={[st.searchInput, { color: colors.text }]} placeholder="Search notes..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
      </View>

      {/* Notes grouped by headings */}
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} contentContainerStyle={{ paddingBottom: 80 }}>
        {sections.map((section, si) => {
          const h = section.heading;
          const sectionId = h ? h.heading_id : 'ungrouped';
          const isExpanded = expandedHeadings.has(sectionId);
          const hColor = h?.color || colors.primary;

          return (
            <View key={sectionId} style={st.sectionContainer}>
              {/* Section Header */}
              <TouchableOpacity style={st.sectionHeader} onPress={() => toggleExpand(sectionId)} activeOpacity={0.7}>
                <View style={st.sectionLeft}>
                  <View style={[st.sectionIcon, { backgroundColor: hColor + '15' }]}>
                    <Ionicons name={(h?.icon || 'documents-outline') as any} size={18} color={hColor} />
                  </View>
                  <Text style={[st.sectionName, { color: colors.text }]}>{h?.name || 'Ungrouped'}</Text>
                  <View style={[st.countBadge, { backgroundColor: hColor + '20' }]}>
                    <Text style={[st.countText, { color: hColor }]}>{section.notes.length}</Text>
                  </View>
                </View>
                <View style={st.sectionRight}>
                  {h && (
                    <TouchableOpacity onPress={() => openEditHeading(h)} style={st.editBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Notes Grid */}
              {isExpanded && (
                <View style={st.notesGrid}>
                  {section.notes.length === 0 ? (
                    <View style={[st.emptySection, { backgroundColor: colors.card }]}>
                      <Text style={[st.emptySectionText, { color: colors.textSecondary }]}>No notes in this category</Text>
                    </View>
                  ) : (
                    <View style={st.gridRow}>
                      {section.notes.map((note) => (
                        <View key={note.note_id} style={st.gridItem}>{renderNote(note)}</View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {notes.length === 0 && headings.length === 0 && (
          <View style={st.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={colors.textSecondary} />
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>No notes yet</Text>
            <Text style={[st.emptySubtext, { color: colors.textSecondary }]}>Tap + to create your first note</Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Note Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{editNote ? 'Edit Note' : 'New Note'}</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Heading Selection */}
              <Text style={[st.formLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.headingScroll}>
                <TouchableOpacity
                  style={[st.headingChip, { borderColor: colors.border }, !form.heading_id && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                  onPress={() => setForm(prev => ({ ...prev, heading_id: null }))}
                >
                  <Ionicons name="documents-outline" size={16} color={!form.heading_id ? colors.primary : colors.textSecondary} />
                  <Text style={[st.headingChipText, { color: !form.heading_id ? colors.primary : colors.textSecondary }]}>None</Text>
                </TouchableOpacity>
                {headings.map(h => (
                  <TouchableOpacity
                    key={h.heading_id}
                    style={[st.headingChip, { borderColor: colors.border }, form.heading_id === h.heading_id && { borderColor: h.color, backgroundColor: h.color + '15' }]}
                    onPress={() => setForm(prev => ({ ...prev, heading_id: h.heading_id }))}
                  >
                    <Ionicons name={h.icon as any} size={16} color={form.heading_id === h.heading_id ? h.color : colors.textSecondary} />
                    <Text style={[st.headingChipText, { color: form.heading_id === h.heading_id ? h.color : colors.textSecondary }]}>{h.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <TextInput style={[st.titleInput, { color: colors.text, borderColor: colors.border }]} placeholder="Note title" placeholderTextColor={colors.textSecondary} value={form.title} onChangeText={v => setForm(prev => ({ ...prev, title: v }))} />

              {/* Content */}
              <TextInput style={[st.contentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Write your note..." placeholderTextColor={colors.textSecondary} value={form.content} onChangeText={v => setForm(prev => ({ ...prev, content: v }))} multiline numberOfLines={4} textAlignVertical="top" />

              {/* Sections */}
              <View style={st.sectionRow}>
                <Text style={[st.formLabel, { color: colors.text }]}>Sections</Text>
                <TouchableOpacity onPress={addSection}><Text style={[st.addSectionBtn, { color: colors.primary }]}>+ Add Section</Text></TouchableOpacity>
              </View>
              {form.sections.map((sec, idx) => (
                <View key={idx} style={[st.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={st.secHeader}>
                    <TextInput style={[st.secHeading, { color: colors.text }]} placeholder="Section heading" placeholderTextColor={colors.textSecondary} value={sec.heading} onChangeText={v => updateSection(idx, 'heading', v)} />
                    <TouchableOpacity onPress={() => removeSection(idx)}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
                  </View>
                  <TextInput style={[st.secContent, { color: colors.text }]} placeholder="Section content..." placeholderTextColor={colors.textSecondary} value={sec.content} onChangeText={v => updateSection(idx, 'content', v)} multiline numberOfLines={3} textAlignVertical="top" />
                </View>
              ))}

              {/* Priority */}
              <Text style={[st.formLabel, { color: colors.text }]}>Priority</Text>
              <View style={st.priorityRow}>
                {(['low', 'normal', 'high'] as const).map(p => (
                  <TouchableOpacity key={p} style={[st.priorityChip, { borderColor: PRIORITY_COLORS[p] }, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '20' }]} onPress={() => setForm(prev => ({ ...prev, priority: p }))}>
                    <View style={[st.priDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                    <Text style={[st.priorityLabel, { color: form.priority === p ? PRIORITY_COLORS[p] : colors.text }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags */}
              <Text style={[st.formLabel, { color: colors.text }]}>Tags</Text>
              <View style={st.tagsGrid}>
                {TAG_OPTIONS.map(tag => (
                  <TouchableOpacity key={tag} style={[st.tagOption, { borderColor: colors.border }, form.tags.includes(tag) && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]} onPress={() => toggleTag(tag)}>
                    <Text style={[st.tagOptionText, { color: form.tags.includes(tag) ? colors.primary : colors.textSecondary }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color */}
              <Text style={[st.formLabel, { color: colors.text }]}>Color</Text>
              <View style={st.colorRow}>
                {NOTE_COLORS.map(c => (
                  <TouchableOpacity key={c} style={[st.colorCircle, { backgroundColor: c }, form.color === c && { borderWidth: 3, borderColor: '#FFF' }]} onPress={() => setForm(prev => ({ ...prev, color: c }))} />
                ))}
              </View>

              <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{editNote ? 'Update Note' : 'Create Note'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Heading Modal */}
      <Modal visible={showHeadingModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={[st.headingModalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{editHeading ? 'Edit Category' : 'New Category'}</Text>
              <TouchableOpacity onPress={() => { setShowHeadingModal(false); setEditHeading(null); }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>

            <TextInput style={[st.titleInput, { color: colors.text, borderColor: colors.border }]} placeholder="Category name" placeholderTextColor={colors.textSecondary} value={headingForm.name} onChangeText={v => setHeadingForm(prev => ({ ...prev, name: v }))} />

            <Text style={[st.formLabel, { color: colors.text }]}>Icon</Text>
            <View style={st.iconGrid}>
              {HEADING_ICONS.map(ic => (
                <TouchableOpacity key={ic} style={[st.iconOption, { backgroundColor: colors.background }, headingForm.icon === ic && { borderColor: headingForm.color, borderWidth: 2 }]} onPress={() => setHeadingForm(prev => ({ ...prev, icon: ic }))}>
                  <Ionicons name={ic as any} size={22} color={headingForm.icon === ic ? headingForm.color : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[st.formLabel, { color: colors.text }]}>Color</Text>
            <View style={st.colorRow}>
              {HEADING_COLORS.map(c => (
                <TouchableOpacity key={c} style={[st.colorCircle, { backgroundColor: c }, headingForm.color === c && { borderWidth: 3, borderColor: '#FFF' }]} onPress={() => setHeadingForm(prev => ({ ...prev, color: c }))} />
              ))}
            </View>

            <View style={st.headingModalActions}>
              <TouchableOpacity style={[st.saveBtn, { backgroundColor: headingForm.color || colors.primary, flex: 1 }]} onPress={saveHeading} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{editHeading ? 'Update' : 'Create Category'}</Text>}
              </TouchableOpacity>
              {editHeading && (
                <TouchableOpacity style={[st.deleteHeadingBtn, { borderColor: '#EF4444' }]} onPress={() => { setShowHeadingModal(false); deleteHeading(editHeading); }}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  // Section
  sectionContainer: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionName: { fontSize: 15, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700' },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: { padding: 4 },
  notesGrid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: (SW - 42) / 2 },
  emptySection: { borderRadius: 12, padding: 20, alignItems: 'center', marginHorizontal: 4 },
  emptySectionText: { fontSize: 13 },
  // Note Card
  noteCard: { borderRadius: 14, overflow: 'hidden' },
  noteColorBar: { height: 4 },
  noteContent: { padding: 12 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  noteTitle: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  noteBody: { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  sectionCount: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  tagsRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  tagChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tagText: { fontSize: 9, fontWeight: '600' },
  noteDate: { fontSize: 9 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  headingModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  headingScroll: { marginBottom: 12 },
  headingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  headingChipText: { fontSize: 13, fontWeight: '600' },
  titleInput: { fontSize: 18, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 10, marginBottom: 12 },
  contentInput: { fontSize: 15, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 6 },
  addSectionBtn: { fontSize: 13, fontWeight: '600' },
  sectionCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  secHeading: { fontSize: 14, fontWeight: '600', flex: 1 },
  secContent: { fontSize: 13, minHeight: 40 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  priDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 13, fontWeight: '600' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagOptionText: { fontSize: 12, fontWeight: '500' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headingModalActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  deleteHeadingBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
});

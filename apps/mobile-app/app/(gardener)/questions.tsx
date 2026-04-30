import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    createGardenerQuestion,
    deleteGardenerQuestion,
    getGardenerJobs,
    getGardenerJobTasks,
    getGardenerQuestions,
    uploadMedia,
    type JobDto,
    type QuestionType,
    type TaskDto,
    type TaskQuestionDto,
} from '@/services/api';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  onDelete,
}: {
  question: TaskQuestionDto;
  onDelete: (id: string) => void;
}) {
  const answered = question.status === 'Answered';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, answered ? styles.badgeAnswered : styles.badgePending]}>
          <Text style={styles.statusBadgeText}>{answered ? 'Answered' : 'Pending'}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {question.taskName ? `Task: ${question.taskName}  ·  ` : ''}
          {new Date(question.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.questionText}>{question.text}</Text>

      {question.type === 'MultipleChoice' && question.options && question.options.length > 0 && (
        <View style={styles.optionsContainer}>
          {question.options.map((opt) => (
            <View key={opt.optionId} style={styles.optionChip}>
              <Text style={styles.optionChipText}>{opt.text}</Text>
            </View>
          ))}
        </View>
      )}

      {question.mediaUrls && question.mediaUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {question.mediaUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.mediaThumbnail} />
          ))}
        </ScrollView>
      )}

      {answered && question.answer && (
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>
            Client's answer{question.answer.answeredByName ? ` (${question.answer.answeredByName})` : ''}:
          </Text>
          <Text style={styles.answerText}>{question.answer.text}</Text>
          {question.answer.mediaUrls && question.answer.mediaUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {question.answer.mediaUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.mediaThumbnail} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {!answered && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Delete question?', 'This will remove the question permanently.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(question.questionId) },
            ])
          }
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GardenerQuestions() {
  const { token } = useAuth();
  const { taskId: paramTaskId } = useLocalSearchParams<{ taskId?: string }>();

  const [questions, setQuestions] = useState<TaskQuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task / job selectors
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState(paramTaskId ?? '');
  const [selectedJobId, setSelectedJobId] = useState('');

  // Create question modal
  const [showCreate, setShowCreate] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('FreeText');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [mediaUris, setMediaUris] = useState<{ uri: string; mimeType: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getGardenerQuestions(token, selectedTaskId || undefined, 1, 100);
      setQuestions(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    }
  }, [token, selectedTaskId]);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    try {
      const jobRes = await getGardenerJobs(token, 1, 50);
      const active = jobRes.items.filter((j) => !j.isClosed);
      setJobs(active);
      if (!selectedJobId && active.length > 0) {
        setSelectedJobId(active[0].jobId);
      }
    } catch {
      // non-critical
    }
  }, [token, selectedJobId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!selectedJobId || !token) return;
    void getGardenerJobTasks(token, selectedJobId, 1, 100).then((r) => setTasks(r.items));
  }, [selectedJobId, token]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleDelete(questionId: string) {
    if (!token) return;
    try {
      await deleteGardenerQuestion(token, questionId);
      setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete question');
    }
  }

  async function pickMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow media library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled) {
      const newMedia = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        filename: a.fileName ?? a.uri.split('/').pop() ?? 'media',
      }));
      setMediaUris((prev) => [...prev, ...newMedia]);
    }
  }

  async function handleCreate() {
    if (!token) return;
    const taskId = selectedTaskId;
    if (!taskId) {
      Alert.alert('Select a task', 'Please select a task to link this question to.');
      return;
    }
    if (!questionText.trim()) {
      Alert.alert('Missing question', 'Please enter the question text.');
      return;
    }
    if (questionType === 'MultipleChoice') {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        Alert.alert('Add options', 'Please add at least 2 answer options.');
        return;
      }
    }
    setCreating(true);
    try {
      // Upload media first
      let uploadedUrls: string[] = [];
      if (mediaUris.length > 0) {
        setUploading(true);
        uploadedUrls = await Promise.all(
          mediaUris.map((m) => uploadMedia(token, m.uri, m.mimeType, m.filename)),
        );
        setUploading(false);
      }

      const created = await createGardenerQuestion(token, {
        taskId,
        text: questionText.trim(),
        type: questionType,
        options: questionType === 'MultipleChoice' ? options.filter((o) => o.trim()) : undefined,
        mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });

      setQuestions((prev) => [created, ...prev]);
      setShowCreate(false);
      resetCreateForm();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setCreating(false);
      setUploading(false);
    }
  }

  function resetCreateForm() {
    setQuestionText('');
    setQuestionType('FreeText');
    setOptions(['', '']);
    setMediaUris([]);
  }

  function openCreate() {
    resetCreateForm();
    if (paramTaskId) setSelectedTaskId(paramTaskId);
    setShowCreate(true);
  }

  const filtered = selectedTaskId
    ? questions.filter((q) => q.taskId === selectedTaskId)
    : questions;

  const pending = filtered.filter((q) => q.status === 'Pending');
  const answered = filtered.filter((q) => q.status === 'Answered');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Questions</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={openCreate}>
          <Text style={styles.headerBtnText}>+ Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Task filter row */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedTaskId && styles.filterChipActive]}
            onPress={() => setSelectedTaskId('')}
          >
            <Text style={[styles.filterChipText, !selectedTaskId && styles.filterChipTextActive]}>
              All tasks
            </Text>
          </TouchableOpacity>
          {tasks.map((t) => (
            <TouchableOpacity
              key={t.taskId}
              style={[styles.filterChip, selectedTaskId === t.taskId && styles.filterChipActive]}
              onPress={() => setSelectedTaskId(t.taskId)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTaskId === t.taskId && styles.filterChipTextActive,
                ]}
              >
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Job selector for filter */}
      {jobs.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobRow}>
          {jobs.map((j) => (
            <TouchableOpacity
              key={j.jobId}
              style={[styles.jobChip, selectedJobId === j.jobId && styles.jobChipActive]}
              onPress={() => {
                setSelectedJobId(j.jobId);
                setSelectedTaskId('');
              }}
            >
              <Text style={[styles.jobChipText, selectedJobId === j.jobId && styles.jobChipTextActive]}>
                {j.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={GardenColors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={[...pending, ...answered]}
          keyExtractor={(q) => q.questionId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GardenColors.accent} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No questions yet.</Text>
              <Text style={styles.emptyHint}>Tap "+ Ask" to ask a question linked to a task.</Text>
            </View>
          }
          ListHeaderComponent={
            pending.length > 0 && answered.length > 0 ? (
              <Text style={styles.sectionLabel}>Awaiting answer ({pending.length})</Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <>
              {index === pending.length && answered.length > 0 && (
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Answered ({answered.length})
                </Text>
              )}
              <QuestionCard question={item} onDelete={handleDelete} />
            </>
          )}
        />
      )}

      {/* Create Question Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ask a Question</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Task selector in modal */}
              <Text style={styles.fieldLabel}>Task *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {tasks.map((t) => (
                  <TouchableOpacity
                    key={t.taskId}
                    style={[
                      styles.filterChip,
                      selectedTaskId === t.taskId && styles.filterChipActive,
                      { marginRight: 8 },
                    ]}
                    onPress={() => setSelectedTaskId(t.taskId)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedTaskId === t.taskId && styles.filterChipTextActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!selectedTaskId && (
                <Text style={styles.validationHint}>Please select a task above.</Text>
              )}

              {/* Question type */}
              <Text style={styles.fieldLabel}>Answer type *</Text>
              <View style={styles.typeRow}>
                {(['FreeText', 'MultipleChoice'] as QuestionType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, questionType === t && styles.typeBtnActive]}
                    onPress={() => setQuestionType(t)}
                  >
                    <Text style={[styles.typeBtnText, questionType === t && styles.typeBtnTextActive]}>
                      {t === 'FreeText' ? 'Free text' : 'Multiple choice'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Question text */}
              <Text style={styles.fieldLabel}>Question *</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Type your question..."
                placeholderTextColor={GardenColors.textMuted}
                value={questionText}
                onChangeText={setQuestionText}
                multiline
                numberOfLines={3}
              />

              {/* Options for multiple choice */}
              {questionType === 'MultipleChoice' && (
                <>
                  <Text style={styles.fieldLabel}>Answer options *</Text>
                  {options.map((opt, i) => (
                    <View key={i} style={styles.optionRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`Option ${i + 1}`}
                        placeholderTextColor={GardenColors.textMuted}
                        value={opt}
                        onChangeText={(v) => setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)))}
                      />
                      {options.length > 2 && (
                        <TouchableOpacity
                          style={styles.removeOptionBtn}
                          onPress={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Text style={styles.removeOptionBtnText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addOptionBtn}
                    onPress={() => setOptions((prev) => [...prev, ''])}
                  >
                    <Text style={styles.addOptionBtnText}>+ Add option</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Media */}
              <Text style={styles.fieldLabel}>Attach media (optional)</Text>
              <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickMedia}>
                <Text style={styles.mediaPickerBtnText}>📎 Add photo / video</Text>
              </TouchableOpacity>

              {mediaUris.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                  {mediaUris.map((m, i) => (
                    <View key={i} style={{ position: 'relative', marginRight: 8 }}>
                      <Image source={{ uri: m.uri }} style={styles.mediaThumbnail} />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => setMediaUris((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={styles.removeMediaBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreate(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (creating || uploading) && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={creating || uploading}
              >
                {creating || uploading ? (
                  <ActivityIndicator color={GardenColors.bgRoot} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Question</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  headerBtn: {
    backgroundColor: GardenColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerBtnText: { color: GardenColors.bgRoot, fontWeight: '700', fontSize: 14 },

  filterRow: { paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: GardenColors.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: GardenColors.bgSurface,
  },
  filterChipActive: { backgroundColor: GardenColors.accentSoft, borderColor: GardenColors.accent },
  filterChipText: { color: GardenColors.textMuted, fontSize: 13 },
  filterChipTextActive: { color: GardenColors.accent, fontWeight: '600' },

  jobRow: { paddingHorizontal: 16, marginBottom: 4 },
  jobChip: {
    borderWidth: 1,
    borderColor: GardenColors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    backgroundColor: GardenColors.bgSurface,
  },
  jobChipActive: { backgroundColor: GardenColors.bgSurfaceSoft, borderColor: GardenColors.textMuted },
  jobChipText: { color: GardenColors.textMuted, fontSize: 12 },
  jobChipTextActive: { color: GardenColors.textPrimary, fontWeight: '600' },

  sectionLabel: { color: GardenColors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },

  card: {
    backgroundColor: GardenColors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.18)' },
  badgeAnswered: { backgroundColor: 'rgba(74,222,128,0.18)' },
  statusBadgeText: { color: GardenColors.textPrimary, fontSize: 11, fontWeight: '700' },
  cardMeta: { color: GardenColors.textMuted, fontSize: 12 },
  questionText: { color: GardenColors.textPrimary, fontSize: 16, lineHeight: 22, marginBottom: 10 },

  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  optionChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GardenColors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: GardenColors.bgSurfaceSoft,
  },
  optionChipText: { color: GardenColors.textMuted, fontSize: 13 },

  mediaRow: { marginBottom: 10 },
  mediaThumbnail: { width: 72, height: 72, borderRadius: 10, marginRight: 8, backgroundColor: GardenColors.bgSurface },

  answerBox: {
    marginTop: 4,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: GardenColors.success,
  },
  answerLabel: { color: GardenColors.success, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  answerText: { color: GardenColors.textPrimary, fontSize: 15, lineHeight: 21 },

  deleteBtn: { alignSelf: 'flex-end', marginTop: 8 },
  deleteBtnText: { color: GardenColors.error, fontSize: 13 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: GardenColors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: GardenColors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  errorText: { color: GardenColors.error, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: GardenColors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: GardenColors.borderSubtle,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { color: GardenColors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16 },

  fieldLabel: { color: GardenColors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  validationHint: { color: GardenColors.warning, fontSize: 12, marginBottom: 4 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: GardenColors.bgSurfaceSoft,
    borderWidth: 1, borderColor: GardenColors.borderSubtle,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: GardenColors.accentSoft, borderColor: GardenColors.accent },
  typeBtnText: { color: GardenColors.textMuted, fontWeight: '600', fontSize: 13 },
  typeBtnTextActive: { color: GardenColors.accent },

  input: {
    backgroundColor: GardenColors.bgSurfaceSoft,
    borderWidth: 1, borderColor: GardenColors.borderSubtle,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: GardenColors.textPrimary, fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeOptionBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  removeOptionBtnText: { color: GardenColors.error, fontSize: 14, fontWeight: '700' },

  addOptionBtn: { paddingVertical: 8, alignSelf: 'flex-start' },
  addOptionBtnText: { color: GardenColors.accent, fontSize: 14, fontWeight: '600' },

  mediaPickerBtn: {
    borderWidth: 1, borderColor: GardenColors.borderSubtle, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: GardenColors.bgSurfaceSoft,
    alignItems: 'center',
  },
  mediaPickerBtnText: { color: GardenColors.textMuted, fontSize: 14 },

  removeMediaBtn: {
    position: 'absolute', top: 2, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  removeMediaBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: GardenColors.bgSurfaceSoft,
    alignItems: 'center',
  },
  cancelBtnText: { color: GardenColors.textMuted, fontWeight: '600', fontSize: 15 },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: GardenColors.accent,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: GardenColors.bgRoot, fontWeight: '700', fontSize: 15 },
});

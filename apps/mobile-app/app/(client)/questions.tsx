import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    answerQuestion,
    getClientJobs,
    getClientJobTasks,
    getClientQuestions,
    uploadMedia,
    type JobDto,
    type QuestionOptionDto,
    type TaskDto,
    type TaskQuestionDto
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

// ─── Answer Modal ─────────────────────────────────────────────────────────────

function AnswerModal({
  question,
  visible,
  onClose,
  onAnswered,
}: {
  question: TaskQuestionDto | null;
  visible: boolean;
  onClose: () => void;
  onAnswered: (updated: TaskQuestionDto) => void;
}) {
  const { token } = useAuth();
  const [answerText, setAnswerText] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [mediaUris, setMediaUris] = useState<{ uri: string; mimeType: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnswerText('');
      setSelectedOptionId(null);
      setMediaUris([]);
    }
  }, [visible]);

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

  async function handleSubmit() {
    if (!token || !question) return;

    const isMultipleChoice = question.type === 'MultipleChoice';
    const finalText = isMultipleChoice
      ? (question.options?.find((o) => o.optionId === selectedOptionId)?.text ?? answerText.trim())
      : answerText.trim();

    if (!finalText && !selectedOptionId) {
      Alert.alert('Answer required', isMultipleChoice ? 'Please select an option.' : 'Please enter your answer.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (mediaUris.length > 0) {
        setUploading(true);
        uploadedUrls = await Promise.all(
          mediaUris.map((m) => uploadMedia(token, m.uri, m.mimeType, m.filename)),
        );
        setUploading(false);
      }

      const updated = await answerQuestion(token, question.questionId, {
        text: finalText,
        selectedOptionId: selectedOptionId ?? undefined,
        mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      onAnswered(updated);
      onClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (!question) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Your Answer</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Show question context */}
            <View style={styles.questionPreview}>
              {question.taskName && <Text style={styles.questionPreviewTask}>Task: {question.taskName}</Text>}
              <Text style={styles.questionPreviewText}>{question.text}</Text>
            </View>

            {/* Show question media */}
            {question.mediaUrls && question.mediaUrls.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                {question.mediaUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.mediaThumbnail} />
                ))}
              </ScrollView>
            )}

            {question.type === 'MultipleChoice' && question.options ? (
              <>
                <Text style={styles.fieldLabel}>Choose an answer *</Text>
                {question.options.map((opt: QuestionOptionDto) => (
                  <TouchableOpacity
                    key={opt.optionId}
                    style={[styles.optionBtn, selectedOptionId === opt.optionId && styles.optionBtnSelected]}
                    onPress={() => {
                      setSelectedOptionId(opt.optionId);
                      setAnswerText(opt.text);
                    }}
                  >
                    <View style={[styles.optionRadio, selectedOptionId === opt.optionId && styles.optionRadioSelected]} />
                    <Text style={[styles.optionBtnText, selectedOptionId === opt.optionId && styles.optionBtnTextSelected]}>
                      {opt.text}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.fieldLabel}>Or add your own answer (optional)</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Type a custom answer..."
                  placeholderTextColor={GardenColors.textMuted}
                  value={selectedOptionId ? '' : answerText}
                  onChangeText={(v) => {
                    setSelectedOptionId(null);
                    setAnswerText(v);
                  }}
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Your answer *</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Type your answer..."
                  placeholderTextColor={GardenColors.textMuted}
                  value={answerText}
                  onChangeText={setAnswerText}
                  multiline
                  numberOfLines={4}
                />
              </>
            )}

            {/* Media attachment */}
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
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (submitting || uploading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || uploading}
            >
              {submitting || uploading ? (
                <ActivityIndicator color={GardenColors.bgRoot} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Answer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  onAnswer,
}: {
  question: TaskQuestionDto;
  onAnswer: (q: TaskQuestionDto) => void;
}) {
  const answered = question.status === 'Answered';

  return (
    <View style={[styles.card, !answered && styles.cardUnanswered]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, answered ? styles.badgeAnswered : styles.badgePending]}>
          <Text style={styles.statusBadgeText}>{answered ? 'Answered' : 'Needs answer'}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {question.taskName ? `Task: ${question.taskName}  ·  ` : ''}
          {question.askedByName ? `From: ${question.askedByName}  ·  ` : ''}
          {new Date(question.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.questionText}>{question.text}</Text>

      {question.type === 'MultipleChoice' && question.options && question.options.length > 0 && (
        <View style={styles.optionsContainer}>
          {question.options.map((opt: QuestionOptionDto) => (
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
          <Text style={styles.answerLabel}>Your answer:</Text>
          <Text style={styles.answerText}>{question.answer.text}</Text>
          {question.answer.mediaUrls && question.answer.mediaUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {question.answer.mediaUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.mediaThumbnail} />
              ))}
            </ScrollView>
          )}
          {question.answer.answeredAt && (
            <Text style={styles.answeredAt}>
              Answered {new Date(question.answer.answeredAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {!answered && (
        <TouchableOpacity style={styles.answerBtn} onPress={() => onAnswer(question)}>
          <Text style={styles.answerBtnText}>Answer →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClientQuestions() {
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

  // Answer modal
  const [answeringQuestion, setAnsweringQuestion] = useState<TaskQuestionDto | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getClientQuestions(token, selectedTaskId || undefined, 1, 100);
      setQuestions(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    }
  }, [token, selectedTaskId]);

  const loadJobs = useCallback(async () => {
    if (!token) return;
    try {
      const jobRes = await getClientJobs(token, 1, 50);
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
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobId || !token) return;
    void getClientJobTasks(token, selectedJobId, 1, 100).then((r) => setTasks(r.items));
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

  function handleAnswered(updated: TaskQuestionDto) {
    setQuestions((prev) =>
      prev.map((q) => (q.questionId === updated.questionId ? updated : q)),
    );
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
        {pending.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {/* Task filter */}
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

      {/* Job selector */}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GardenColors.accent} />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No questions yet.</Text>
              <Text style={styles.emptyHint}>
                Your gardener will ask questions about your tasks here.
              </Text>
            </View>
          }
          ListHeaderComponent={
            pending.length > 0 && answered.length > 0 ? (
              <Text style={styles.sectionLabel}>Needs your answer ({pending.length})</Text>
            ) : pending.length > 0 ? (
              <Text style={styles.sectionLabel}>Needs your answer ({pending.length})</Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <>
              {index === pending.length && answered.length > 0 && (
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Answered ({answered.length})</Text>
              )}
              <QuestionCard question={item} onAnswer={(q) => setAnsweringQuestion(q)} />
            </>
          )}
        />
      )}

      <AnswerModal
        question={answeringQuestion}
        visible={!!answeringQuestion}
        onClose={() => setAnsweringQuestion(null)}
        onAnswered={handleAnswered}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  pendingBadge: {
    backgroundColor: GardenColors.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: { color: GardenColors.bgRoot, fontWeight: '700', fontSize: 13 },

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
  cardUnanswered: {
    borderColor: 'rgba(245,158,11,0.35)',
    backgroundColor: 'rgba(17,40,24,0.97)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.18)' },
  badgeAnswered: { backgroundColor: 'rgba(74,222,128,0.18)' },
  statusBadgeText: { color: GardenColors.textPrimary, fontSize: 11, fontWeight: '700' },
  cardMeta: { color: GardenColors.textMuted, fontSize: 12, flexShrink: 1 },
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
  answeredAt: { color: GardenColors.textMuted, fontSize: 11, marginTop: 4 },

  answerBtn: {
    marginTop: 10,
    backgroundColor: GardenColors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  answerBtnText: { color: GardenColors.bgRoot, fontWeight: '700', fontSize: 15 },

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
  modalTitle: { color: GardenColors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  questionPreview: {
    backgroundColor: GardenColors.bgSurfaceSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: GardenColors.accent,
  },
  questionPreviewTask: { color: GardenColors.textMuted, fontSize: 12, marginBottom: 4 },
  questionPreviewText: { color: GardenColors.textPrimary, fontSize: 15, lineHeight: 21 },

  fieldLabel: { color: GardenColors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },

  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GardenColors.bgSurfaceSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: GardenColors.borderSubtle,
  },
  optionBtnSelected: { backgroundColor: GardenColors.accentSoft, borderColor: GardenColors.accent },
  optionRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: GardenColors.textMuted,
  },
  optionRadioSelected: { borderColor: GardenColors.accent, backgroundColor: GardenColors.accent },
  optionBtnText: { color: GardenColors.textMuted, fontSize: 14, flex: 1 },
  optionBtnTextSelected: { color: GardenColors.accent, fontWeight: '600' },

  input: {
    backgroundColor: GardenColors.bgSurfaceSoft,
    borderWidth: 1, borderColor: GardenColors.borderSubtle,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: GardenColors.textPrimary, fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },

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

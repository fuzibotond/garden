import InvoiceViewer from '@/components/invoice-viewer';
import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { addAnswerMedia, answerQuestion, getClientJobTasks, getClientJobs, getTaskQuestions, type CreateAnswerResult, type JobDto, type QuestionOptionDto, type TaskDto, type TaskQuestionDto } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform,
    RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ClientJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task expansion
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobTasks, setJobTasks] = useState<Record<string, TaskDto[]>>({});
  const [tasksLoading, setTasksLoading] = useState<string | null>(null);

  // Q&A state
  const [questionsTask, setQuestionsTask] = useState<TaskDto | null>(null);
  const [questionsJobName, setQuestionsJobName] = useState('');
  const [taskQuestions, setTaskQuestions] = useState<TaskQuestionDto[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // Answer modal state
  const [answeringQuestion, setAnsweringQuestion] = useState<TaskQuestionDto | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerMedia, setAnswerMedia] = useState<{ mediaUrl: string; mimeType: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceJobId, setInvoiceJobId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getClientJobs(token, 1, 100);
      setJobs(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }, [token]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function toggleJobExpand(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    if (jobTasks[jobId]) return; // already loaded
    setTasksLoading(jobId);
    try {
      if (!token) return;
      const res = await getClientJobTasks(token, jobId, 1, 100);
      setJobTasks((prev) => ({ ...prev, [jobId]: res.items }));
    } catch {
      // non-critical
    } finally {
      setTasksLoading(null);
    }
  }

  async function openQuestionsModal(task: TaskDto, jobName: string) {
    setQuestionsTask(task);
    setQuestionsJobName(jobName);
    setTaskQuestions([]);
    setShowQuestionsModal(true);
    setQuestionsLoading(true);
    try {
      if (!token) return;
      const res = await getTaskQuestions(token, task.taskId);
      setTaskQuestions(res.items);
    } catch {
      // non-critical
    } finally {
      setQuestionsLoading(false);
    }
  }

  function openInvoice(jobId: string, invoiceNum?: string) {
    setInvoiceJobId(jobId);
    setInvoiceNumber(invoiceNum);
    setShowInvoice(true);
  }

  function openAnswerModal(q: TaskQuestionDto) {
    setAnsweringQuestion(q);
    setAnswerText('');
    setSelectedOptionId(null);
    setAnswerMedia([]);
  }

  async function pickAnswerMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow media library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) return;

    const picked = result.assets
      .map((a, idx) => {
        if (!a.base64) return null;
        // expo-image-picker transcodes HEIC to JPEG bytes when base64:true, but
        // may still report mimeType as image/heic — normalise to jpeg so the
        // backend stores a renderable file extension.
        const rawMime = a.mimeType ?? 'image/jpeg';
        const mimeType = rawMime === 'image/heic' || rawMime === 'image/heif' ? 'image/jpeg' : rawMime;
        const rawName = a.fileName ?? `image-${Date.now()}-${idx}.jpg`;
        const filename = (rawMime === 'image/heic' || rawMime === 'image/heif')
          ? rawName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
          : rawName;
        return {
          mediaUrl: `data:${mimeType};base64,${a.base64}`,
          mimeType,
          filename,
        };
      })
      .filter((m): m is { mediaUrl: string; mimeType: string; filename: string } => !!m);

    if (picked.length === 0) {
      Alert.alert('Could not attach image', 'Selected image could not be read. Please try another one.');
      return;
    }

    setAnswerMedia((prev) => [...prev, ...picked]);
  }

  async function handleSubmitAnswer() {
    if (!token || !answeringQuestion) return;

    const finalText = answerText.trim();
    if (!finalText) {
      Alert.alert(
        'Answer required',
        answeringQuestion.type === 'MultipleChoice' ? 'Please select an option.' : 'Please enter your answer.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const result: CreateAnswerResult = await answerQuestion(token, answeringQuestion.questionId, { text: finalText });

      if (answerMedia.length > 0) {
        await Promise.all(
          answerMedia.map((m) =>
            addAnswerMedia(token, result.answerId, m.mediaUrl, m.mimeType, m.filename),
          ),
        );
      }

      if (questionsTask) {
        const refreshed = await getTaskQuestions(token, questionsTask.taskId);
        setTaskQuestions(refreshed.items);
      } else {
        setTaskQuestions((prev) =>
          prev.map((q) =>
            q.questionId === result.questionId
              ? {
                  ...q,
                  status: 'Answered' as const,
                  answer: {
                    answerId: result.answerId,
                    questionId: result.questionId,
                    text: result.answerText,
                    answeredAt: result.createdAt,
                  },
                }
              : q,
          ),
        );
      }
      setAnsweringQuestion(null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>My Jobs</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GardenColors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GardenColors.accent} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {jobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No jobs found.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {jobs.map((job) => {
                const progress = job.progressPercent ?? 0;
                const isExpanded = expandedJobId === job.jobId;
                const tasks = jobTasks[job.jobId] ?? [];
                const isLoadingTasks = tasksLoading === job.jobId;

                return (
                  <View key={job.jobId} style={styles.card}>
                    <TouchableOpacity onPress={() => toggleJobExpand(job.jobId)} activeOpacity={0.85}>
                      <View style={styles.cardTop}>
                        <Text style={styles.jobName} numberOfLines={2}>{job.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.statusPill, job.isClosed ? styles.statusClosed : styles.statusActive]}>
                            <View style={[styles.statusDot, { backgroundColor: job.isClosed ? GardenColors.textMuted : GardenColors.success }]} />
                            <Text style={[styles.statusText, { color: job.isClosed ? GardenColors.textMuted : GardenColors.success }]}>
                              {job.isClosed ? 'Done' : 'Active'}
                            </Text>
                          </View>
                          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>📋 {job.taskCount ?? 0} tasks</Text>
                        <Text style={styles.metaText}>✅ {job.finishedTaskCount ?? 0} done</Text>
                        {(job.inProgressTaskCount ?? 0) > 0 && (
                          <Text style={styles.metaText}>⚙️ {job.inProgressTaskCount} in progress</Text>
                        )}
                      </View>

                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                        </View>
                        <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.tasksSection}>
                        <View style={styles.tasksSeparator} />
                        {isLoadingTasks ? (
                          <ActivityIndicator color={GardenColors.accent} style={{ marginVertical: 12 }} />
                        ) : tasks.length === 0 ? (
                          <Text style={styles.emptyText}>No tasks for this job.</Text>
                        ) : (
                          tasks.map((task) => {
                            const taskStatus = task.finishedAt ? 'done' : task.startedAt ? 'in-progress' : 'pending';
                            const statusColor = taskStatus === 'done' ? GardenColors.textMuted : taskStatus === 'in-progress' ? GardenColors.success : GardenColors.warning;
                            return (
                              <View key={task.taskId} style={styles.taskRow}>
                                <View style={styles.taskInfo}>
                                  <View style={[styles.taskStatusDot, { backgroundColor: statusColor }]} />
                                  <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.questionsBtn}
                                  onPress={() => openQuestionsModal(task, job.name)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.questionsBtnText}>❓ Questions</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                        {job.isClosed && (
                          <TouchableOpacity
                            style={styles.invoiceBtn}
                            onPress={() => openInvoice(job.jobId, job.jobId)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.invoiceBtnText}>📄 View Invoice</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Task Questions / Answer modal — single modal, toggled by answeringQuestion state */}
      <Modal
        visible={showQuestionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (answeringQuestion) {
            setAnsweringQuestion(null);
          } else {
            setShowQuestionsModal(false);
          }
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modal}>
          <View style={styles.modalHeader}>
            {answeringQuestion ? (
              <TouchableOpacity onPress={() => setAnsweringQuestion(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.modalClose}>←</Text>
                <Text style={{ fontSize: 15, color: GardenColors.textMuted }}>Questions</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.modalTitle}>❓ Questions</Text>
            )}
            <TouchableOpacity onPress={() => { setShowQuestionsModal(false); setAnsweringQuestion(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {answeringQuestion ? (
            answeringQuestion.status === 'Answered' ? (
              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.answerModalTitle}>Question &amp; Answer</Text>
                <View style={styles.questionPreview}>
                  <Text style={styles.questionPreviewText}>{answeringQuestion.text}</Text>
                </View>
                {answeringQuestion.mediaUrls && answeringQuestion.mediaUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                    {answeringQuestion.mediaUrls.map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                        <Image source={{ uri: url }} style={styles.mediaThumbnail} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <View style={[styles.qAnswerBox, { marginTop: 8 }]}>
                  <Text style={styles.qAnswerLabel}>Your answer:</Text>
                  <Text style={styles.qAnswerText}>{answeringQuestion.answer?.text}</Text>
                  {answeringQuestion.answer?.mediaUrls && answeringQuestion.answer.mediaUrls.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.mediaRow, { marginTop: 8 }]}>
                      {answeringQuestion.answer.mediaUrls.map((url, i) => (
                        <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                          <Image source={{ uri: url }} style={styles.mediaThumbnail} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
            ) : (
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.answerModalTitle}>Your Answer</Text>
              <View style={styles.questionPreview}>
                <Text style={styles.questionPreviewText}>{answeringQuestion.text}</Text>
              </View>
              {answeringQuestion.mediaUrls && answeringQuestion.mediaUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                  {answeringQuestion.mediaUrls.map((url, i) => (
                    <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                      <Image source={{ uri: url }} style={styles.mediaThumbnail} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {answeringQuestion.type === 'MultipleChoice' && answeringQuestion.options ? (
                <>
                  <Text style={styles.fieldLabel}>Choose an answer *</Text>
                  {answeringQuestion.options.map((opt: QuestionOptionDto) => (
                    <TouchableOpacity
                      key={opt.optionId}
                      style={[styles.optionBtn, selectedOptionId === opt.optionId && styles.optionBtnSelected]}
                      onPress={() => { setSelectedOptionId(opt.optionId); setAnswerText(opt.text); }}
                    >
                      <View style={[styles.optionRadio, selectedOptionId === opt.optionId && styles.optionRadioSelected]} />
                      <Text style={[styles.optionBtnText, selectedOptionId === opt.optionId && styles.optionBtnTextSelected]}>{opt.text}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.fieldLabel}>Or add your own answer (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder="Type a custom answer..."
                    placeholderTextColor={GardenColors.textMuted}
                    value={selectedOptionId ? '' : answerText}
                    onChangeText={(v) => { setSelectedOptionId(null); setAnswerText(v); }}
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
                    autoFocus
                  />
                </>
              )}
              <Text style={styles.fieldLabel}>Attach image (optional)</Text>
              <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickAnswerMedia}>
                <Text style={styles.mediaPickerBtnText}>📎 Add image</Text>
              </TouchableOpacity>
              {answerMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                  {answerMedia.map((m, i) => (
                    <View key={i} style={{ position: 'relative' }}>
                      <Image source={{ uri: m.mediaUrl }} style={styles.mediaThumbnail} />
                      <TouchableOpacity
                        style={styles.mediaRemoveBtn}
                        onPress={() => setAnswerMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={styles.mediaRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitAnswer}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#071108" />
                  : <Text style={styles.submitBtnText}>Submit Answer</Text>}
              </TouchableOpacity>
            </ScrollView>
            )
          ) : (
            <>
              {questionsTask ? (
                <View style={styles.taskChip}>
                  <Text style={styles.taskChipLabel}>Task</Text>
                  <Text style={styles.taskChipName}>{questionsTask.name}</Text>
                  <Text style={styles.taskChipJob}>{questionsJobName}</Text>
                </View>
              ) : null}
              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                {questionsLoading ? (
                  <ActivityIndicator color={GardenColors.accent} style={{ marginVertical: 24 }} />
                ) : taskQuestions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No questions yet.</Text>
                    <Text style={styles.emptySubText}>Your gardener hasn't asked any questions for this task.</Text>
                  </View>
                ) : (
                  taskQuestions.map((q) => {
                    const answered = q.status === 'Answered';
                    return (
                      <View key={q.questionId} style={[styles.qCard, !answered && styles.qCardPending]}>
                        <View style={styles.qCardHeader}>
                          <View style={[styles.qStatusBadge, answered ? styles.qBadgeAnswered : styles.qBadgePending]}>
                            <Text style={styles.qStatusBadgeText}>{answered ? 'Answered' : 'Pending'}</Text>
                          </View>
                          <Text style={styles.qCardMeta}>{new Date(q.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.qQuestionText}>{q.text}</Text>
                        {q.type === 'MultipleChoice' && q.options && q.options.length > 0 && (
                          <View style={styles.qOptionsContainer}>
                            {q.options.map((opt) => (
                              <View key={opt.optionId} style={styles.qOptionChip}>
                                <Text style={styles.qOptionChipText}>{opt.text}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {q.mediaUrls && q.mediaUrls.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                            {q.mediaUrls.map((url, i) => (
                              <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                                <Image source={{ uri: url }} style={styles.mediaThumbnail} />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                        {answered && q.answer && (
                          <View style={styles.qAnswerBox}>
                            <Text style={styles.qAnswerLabel}>Your answer:</Text>
                            <Text style={styles.qAnswerText} numberOfLines={2}>{q.answer.text}</Text>
                          </View>
                        )}
                        {answered ? (
                          <TouchableOpacity style={styles.viewBtn} onPress={() => setAnsweringQuestion(q)} activeOpacity={0.85}>
                            <Text style={styles.viewBtnText}>View details →</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.answerBtn} onPress={() => openAnswerModal(q)} activeOpacity={0.85}>
                            <Text style={styles.answerBtnText}>Answer →</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}
          {lightboxUrl !== null && (
            <View style={styles.lightboxOverlay}>
              <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                maximumZoomScale={5}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
              </ScrollView>
              <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
                <Text style={styles.lightboxCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Invoice Viewer */}
      {invoiceJobId && token && (
        <InvoiceViewer
          visible={showInvoice}
          jobId={invoiceJobId}
          invoiceNumber={invoiceNumber}
          token={token}
          isGardener={false}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  list: { gap: 12 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 28, alignItems: 'center', gap: 6,
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14 },
  emptySubText: { color: GardenColors.textMuted, fontSize: 12, textAlign: 'center', opacity: 0.7 },
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: GardenColors.cardBorder, padding: 16, gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  jobName: { flex: 1, fontSize: 15, fontWeight: '600', color: GardenColors.textPrimary },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  statusActive: { borderColor: 'rgba(74, 222, 128, 0.4)' },
  statusClosed: { borderColor: 'rgba(192, 199, 184, 0.25)' },
  statusDot: { width: 6, height: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  expandIcon: { fontSize: 11, color: GardenColors.textMuted },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: GardenColors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressFill: { height: 4, borderRadius: 999, backgroundColor: GardenColors.accent },
  progressPct: { fontSize: 11, color: GardenColors.textMuted, minWidth: 32, textAlign: 'right' },
  tasksSection: { gap: 6 },
  tasksSeparator: { height: 1, backgroundColor: GardenColors.cardBorder, marginBottom: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  taskInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskStatusDot: { width: 7, height: 7, borderRadius: 999, flexShrink: 0 },
  taskName: { flex: 1, fontSize: 13, color: GardenColors.textPrimary },
  questionsBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.4)', backgroundColor: 'rgba(250, 204, 21, 0.06)',
  },
  questionsBtnText: { fontSize: 12, fontWeight: '600', color: '#facc15' },
  invoiceBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.4)', backgroundColor: 'rgba(217, 255, 106, 0.08)',
    marginTop: 8, alignSelf: 'flex-start',
  },
  invoiceBtnText: { fontSize: 12, fontWeight: '600', color: GardenColors.accent },
  // Modal
  modal: { flex: 1, backgroundColor: GardenColors.bgRoot, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: GardenColors.textPrimary },
  modalClose: { fontSize: 20, color: GardenColors.textMuted, padding: 4 },
  modalBody: { padding: 20, paddingBottom: 40, gap: 4 },
  taskChip: {
    marginHorizontal: 20, marginBottom: 4,
    backgroundColor: 'rgba(217, 255, 106, 0.07)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.2)', padding: 12, gap: 2,
  },
  taskChipLabel: { fontSize: 10, fontWeight: '600', color: GardenColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskChipName: { fontSize: 15, fontWeight: '700', color: GardenColors.textPrimary },
  taskChipJob: { fontSize: 12, color: GardenColors.textMuted },
  // Q cards
  qCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 14,
    borderWidth: 1, borderColor: GardenColors.cardBorder, padding: 14, gap: 8, marginBottom: 10,
  },
  qCardPending: { borderColor: 'rgba(250, 204, 21, 0.4)', backgroundColor: 'rgba(250, 204, 21, 0.04)' },
  qCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  qBadgePending: { backgroundColor: 'rgba(250, 204, 21, 0.15)', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.4)' },
  qBadgeAnswered: { backgroundColor: 'rgba(74, 222, 128, 0.12)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)' },
  qStatusBadgeText: { fontSize: 11, fontWeight: '600', color: GardenColors.textPrimary },
  qCardMeta: { fontSize: 11, color: GardenColors.textMuted },
  qQuestionText: { fontSize: 14, color: GardenColors.textPrimary, lineHeight: 20 },
  qOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qOptionChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  qOptionChipText: { fontSize: 12, color: GardenColors.textMuted },
  qAnswerBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)', padding: 10, gap: 4,
  },
  qAnswerLabel: { fontSize: 11, color: GardenColors.textMuted, fontWeight: '600' },
  qAnswerText: { fontSize: 13, color: GardenColors.textPrimary },
  answerBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: GardenColors.accent,
  },
  answerBtnText: { fontSize: 13, fontWeight: '700', color: '#071108' },
  mediaRow: { marginVertical: 4 },
  mediaThumbnail: { width: 72, height: 72, borderRadius: 8, marginRight: 8, backgroundColor: GardenColors.cardBorder },
  // Answer modal (bottom sheet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: GardenColors.bgRoot, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '90%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: GardenColors.cardBorder, alignSelf: 'center', marginBottom: 16 },
  answerModalTitle: { fontSize: 18, fontWeight: '700', color: GardenColors.textPrimary, marginBottom: 12 },
  questionPreview: {
    backgroundColor: 'rgba(217, 255, 106, 0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.2)', padding: 12, marginBottom: 12,
  },
  questionPreviewText: { fontSize: 14, color: GardenColors.textPrimary, lineHeight: 20 },
  fieldLabel: { fontSize: 13, color: 'rgba(247, 248, 244, 0.9)', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1, borderRadius: 14, borderColor: 'rgba(190, 255, 171, 0.32)',
    backgroundColor: 'rgba(4, 20, 10, 0.86)', paddingHorizontal: 14, paddingVertical: 10,
    color: GardenColors.textPrimary, fontSize: 14,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: GardenColors.cardBorder,
    backgroundColor: GardenColors.cardBg, marginBottom: 8,
  },
  optionBtnSelected: { borderColor: GardenColors.accent, backgroundColor: 'rgba(217, 255, 106, 0.08)' },
  optionRadio: {
    width: 18, height: 18, borderRadius: 999,
    borderWidth: 2, borderColor: GardenColors.textMuted,
  },
  optionRadioSelected: { borderColor: GardenColors.accent, backgroundColor: GardenColors.accent },
  optionBtnText: { flex: 1, fontSize: 14, color: GardenColors.textMuted },
  optionBtnTextSelected: { color: GardenColors.textPrimary, fontWeight: '600' },
  mediaPickerBtn: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: GardenColors.cardBorder,
    backgroundColor: GardenColors.cardBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  mediaPickerBtnText: { fontSize: 13, color: GardenColors.textMuted },
  mediaRemoveBtn: {
    position: 'absolute', top: 2, right: 10, width: 18, height: 18, borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  mediaRemoveBtnText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  submitBtn: {
    height: 52, borderRadius: 999, backgroundColor: GardenColors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#071108' },
  viewBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)', backgroundColor: 'rgba(74, 222, 128, 0.06)',
  },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: GardenColors.success },
  lightboxOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.93)', zIndex: 200,
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxImage: { width: SCREEN_W, height: SCREEN_H * 0.78 },
  lightboxClose: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxCloseText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});

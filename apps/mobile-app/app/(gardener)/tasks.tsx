import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    addQuestionMedia,
    createGardenerQuestion,
    createTask, deleteGardenerTask, getGardenerJobById, getGardenerJobs, getGardenerJobTasks, getGardenerMaterials,
    getGardenerTaskById, getGardenerTaskTypes,
    getTaskQuestions,
    scheduleTask, updateGardenerTask, type JobDto, type MaterialDto, type QuestionType, type TaskDto, type TaskQuestionDto, type TaskTypeDto,
} from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, Image, Modal, Platform, RefreshControl, ScrollView,
    StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type TaskWithJob = TaskDto & { jobName: string };

function taskStatus(t: TaskDto): 'done' | 'in-progress' | 'pending' {
  if (t.finishedAt) return 'done';
  if (t.startedAt) return 'in-progress';
  return 'pending';
}

export default function GardenerTasks() {
  const { token } = useAuth();
  const { jobId: paramJobId } = useLocalSearchParams<{ jobId?: string }>();
  const [tasks, setTasks] = useState<TaskWithJob[]>([]);
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Register task modal state
  const [showRegister, setShowRegister] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskEst, setTaskEst] = useState('');
  const [initialStatus, setInitialStatus] = useState<'pending' | 'started' | 'done'>('pending');
  const [creating, setCreating] = useState(false);
  const [taskTypes, setTaskTypes] = useState<TaskTypeDto[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<{ materialId: string; usedQuantity: string }[]>([]);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<TaskWithJob | null>(null);
  const [schedDateTime, setSchedDateTime] = useState<Date>(new Date());
  const [showSchedDatePicker, setShowSchedDatePicker] = useState(false);
  const [showSchedTimePicker, setShowSchedTimePicker] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  // Edit / delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithJob | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEst, setEditEst] = useState('');
  const [editMaterials, setEditMaterials] = useState<{ materialId: string; usedQuantity: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Task Q&A state
  const [questionsTask, setQuestionsTask] = useState<TaskWithJob | null>(null);
  const [taskQuestions, setTaskQuestions] = useState<TaskQuestionDto[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [creatingNewQuestion, setCreatingNewQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('FreeText');
  const [questionOptions, setQuestionOptions] = useState<string[]>(['', '']);
  const [questionMedia, setQuestionMedia] = useState<{ mediaUrl: string; mimeType: string; filename: string }[]>([]);
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Lightbox for question/answer images
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const jobsRes = await getGardenerJobs(token, 1, 50);
      // When viewing a specific job, include closed jobs too
      const relevantJobs = paramJobId
        ? jobsRes.items.filter((j) => j.jobId === paramJobId)
        : jobsRes.items.filter((j) => !j.isClosed);
      setJobs(jobsRes.items.filter((j) => !j.isClosed)); // register modal only shows active
      const taskArrays = await Promise.all(
        relevantJobs.map((j) =>
          getGardenerJobTasks(token, j.jobId, 1, 100).then((r) =>
            // explicitly stamp jobId — API may not return it on job-scoped endpoints
            r.items.map((t): TaskWithJob => ({ ...t, jobId: j.jobId, jobName: j.name })),
          ),
        ),
      );
      setTasks(taskArrays.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  }, [token, paramJobId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleStart(task: TaskWithJob) {
    if (!token) return;
    setActionLoading(task.taskId);
    try {
      await updateGardenerTask(token, task.taskId, { startedAt: new Date().toISOString() });
      setTasks((prev) =>
        prev.map((t) => t.taskId === task.taskId ? { ...t, startedAt: new Date().toISOString() } : t),
      );
      Alert.alert('Task started ✅', `"${task.name}" is now in progress.\n\nYour client will see this update.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFinish(task: TaskWithJob) {
    if (!token) return;
    setActionLoading(task.taskId);
    try {
      await updateGardenerTask(token, task.taskId, { finishedAt: new Date().toISOString() });
      setTasks((prev) =>
        prev.map((t) => t.taskId === task.taskId ? { ...t, finishedAt: new Date().toISOString() } : t),
      );
      Alert.alert('Task completed 🎉', `"${task.name}" is marked as done.\n\nYour client will see this update.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to finish task');
    } finally {
      setActionLoading(null);
    }
  }

  async function openScheduleModal(task: TaskWithJob) {
    setSchedulingTask(task);
    setSchedDateTime(new Date());
    setSchedError(null);
    setShowScheduleModal(true);
  }

  async function handleScheduleSubmit() {
    if (!token || !schedulingTask) return;
    const iso = schedDateTime.toISOString();
    // Get clientId from the task's job
    let clientId: string | undefined;
    const localJob = jobs.find((j) => j.jobId === schedulingTask.jobId);
    if (localJob?.clientId) {
      clientId = localJob.clientId;
    } else {
      try {
        const fetched = await getGardenerJobById(token, schedulingTask.jobId);
        clientId = fetched.clientId;
      } catch {
        setSchedError('Could not load job details.');
        return;
      }
    }
    if (!clientId) {
      setSchedError('This job has no associated client.');
      return;
    }
    setScheduling(true);
    setSchedError(null);
    try {
      await scheduleTask(token, schedulingTask.taskId, clientId, iso);
      setShowScheduleModal(false);
      Alert.alert('Schedule sent ✅', `Appointment request sent to the client for "${schedulingTask.name}".`);
    } catch (err) {
      setSchedError(err instanceof Error ? err.message : 'Failed to send schedule request');
    } finally {
      setScheduling(false);
    }
  }

  async function openRegister() {
    setSelectedJobId(paramJobId ?? jobs[0]?.jobId ?? '');
    setTaskName('');
    setTaskDesc('');
    setTaskEst('');
    setInitialStatus('pending');
    setSelectedTypeId('');
    setSelectedMaterials([]);
    setShowRegister(true);
    if (!token) return;
    try {
      const [types, mats] = await Promise.all([
        getGardenerTaskTypes(token),
        getGardenerMaterials(token, 1, 100),
      ]);
      setTaskTypes(types);
      setMaterials(mats.items);
    } catch {
      // non-critical – form still works without them
    }
  }

  async function handleCreateTask() {
    if (!token || !selectedJobId || !taskName.trim()) {
      Alert.alert('Missing info', 'Please select a job and enter a task name.');
      return;
    }
    setCreating(true);
    try {
      const created = await createTask(token, {
        jobId: selectedJobId,
        taskTypeId: selectedTypeId || undefined,
        name: taskName.trim(),
        description: taskDesc.trim() || undefined,
        estimatedTimeMinutes: taskEst ? parseInt(taskEst, 10) : undefined,
        materials: selectedMaterials.length > 0
          ? selectedMaterials
              .filter((m) => parseFloat(m.usedQuantity) > 0)
              .map((m) => ({ materialId: m.materialId, usedQuantity: parseFloat(m.usedQuantity) }))
          : undefined,
      });
      // Apply initial status via update if not pending
      const now = new Date().toISOString();
      if (initialStatus !== 'pending') {
        await updateGardenerTask(token, created.taskId, {
          startedAt: now,
          ...(initialStatus === 'done' ? { finishedAt: now } : {}),
        });
        if (initialStatus === 'started') created.startedAt = now;
        if (initialStatus === 'done') { created.startedAt = now; created.finishedAt = now; }
      }
      const jobName = jobs.find((j) => j.jobId === selectedJobId)?.name ?? '';
      setTasks((prev) => [{ ...created, jobId: selectedJobId, jobName }, ...prev]);
      setShowRegister(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  async function openEdit(task: TaskWithJob) {
    setEditingTask(task);
    setEditName(task.name);
    setEditDesc(task.description ?? '');
    setEditEst(task.estimatedTimeMinutes != null ? String(task.estimatedTimeMinutes) : '');
    setEditMaterials([]);
    setShowEdit(true);
    if (!token) return;
    try {
      const [taskDetail, types, mats] = await Promise.all([
        getGardenerTaskById(token, task.taskId),
        taskTypes.length > 0 ? Promise.resolve(taskTypes) : getGardenerTaskTypes(token),
        materials.length > 0 ? Promise.resolve({ items: materials, total: materials.length }) : getGardenerMaterials(token, 1, 100),
      ]);
      if (types !== taskTypes) setTaskTypes(types as TaskTypeDto[]);
      const matItems = Array.isArray(mats) ? mats : (mats as { items: MaterialDto[] }).items;
      if (matItems !== materials) setMaterials(matItems);
      if (taskDetail.materials && taskDetail.materials.length > 0) {
        setEditMaterials(
          taskDetail.materials.map((m) => ({ materialId: m.materialId, usedQuantity: String(m.usedQuantity) }))
        );
      }
    } catch { /* non-critical, edit still works without preloaded data */ }
  }

  async function handleEditSave() {
    if (!token || !editingTask || !editName.trim()) {
      Alert.alert('Missing info', 'Task name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateGardenerTask(token, editingTask.taskId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        actualTimeMinutes: editEst ? parseInt(editEst, 10) : undefined,
        materials: editMaterials.length > 0
          ? editMaterials
              .filter((m) => parseFloat(m.usedQuantity) > 0)
              .map((m) => ({ materialId: m.materialId, usedQuantity: parseFloat(m.usedQuantity) }))
          : undefined,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === editingTask.taskId
            ? { ...t, name: editName.trim(), description: editDesc.trim() || undefined, estimatedTimeMinutes: editEst ? parseInt(editEst, 10) : t.estimatedTimeMinutes }
            : t,
        ),
      );
      setShowEdit(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteGardenerTask(token, taskId);
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  }

  async function openQuestionsModal(task: TaskWithJob) {
    setQuestionsTask(task);
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

  function openCreateQuestion() {
    setQuestionText('');
    setQuestionType('FreeText');
    setQuestionOptions(['', '']);
    setQuestionMedia([]);
    setCreatingNewQuestion(true);
  }

  async function pickQuestionMedia() {
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

    setQuestionMedia((prev) => [...prev, ...picked]);
  }

  async function handleCreateQuestion() {
    if (!token || !questionsTask || !questionText.trim()) {
      Alert.alert('Missing info', 'Please enter a question.');
      return;
    }
    const validOptions = questionOptions.filter((o) => o.trim().length > 0);
    if (questionType === 'MultipleChoice' && validOptions.length < 2) {
      Alert.alert('Missing info', 'Add at least 2 options for a multiple choice question.');
      return;
    }
    setCreatingQuestion(true);
    try {
      const created = await createGardenerQuestion(token, {
        taskId: questionsTask.taskId,
        text: questionText.trim(),
        type: questionType,
        options: questionType === 'MultipleChoice' ? validOptions : undefined,
      });

      if (questionMedia.length > 0) {
        await Promise.all(
          questionMedia.map((m) =>
            addQuestionMedia(token, created.questionId, m.mediaUrl, m.mimeType, m.filename),
          ),
        );
      }

      const refreshed = await getTaskQuestions(token, questionsTask.taskId);
      setTaskQuestions(refreshed.items);
      setCreatingNewQuestion(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setCreatingQuestion(false);
    }
  }

  function toggleMaterial(materialId: string) {
    setSelectedMaterials((prev) =>
      prev.find((m) => m.materialId === materialId)
        ? prev.filter((m) => m.materialId !== materialId)
        : [...prev, { materialId, usedQuantity: '1' }],
    );
  }

  function setMaterialQty(materialId: string, qty: string) {
    setSelectedMaterials((prev) =>
      prev.map((m) => (m.materialId === materialId ? { ...m, usedQuantity: qty } : m)),
    );
  }

  const filteredTasks = paramJobId ? tasks.filter((t) => t.jobId === paramJobId) : tasks;
  const filteredJobName = paramJobId ? jobs.find((j) => j.jobId === paramJobId)?.name : undefined;
  const pending = filteredTasks.filter((t) => taskStatus(t) === 'pending');
  const inProgress = filteredTasks.filter((t) => taskStatus(t) === 'in-progress');
  const done = filteredTasks.filter((t) => taskStatus(t) === 'done');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {paramJobId ? (
            <TouchableOpacity onPress={() => router.setParams({ jobId: undefined })} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← All Jobs</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>{filteredJobName ?? 'Tasks'}</Text>
        </View>
        <TouchableOpacity style={styles.registerBtn} onPress={openRegister} activeOpacity={0.8}>
          <Text style={styles.registerBtnText}>+ Register</Text>
        </TouchableOpacity>
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

          {/* In progress */}
          {inProgress.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>⚙️ In Progress ({inProgress.length})</Text>
              <View style={styles.list}>
                {inProgress.map((t) => (
                  <TaskCard key={t.taskId} task={t} onFinish={handleFinish} onEdit={openEdit} onDelete={setConfirmDeleteId} confirmDeleteId={confirmDeleteId} onConfirmDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)} deleting={deleting} actionLoading={actionLoading} onSchedule={openScheduleModal} onOpenQuestions={openQuestionsModal} />
                ))}
              </View>
            </>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                📋 Pending ({pending.length})
              </Text>
              <View style={styles.list}>
                {pending.map((t) => (
                  <TaskCard key={t.taskId} task={t} onStart={handleStart} onEdit={openEdit} onDelete={setConfirmDeleteId} confirmDeleteId={confirmDeleteId} onConfirmDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)} deleting={deleting} actionLoading={actionLoading} onSchedule={openScheduleModal} onOpenQuestions={openQuestionsModal} />
                ))}
              </View>
            </>
          )}

          {/* Done */}
          {done.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                ✅ Done ({done.length})
              </Text>
              <View style={styles.list}>
                {done.map((t) => (
                  <TaskCard key={t.taskId} task={t} onEdit={openEdit} onDelete={setConfirmDeleteId} confirmDeleteId={confirmDeleteId} onConfirmDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)} deleting={deleting} actionLoading={actionLoading} onOpenQuestions={openQuestionsModal} />
                ))}
              </View>
            </>
          )}

          {filteredTasks.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{paramJobId ? 'No tasks for this job yet.' : 'No tasks found for active jobs.'}</Text>
              <Text style={styles.emptySubText}>Tap "+ Register" to add a task at a client meeting.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Schedule modal */}
      <Modal visible={showScheduleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowScheduleModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Task</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Propose an appointment time — your client will be able to accept, decline, or suggest another time.</Text>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {schedulingTask ? (
              <View style={schedStyles.taskChip}>
                <Text style={schedStyles.taskChipLabel}>Task</Text>
                <Text style={schedStyles.taskChipName}>{schedulingTask.name}</Text>
                <Text style={schedStyles.taskChipJob}>{schedulingTask.jobName}</Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Date</Text>
            <TouchableOpacity style={schedStyles.pickerBtn} onPress={() => setShowSchedDatePicker(true)} activeOpacity={0.8}>
              <Text style={schedStyles.pickerBtnText}>
                {schedDateTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={schedStyles.pickerBtnIcon}>📅</Text>
            </TouchableOpacity>
            {showSchedDatePicker && (
              <DateTimePicker
                value={schedDateTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowSchedDatePicker(false);
                  if (date) setSchedDateTime((prev) => {
                    const next = new Date(date);
                    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Time</Text>
            <TouchableOpacity style={schedStyles.pickerBtn} onPress={() => setShowSchedTimePicker(true)} activeOpacity={0.8}>
              <Text style={schedStyles.pickerBtnText}>
                {schedDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={schedStyles.pickerBtnIcon}>⏰</Text>
            </TouchableOpacity>
            {showSchedTimePicker && (
              <DateTimePicker
                value={schedDateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowSchedTimePicker(false);
                  if (date) setSchedDateTime((prev) => {
                    const next = new Date(prev);
                    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            {schedError ? <Text style={schedStyles.error}>{schedError}</Text> : null}

            <TouchableOpacity
              style={[styles.modalBtn, scheduling && styles.btnDisabled]}
              onPress={handleScheduleSubmit}
              disabled={scheduling}
              activeOpacity={0.85}
            >
              {scheduling ? <ActivityIndicator color="#071108" /> : <Text style={styles.modalBtnText}>Send Schedule Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Register task modal */}
      <Modal visible={showRegister} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRegister(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Register Task</Text>
            <TouchableOpacity onPress={() => setShowRegister(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Record a task discovered during a client visit.</Text>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Job *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {jobs.map((j) => (
                <TouchableOpacity
                  key={j.jobId}
                  style={[styles.chip, selectedJobId === j.jobId && styles.chipSelected]}
                  onPress={() => setSelectedJobId(j.jobId)}
                >
                  <Text style={[styles.chipText, selectedJobId === j.jobId && styles.chipTextSelected]} numberOfLines={1}>
                    {j.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {taskTypes.length > 0 && (
              <>
                <Text style={styles.modalLabel}>Task Type (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {taskTypes.map((tt) => (
                    <TouchableOpacity
                      key={tt.id}
                      style={[styles.chip, selectedTypeId === tt.id && styles.chipSelected]}
                      onPress={() => setSelectedTypeId((prev) => (prev === tt.id ? '' : tt.id))}
                    >
                      <Text style={[styles.chipText, selectedTypeId === tt.id && styles.chipTextSelected]}>
                        {tt.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.modalLabel}>Task Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="e.g. Replace sprinkler head"
              placeholderTextColor={GardenColors.textMuted}
              autoFocus
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={taskDesc}
              onChangeText={setTaskDesc}
              placeholder="Optional details..."
              placeholderTextColor={GardenColors.textMuted}
              multiline
            />

            <Text style={styles.modalLabel}>Estimated Time (minutes)</Text>
            <TextInput
              style={styles.modalInput}
              value={taskEst}
              onChangeText={setTaskEst}
              placeholder="e.g. 60"
              placeholderTextColor={GardenColors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.modalLabel}>Materials (optional)</Text>
            {materials.length === 0 ? (
              <Text style={[styles.emptySubText, { marginTop: 2 }]}>No materials added yet.</Text>
            ) : (
              <View style={styles.matList}>
                {materials.map((mat) => {
                  const sel = selectedMaterials.find((m) => m.materialId === mat.materialId);
                  return (
                    <View key={mat.materialId} style={styles.matRow}>
                      <TouchableOpacity
                        style={[styles.matChip, !!sel && styles.matChipSelected]}
                        onPress={() => toggleMaterial(mat.materialId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matChipText, !!sel && styles.chipTextSelected]} numberOfLines={1}>
                          {mat.name} · {mat.amountType}
                        </Text>
                      </TouchableOpacity>
                      {sel ? (
                        <TextInput
                          style={styles.qtyInput}
                          value={sel.usedQuantity}
                          onChangeText={(v) => setMaterialQty(mat.materialId, v)}
                          placeholder="1"
                          placeholderTextColor={GardenColors.textMuted}
                          keyboardType="decimal-pad"
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.modalLabel}>Initial Status</Text>
            <View style={styles.toggleRow}>
              {(['pending', 'started', 'done'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.toggleBtn, initialStatus === s && styles.toggleBtnActive]}
                  onPress={() => setInitialStatus(s)}
                >
                  <Text style={[styles.toggleBtnText, initialStatus === s && styles.toggleBtnTextActive]}>
                    {s === 'pending' ? 'Pending' : s === 'started' ? 'In Progress' : 'Done'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, creating && styles.btnDisabled]}
              onPress={handleCreateTask}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#071108" />
              ) : (
                <Text style={styles.modalBtnText}>Register Task</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit task modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Task Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Task name"
              placeholderTextColor={GardenColors.textMuted}
              autoFocus
            />
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Optional details..."
              placeholderTextColor={GardenColors.textMuted}
              multiline
            />
            <Text style={styles.modalLabel}>Actual Time (minutes)</Text>
            <TextInput
              style={styles.modalInput}
              value={editEst}
              onChangeText={setEditEst}
              placeholder="e.g. 45"
              placeholderTextColor={GardenColors.textMuted}
              keyboardType="number-pad"
            />
            {editingTask?.taskTypeName ? (
              <>
                <Text style={styles.modalLabel}>Task Type</Text>
                <View style={[styles.chip, styles.chipSelected, { alignSelf: 'flex-start', marginBottom: 12 }]}>
                  <Text style={styles.chipTextSelected}>{editingTask.taskTypeName}</Text>
                </View>
                <Text style={[styles.emptySubText, { marginTop: -8, marginBottom: 12 }]}>Task type cannot be changed after creation.</Text>
              </>
            ) : null}
            <Text style={styles.modalLabel}>Materials (optional)</Text>
            {materials.length === 0 ? (
              <Text style={[styles.emptySubText, { marginBottom: 12 }]}>No materials available.</Text>
            ) : (
              <View style={styles.matList}>
                {materials.map((mat) => {
                  const sel = editMaterials.find((m) => m.materialId === mat.materialId);
                  return (
                    <View key={mat.materialId} style={styles.matRow}>
                      <TouchableOpacity
                        style={[styles.matChip, !!sel && styles.matChipSelected]}
                        onPress={() =>
                          setEditMaterials((prev) =>
                            prev.find((m) => m.materialId === mat.materialId)
                              ? prev.filter((m) => m.materialId !== mat.materialId)
                              : [...prev, { materialId: mat.materialId, usedQuantity: '1' }],
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matChipText, !!sel && styles.chipTextSelected]} numberOfLines={1}>
                          {mat.name} · {mat.amountType}
                        </Text>
                      </TouchableOpacity>
                      {sel ? (
                        <TextInput
                          style={styles.qtyInput}
                          value={sel.usedQuantity}
                          onChangeText={(v) =>
                            setEditMaterials((prev) =>
                              prev.map((m) => (m.materialId === mat.materialId ? { ...m, usedQuantity: v } : m)),
                            )
                          }
                          placeholder="1"
                          placeholderTextColor={GardenColors.textMuted}
                          keyboardType="decimal-pad"
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, saving && styles.btnDisabled]}
              onPress={handleEditSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#071108" /> : <Text style={styles.modalBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Task Questions modal — merged with create form view */}
      <Modal visible={showQuestionsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowQuestionsModal(false); setCreatingNewQuestion(false); setLightboxUrl(null); }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{creatingNewQuestion ? 'Ask a Question' : '❓ Questions'}</Text>
            <TouchableOpacity onPress={() => { if (creatingNewQuestion) { setCreatingNewQuestion(false); } else { setShowQuestionsModal(false); } }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {!creatingNewQuestion ? (
            <>
              {questionsTask ? (
                <View style={schedStyles.taskChip}>
                  <Text style={schedStyles.taskChipLabel}>Task</Text>
                  <Text style={schedStyles.taskChipName}>{questionsTask.name}</Text>
                  <Text style={schedStyles.taskChipJob}>{questionsTask.jobName}</Text>
                </View>
              ) : null}
              <ScrollView contentContainerStyle={[styles.modalBody, { paddingTop: 8 }]} showsVerticalScrollIndicator={false}>
                {questionsLoading ? (
                  <ActivityIndicator color={GardenColors.accent} style={{ marginVertical: 24 }} />
                ) : taskQuestions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No questions yet.</Text>
                    <Text style={styles.emptySubText}>Ask the client a question to clarify task details.</Text>
                  </View>
                ) : (
                  taskQuestions.map((q) => {
                    const answered = q.status === 'Answered';
                    return (
                      <View key={q.questionId} style={[qStyles.card, !answered && qStyles.cardPending]}>
                        <View style={qStyles.cardHeader}>
                          <View style={[qStyles.statusBadge, answered ? qStyles.badgeAnswered : qStyles.badgePending]}>
                            <Text style={qStyles.statusBadgeText}>{answered ? 'Answered' : 'Pending'}</Text>
                          </View>
                          <Text style={qStyles.cardMeta}>{new Date(q.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={qStyles.questionText}>{q.text}</Text>
                        {q.type === 'MultipleChoice' && q.options && q.options.length > 0 && (
                          <View style={qStyles.optionsContainer}>
                            {q.options.map((opt) => (
                              <View key={opt.optionId} style={qStyles.optionChip}>
                                <Text style={qStyles.optionChipText}>{opt.text}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {q.mediaUrls && q.mediaUrls.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={qStyles.mediaRow}>
                            {q.mediaUrls.map((url, i) => (
                              <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                                <Image source={{ uri: url }} style={qStyles.mediaThumbnail} />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                        {answered && q.answer && (
                          <View style={qStyles.answerBox}>
                            <Text style={qStyles.answerLabel}>
                              Client's answer{q.answer.answeredByName ? ` (${q.answer.answeredByName})` : ''}:
                            </Text>
                            <Text style={qStyles.answerText}>{q.answer.text}</Text>
                            {q.answer.mediaUrls && q.answer.mediaUrls.length > 0 && (
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={qStyles.mediaRow}>
                                {q.answer.mediaUrls.map((url, i) => (
                                  <TouchableOpacity key={i} onPress={() => setLightboxUrl(url)}>
                                    <Image source={{ uri: url }} style={qStyles.mediaThumbnail} />
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
                <TouchableOpacity style={[styles.modalBtn, { marginTop: 16 }]} onPress={openCreateQuestion} activeOpacity={0.85}>
                  <Text style={styles.modalBtnText}>+ Ask a Question</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Question Type</Text>
              <View style={styles.toggleRow}>
                {(['FreeText', 'MultipleChoice'] as QuestionType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, questionType === t && styles.toggleBtnActive]}
                    onPress={() => setQuestionType(t)}
                  >
                    <Text style={[styles.toggleBtnText, questionType === t && styles.toggleBtnTextActive]}>
                      {t === 'FreeText' ? 'Free Text' : 'Multiple Choice'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Question *</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                value={questionText}
                onChangeText={setQuestionText}
                placeholder="Ask the client..."
                placeholderTextColor={GardenColors.textMuted}
                multiline
                autoFocus
              />

              {questionType === 'MultipleChoice' && (
                <>
                  <Text style={styles.modalLabel}>Options (at least 2)</Text>
                  {questionOptions.map((opt, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={opt}
                        onChangeText={(v) => setQuestionOptions((prev) => prev.map((o, i) => (i === idx ? v : o)))}
                        placeholder={`Option ${idx + 1}`}
                        placeholderTextColor={GardenColors.textMuted}
                      />
                      {questionOptions.length > 2 && (
                        <TouchableOpacity onPress={() => setQuestionOptions((prev) => prev.filter((_, i) => i !== idx))}>
                          <Text style={{ color: GardenColors.error, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => setQuestionOptions((prev) => [...prev, ''])} style={{ marginTop: 4 }}>
                    <Text style={{ color: GardenColors.accent, fontSize: 13 }}>+ Add option</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.modalLabel}>Attach image (optional)</Text>
              <TouchableOpacity style={qStyles.mediaPickerBtn} onPress={pickQuestionMedia} activeOpacity={0.8}>
                <Text style={qStyles.mediaPickerBtnText}>📎 Add image</Text>
              </TouchableOpacity>
              {questionMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={qStyles.mediaRow}>
                  {questionMedia.map((m, i) => (
                    <View key={i} style={{ position: 'relative' }}>
                      <Image source={{ uri: m.mediaUrl }} style={qStyles.mediaThumbnail} />
                      <TouchableOpacity
                        style={qStyles.mediaRemoveBtn}
                        onPress={() => setQuestionMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={qStyles.mediaRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[styles.modalBtn, creatingQuestion && styles.btnDisabled]}
                onPress={handleCreateQuestion}
                disabled={creatingQuestion}
                activeOpacity={0.85}
              >
                {creatingQuestion ? <ActivityIndicator color="#071108" /> : <Text style={styles.modalBtnText}>Send Question</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}

          {lightboxUrl !== null && (
            <View style={qStyles.lightboxOverlay}>
              <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                maximumZoomScale={5}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image source={{ uri: lightboxUrl }} style={qStyles.lightboxImage} resizeMode="contain" />
              </ScrollView>
              <TouchableOpacity style={qStyles.lightboxClose} onPress={() => setLightboxUrl(null)}>
                <Text style={qStyles.lightboxCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function TaskCard({
  task, onStart, onFinish, onEdit, onDelete, onConfirmDelete, onCancelDelete, onSchedule, onOpenQuestions, confirmDeleteId, deleting, actionLoading,
}: {
  task: TaskWithJob;
  onStart?: (t: TaskWithJob) => void;
  onFinish?: (t: TaskWithJob) => void;
  onEdit: (t: TaskWithJob) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onSchedule?: (t: TaskWithJob) => void;
  onOpenQuestions: (t: TaskWithJob) => void;
  confirmDeleteId: string | null;
  deleting: boolean;
  actionLoading: string | null;
}) {
  const status = taskStatus(task);
  const isLoading = actionLoading === task.taskId;
  const statusColor = status === 'done' ? GardenColors.textMuted : status === 'in-progress' ? GardenColors.success : GardenColors.warning;

  return (
    <View style={tcStyles.card}>
      {/* Info area */}
      <View style={tcStyles.top}>
        <View style={tcStyles.info}>
          <Text style={tcStyles.name} numberOfLines={2}>{task.name}</Text>
          <Text style={tcStyles.job}>{task.jobName}</Text>
        </View>
        <View style={[tcStyles.statusDot, { backgroundColor: statusColor }]} />
      </View>
      {task.description ? <Text style={tcStyles.desc} numberOfLines={2}>{task.description}</Text> : null}

      {/* Start / Finish row */}
      {status !== 'done' && (onStart || onFinish) && (
        <View style={tcStyles.progressActions}>
          {status === 'pending' && onStart && (
            <TouchableOpacity
              style={tcStyles.startBtn}
              onPress={() => onStart(task)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator color="#071108" size="small" /> : <Text style={tcStyles.startBtnText}>▶ Start</Text>}
            </TouchableOpacity>
          )}
          {status === 'in-progress' && onFinish && (
            <TouchableOpacity
              style={tcStyles.finishBtn}
              onPress={() => onFinish(task)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator color="#071108" size="small" /> : <Text style={tcStyles.finishBtnText}>✓ Mark Done</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Edit / Delete row — icon buttons */}
      {confirmDeleteId === task.taskId ? (
        <View style={tcStyles.confirmRow}>
          <Text style={tcStyles.confirmText}>Delete this task?</Text>
          <View style={tcStyles.actionRow}>
            <TouchableOpacity style={tcStyles.actionBtn} onPress={onCancelDelete} disabled={deleting}>
              <Text style={tcStyles.actionEdit}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tcStyles.actionBtn, tcStyles.actionBtnDanger]} onPress={() => onConfirmDelete(task.taskId)} disabled={deleting}>
              {deleting ? <ActivityIndicator size={12} color={GardenColors.error} /> : <Text style={tcStyles.actionDelete}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={tcStyles.actionRow}>
          {onSchedule ? (
            <TouchableOpacity style={tcStyles.iconBtn} onPress={() => onSchedule(task)}>
              <Ionicons name="calendar-outline" size={16} color={GardenColors.accent} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={tcStyles.iconBtn} onPress={() => onOpenQuestions(task)}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#facc15" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={tcStyles.iconBtn} onPress={() => onEdit(task)}>
            <Ionicons name="pencil-outline" size={16} color={GardenColors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[tcStyles.iconBtn, tcStyles.iconBtnDanger]} onPress={() => onDelete(task.taskId)}>
            <Ionicons name="trash-outline" size={16} color={GardenColors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  topBarLeft: { flex: 1, gap: 2 },
  backBtn: { marginBottom: 2 },
  backBtnText: { fontSize: 13, color: GardenColors.accent },
  title: { fontSize: 22, fontWeight: '700', color: GardenColors.textPrimary },
  registerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: GardenColors.accent, marginTop: 4 },
  registerBtnText: { fontSize: 13, fontWeight: '700', color: '#071108' },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary, marginBottom: 10 },
  list: { gap: 10 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 28, alignItems: 'center', gap: 8,
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubText: { color: GardenColors.textMuted, fontSize: 12, textAlign: 'center', opacity: 0.7 },
  // Modal
  modal: { flex: 1, backgroundColor: GardenColors.bgRoot, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: GardenColors.textPrimary },
  modalClose: { fontSize: 20, color: GardenColors.textMuted, padding: 4 },
  modalHint: { fontSize: 13, color: GardenColors.textMuted, paddingHorizontal: 20, marginBottom: 8 },
  modalBody: { padding: 20, gap: 8, paddingBottom: 40 },
  modalLabel: { fontSize: 13, color: 'rgba(247, 248, 244, 0.9)', marginTop: 8 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
    maxWidth: 200,
  },
  chipSelected: { backgroundColor: 'rgba(217, 255, 106, 0.15)', borderColor: 'rgba(217, 255, 106, 0.5)' },
  chipText: { fontSize: 13, color: GardenColors.textMuted },
  chipTextSelected: { color: GardenColors.accent, fontWeight: '600' },
  modalInput: {
    height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)', backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 14, color: GardenColors.textPrimary, fontSize: 14,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center',
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  toggleBtnActive: { backgroundColor: 'rgba(217, 255, 106, 0.12)', borderColor: 'rgba(217, 255, 106, 0.4)' },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: GardenColors.textMuted },
  toggleBtnTextActive: { color: GardenColors.accent },
  matList: { gap: 6, marginTop: 4 },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matChip: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  matChipSelected: { backgroundColor: 'rgba(217, 255, 106, 0.15)', borderColor: 'rgba(217, 255, 106, 0.5)' },
  matChipText: { fontSize: 13, color: GardenColors.textMuted },
  qtyInput: {
    width: 72, height: 42, borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)', backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 10, color: GardenColors.textPrimary, fontSize: 13, textAlign: 'center',
  },
  modalBtn: {
    height: 52, borderRadius: 999, backgroundColor: GardenColors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.65 },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#071108' },
});

const tcStyles = StyleSheet.create({
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 14, gap: 6,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary },
  job: { fontSize: 12, color: GardenColors.textMuted },
  statusDot: { width: 9, height: 9, borderRadius: 999, marginTop: 4 },
  desc: { fontSize: 12, color: GardenColors.textMuted, lineHeight: 18 },
  progressActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  startBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(74, 222, 128, 0.18)',
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  startBtnText: { fontSize: 13, fontWeight: '600', color: GardenColors.success },
  finishBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: GardenColors.accent,
  },
  finishBtnText: { fontSize: 13, fontWeight: '700', color: '#071108' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: GardenColors.cardBorder, paddingTop: 8 },
  confirmRow: { marginTop: 4, borderTopWidth: 1, borderTopColor: GardenColors.cardBorder, paddingTop: 8, gap: 6 },
  confirmText: { fontSize: 12, color: GardenColors.textMuted },
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  actionBtnDanger: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
  actionEdit: { fontSize: 12, fontWeight: '600', color: GardenColors.textPrimary },
  actionDelete: { fontSize: 12, fontWeight: '600', color: GardenColors.error },
  actionSchedule: { fontSize: 12, fontWeight: '600', color: GardenColors.accent },
  actionQuestions: { fontSize: 12, fontWeight: '600', color: '#facc15' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    backgroundColor: GardenColors.cardBg,
  },
  iconBtnDanger: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
});

const schedStyles = StyleSheet.create({
  taskChip: {
    backgroundColor: 'rgba(217, 255, 106, 0.07)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.2)',
    padding: 12, gap: 2, marginBottom: 8,
  },
  taskChipLabel: { fontSize: 10, fontWeight: '600', color: GardenColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskChipName: { fontSize: 15, fontWeight: '700', color: GardenColors.textPrimary },
  taskChipJob: { fontSize: 12, color: GardenColors.textMuted },
  error: { color: '#fecaca', fontSize: 13, marginTop: 8 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)', backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 14,
  },
  pickerBtnText: { fontSize: 14, color: GardenColors.textPrimary },
  pickerBtnIcon: { fontSize: 16 },
});

const qStyles = StyleSheet.create({
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 14,
    borderWidth: 1, borderColor: GardenColors.cardBorder, padding: 14, gap: 8, marginBottom: 10,
  },
  cardPending: { borderColor: 'rgba(250, 204, 21, 0.4)', backgroundColor: 'rgba(250, 204, 21, 0.04)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgePending: { backgroundColor: 'rgba(250, 204, 21, 0.15)', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.4)' },
  badgeAnswered: { backgroundColor: 'rgba(74, 222, 128, 0.12)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: GardenColors.textPrimary },
  cardMeta: { fontSize: 11, color: GardenColors.textMuted },
  questionText: { fontSize: 14, color: GardenColors.textPrimary, lineHeight: 20 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  optionChipText: { fontSize: 12, color: GardenColors.textMuted },
  mediaRow: { marginTop: 4 },
  mediaThumbnail: { width: 72, height: 72, borderRadius: 8, marginRight: 8, backgroundColor: GardenColors.cardBorder },
  answerBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)', padding: 10, gap: 4,
  },
  answerLabel: { fontSize: 11, color: GardenColors.textMuted, fontWeight: '600' },
  answerText: { fontSize: 13, color: GardenColors.textPrimary },
  deleteBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: GardenColors.error },
  mediaPickerBtn: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: GardenColors.cardBorder,
    backgroundColor: GardenColors.cardBg, alignItems: 'center', justifyContent: 'center',
  },
  mediaPickerBtnText: { fontSize: 13, color: GardenColors.textMuted },
  mediaRemoveBtn: {
    position: 'absolute', top: 2, right: 10, width: 18, height: 18, borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  mediaRemoveBtnText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  lightboxOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 200,
  },
  lightboxImage: { width: SCREEN_W, height: SCREEN_H * 0.78 },
  lightboxClose: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 201,
  },
  lightboxCloseText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});

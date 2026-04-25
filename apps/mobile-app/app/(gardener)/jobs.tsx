import InvoiceViewer from '@/components/invoice-viewer';
import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    createGardenerJob, deleteGardenerJob, getGardenerClients,
    getGardenerJobs, updateGardenerJob, type GardenerClientDto, type JobDto,
} from '@/services/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
    StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

type Filter = 'all' | 'active' | 'closed';

export default function GardenerJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [clients, setClients] = useState<GardenerClientDto[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobDto | null>(null);
  const [jobName, setJobName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceJobId, setInvoiceJobId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [jobsRes, clientsRes] = await Promise.all([
        getGardenerJobs(token, 1, 100),
        getGardenerClients(token, 1, 100),
      ]);
      setJobs(jobsRes.items);
      setClients(clientsRes.items);
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

  function openCreate() {
    setEditingJob(null);
    setJobName('');
    setSelectedClientId('');
    setShowModal(true);
  }

  function openEdit(job: JobDto) {
    setEditingJob(job);
    setJobName(job.name);
    setShowModal(true);
  }

  function openInvoice(jobId: string, invoiceNum?: string) {
    setInvoiceJobId(jobId);
    setInvoiceNumber(invoiceNum);
    setShowInvoice(true);
  }

  async function handleSave() {
    if (!token || !jobName.trim()) {
      Alert.alert('Missing info', 'Please enter a job name.');
      return;
    }
    setSaving(true);
    try {
      if (editingJob) {
        const updated = await updateGardenerJob(token, editingJob.jobId, {
          name: jobName.trim(),
        });
        setJobs((prev) => prev.map((j) => j.jobId === updated.jobId ? { ...j, ...updated } : j));
      } else {
        const created = await createGardenerJob(token, {
          name: jobName.trim(),
          clientId: selectedClientId || undefined,
        });
        setJobs((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save job');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(jobId: string) {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteGardenerJob(token, jobId);
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = jobs.filter((j) => {
    if (filter === 'active') return !j.isClosed;
    if (filter === 'closed') return j.isClosed;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'all', label: 'All' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>Jobs</Text>
        <TouchableOpacity style={styles.newBtn} onPress={openCreate} activeOpacity={0.8}>
          <Text style={styles.newBtnText}>+ New Job</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} jobs found.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((job) => {
                const progress = job.progressPercent ?? 0;
                const isClosed = job.isClosed ?? false;
                return (
                  <View key={job.jobId} style={styles.card}>
                    {/* Tappable area navigates to tasks */}
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(gardener)/tasks', params: { jobId: job.jobId } })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.cardTop}>
                        <Text style={styles.jobName} numberOfLines={2}>{job.name}</Text>
                        <View style={[styles.statusPill, isClosed ? styles.statusClosed : styles.statusActive]}>
                          <View style={[styles.statusDot, { backgroundColor: isClosed ? GardenColors.textMuted : GardenColors.success }]} />
                          <Text style={[styles.statusText, { color: isClosed ? GardenColors.textMuted : GardenColors.success }]}>
                            {isClosed ? 'Closed' : 'Active'}
                          </Text>
                        </View>
                      </View>

                      {job.client ? (
                        <Text style={styles.clientText}>Client: {job.client.name}</Text>
                      ) : null}

                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{job.taskCount ?? 0} tasks</Text>
                        <Text style={styles.metaText}>{job.finishedTaskCount ?? 0} done</Text>
                        {(job.inProgressTaskCount ?? 0) > 0 && (
                          <Text style={styles.metaText}>{job.inProgressTaskCount} in progress</Text>
                        )}
                      </View>

                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                        </View>
                        <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Action row — outside the nav TouchableOpacity so buttons work */}
                    {confirmDeleteId === job.jobId ? (
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmText}>Delete this job?</Text>
                        <View style={styles.actions}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => setConfirmDeleteId(null)} disabled={deleting}>
                            <Text style={styles.actionEdit}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(job.jobId)} disabled={deleting}>
                            {deleting ? <ActivityIndicator size={12} color={GardenColors.error} /> : <Text style={styles.actionDelete}>Confirm</Text>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actionRow}>
                        <Text style={styles.tapHint}>View tasks</Text>
                        <View style={styles.actions}>
                          {isClosed && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => openInvoice(job.jobId, job.jobId)}>
                              <Text style={styles.actionInvoice}>Invoice</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(job)}>
                            <Text style={styles.actionEdit}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => setConfirmDeleteId(job.jobId)}>
                            <Text style={styles.actionDelete}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingJob ? 'Edit Job' : 'New Job'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Job Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={jobName}
              onChangeText={setJobName}
              placeholder="e.g. Spring garden cleanup"
              placeholderTextColor={GardenColors.textMuted}
              autoFocus
            />

            {!editingJob ? (
              <>
                <Text style={styles.modalLabel}>Assign Client</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !selectedClientId && styles.chipSelected]}
                    onPress={() => setSelectedClientId('')}
                  >
                    <Text style={[styles.chipText, !selectedClientId && styles.chipTextSelected]}>None</Text>
                  </TouchableOpacity>
                  {clients.map((c) => (
                    <TouchableOpacity
                      key={c.clientId}
                      style={[styles.chip, selectedClientId === c.clientId && styles.chipSelected]}
                      onPress={() => setSelectedClientId(c.clientId)}
                    >
                      <Text style={[styles.chipText, selectedClientId === c.clientId && styles.chipTextSelected]} numberOfLines={1}>
                        {c.fullName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#071108" />
              ) : (
                <Text style={styles.saveBtnText}>{editingJob ? 'Save Changes' : 'Create Job'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Invoice Viewer */}
      {invoiceJobId && token && (
        <InvoiceViewer
          visible={showInvoice}
          jobId={invoiceJobId}
          invoiceNumber={invoiceNumber}
          token={token}
          isGardener
          onClose={() => setShowInvoice(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: GardenColors.accent },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#071108' },
  filtersScroll: { marginBottom: 4, flexGrow: 0 },
  filtersRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  pillActive: { backgroundColor: 'rgba(217, 255, 106, 0.12)', borderColor: 'rgba(217, 255, 106, 0.4)' },
  pillText: { fontSize: 13, color: GardenColors.textMuted },
  pillTextActive: { color: GardenColors.accent, fontWeight: '600' },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  list: { gap: 12 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder, padding: 28, alignItems: 'center',
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14 },
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
  clientText: { fontSize: 13, color: GardenColors.textMuted },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: GardenColors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressFill: { height: 4, borderRadius: 999, backgroundColor: GardenColors.accent },
  progressPct: { fontSize: 11, color: GardenColors.textMuted, minWidth: 32, textAlign: 'right' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  tapHint: { fontSize: 11, color: 'rgba(217, 255, 106, 0.45)' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: GardenColors.cardBorder, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  actionEdit: { fontSize: 12, color: GardenColors.textPrimary, fontWeight: '500' },
  actionDelete: { fontSize: 12, color: GardenColors.error, fontWeight: '500' },
  actionInvoice: { fontSize: 12, color: GardenColors.accent, fontWeight: '500' },
  actionBtnDanger: { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  confirmText: { fontSize: 12, color: GardenColors.error },
  // Modal
  modal: { flex: 1, backgroundColor: GardenColors.bgRoot, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: GardenColors.textPrimary },
  modalClose: { fontSize: 20, color: GardenColors.textMuted, padding: 4 },
  modalBody: { padding: 20, gap: 8, paddingBottom: 40 },
  modalLabel: { fontSize: 13, color: 'rgba(247, 248, 244, 0.9)', marginTop: 8 },
  modalInput: {
    height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)', backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 14, color: GardenColors.textPrimary, fontSize: 14,
  },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder, maxWidth: 200,
  },
  chipSelected: { backgroundColor: 'rgba(217, 255, 106, 0.15)', borderColor: 'rgba(217, 255, 106, 0.5)' },
  chipText: { fontSize: 13, color: GardenColors.textMuted },
  chipTextSelected: { color: GardenColors.accent, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center',
    backgroundColor: GardenColors.cardBg, borderWidth: 1, borderColor: GardenColors.cardBorder,
  },
  toggleActive: { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderColor: 'rgba(74, 222, 128, 0.4)' },
  toggleClosed: { backgroundColor: 'rgba(192, 199, 184, 0.1)', borderColor: 'rgba(192, 199, 184, 0.3)' },
  toggleText: { fontSize: 13, fontWeight: '600', color: GardenColors.textMuted },
  toggleTextActive: { color: GardenColors.success },
  saveBtn: {
    height: 52, borderRadius: 999, backgroundColor: GardenColors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#071108' },
});

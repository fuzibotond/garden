import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    approveSchedule,
    declineSchedule,
    getClientCalendar,
    proposeAlternativeTime,
    type TaskScheduleDto,
} from '@/services/api';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ScheduleStatus = TaskScheduleDto['status'];

function statusLabel(s: ScheduleStatus): string {
  switch (s) {
    case 'Pending': return 'Awaiting your response';
    case 'Approved': return 'Confirmed';
    case 'Declined': return 'Declined';
    case 'ProposedAlternative': return 'You proposed another time';
    case 'Rescheduled': return 'Rescheduled';
    default: return s;
  }
}

function statusColor(s: ScheduleStatus): string {
  switch (s) {
    case 'Pending': return GardenColors.warning;
    case 'Approved': return GardenColors.success;
    case 'Declined': return GardenColors.error;
    case 'ProposedAlternative': return '#60a5fa';
    case 'Rescheduled': return GardenColors.success;
    default: return GardenColors.textMuted;
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ClientSchedule() {
  const { token } = useAuth();
  const [items, setItems] = useState<TaskScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Propose alternative time modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposingItem, setProposingItem] = useState<TaskScheduleDto | null>(null);
  const [proposeDateTime, setProposeDateTime] = useState<Date>(new Date());
  const [showProposeDatePicker, setShowProposeDatePicker] = useState(false);
  const [showProposeTimePicker, setShowProposeTimePicker] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getClientCalendar(token, 1, 100);
      const sorted = [...(res.scheduledTasks ?? [])].sort(
        (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
      );
      setItems(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
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

  async function handleApprove(item: TaskScheduleDto) {
    if (!token) return;
    setActionLoading(item.scheduleRequestId);
    try {
      await approveSchedule(token, item.scheduleRequestId);
      setItems((prev) =>
        prev.map((i) =>
          i.scheduleRequestId === item.scheduleRequestId
            ? { ...i, status: 'Approved', approvedAtUtc: new Date().toISOString() }
            : i,
        ),
      );
      Alert.alert('Appointment confirmed ✅', 'Your gardener has been notified.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(item: TaskScheduleDto) {
    Alert.alert(
      'Decline appointment?',
      `Decline the appointment for "${item.taskName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setActionLoading(item.scheduleRequestId);
            try {
              await declineSchedule(token, item.scheduleRequestId);
              setItems((prev) =>
                prev.map((i) =>
                  i.scheduleRequestId === item.scheduleRequestId
                    ? { ...i, status: 'Declined', declinedAtUtc: new Date().toISOString() }
                    : i,
                ),
              );
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to decline');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }

  function openProposeModal(item: TaskScheduleDto) {
    setProposingItem(item);
    setProposeDateTime(new Date());
    setProposeError(null);
    setShowProposeModal(true);
  }

  async function handleProposeSubmit() {
    if (!token || !proposingItem) return;
    const iso = proposeDateTime.toISOString();
    setProposing(true);
    setProposeError(null);
    try {
      await proposeAlternativeTime(token, proposingItem.scheduleRequestId, iso);
      setItems((prev) =>
        prev.map((i) =>
          i.scheduleRequestId === proposingItem.scheduleRequestId
            ? { ...i, status: 'ProposedAlternative', proposedAtUtc: iso }
            : i,
        ),
      );
      setShowProposeModal(false);
      Alert.alert('Proposal sent ✅', 'Your gardener will review your suggested time.');
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : 'Failed to send proposal');
    } finally {
      setProposing(false);
    }
  }

  const pending = items.filter((i) => i.status === 'Pending');
  const myProposals = items.filter((i) => i.status === 'ProposedAlternative');
  const confirmed = items.filter((i) => i.status === 'Approved' || i.status === 'Rescheduled');
  const declined = items.filter((i) => i.status === 'Declined');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>Manage your appointment requests</Text>
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

          {pending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📋 Awaiting Your Response ({pending.length})</Text>
              <View style={styles.list}>
                {pending.map((item) => (
                  <ScheduleCard
                    key={item.scheduleRequestId}
                    item={item}
                    actionLoading={actionLoading}
                    onApprove={() => handleApprove(item)}
                    onDecline={() => handleDecline(item)}
                    onPropose={() => openProposeModal(item)}
                  />
                ))}
              </View>
            </>
          )}

          {myProposals.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, pending.length > 0 ? { marginTop: 20 } : undefined]}>
                💬 Your Proposals ({myProposals.length})
              </Text>
              <View style={styles.list}>
                {myProposals.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} actionLoading={actionLoading} />
                ))}
              </View>
            </>
          )}

          {confirmed.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>✅ Confirmed ({confirmed.length})</Text>
              <View style={styles.list}>
                {confirmed.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} actionLoading={actionLoading} />
                ))}
              </View>
            </>
          )}

          {declined.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>❌ Declined ({declined.length})</Text>
              <View style={styles.list}>
                {declined.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} actionLoading={actionLoading} faded />
                ))}
              </View>
            </>
          )}

          {items.length === 0 && !error && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No appointment requests yet.</Text>
              <Text style={styles.emptySubText}>
                Your gardener will send you appointment requests here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showProposeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProposeModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propose Another Time</Text>
            <TouchableOpacity onPress={() => setShowProposeModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>
            Suggest an alternative appointment time for your gardener to review.
          </Text>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {proposingItem ? (
              <View style={styles.taskChip}>
                <Text style={styles.taskChipLabel}>Task</Text>
                <Text style={styles.taskChipName}>{proposingItem.taskName}</Text>
                <Text style={styles.taskChipSub}>
                  Gardener proposed: {formatDateTime(proposingItem.scheduledAtUtc)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Your preferred date</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowProposeDatePicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>
                {proposeDateTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.pickerBtnIcon}>📅</Text>
            </TouchableOpacity>
            {showProposeDatePicker && (
              <DateTimePicker
                value={proposeDateTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowProposeDatePicker(false);
                  if (date) setProposeDateTime((prev) => {
                    const next = new Date(date);
                    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Your preferred time</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowProposeTimePicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>
                {proposeDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.pickerBtnIcon}>⏰</Text>
            </TouchableOpacity>
            {showProposeTimePicker && (
              <DateTimePicker
                value={proposeDateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowProposeTimePicker(false);
                  if (date) setProposeDateTime((prev) => {
                    const next = new Date(prev);
                    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            {proposeError ? <Text style={styles.errorText}>{proposeError}</Text> : null}

            <TouchableOpacity
              style={[styles.modalBtn, proposing && styles.btnDisabled]}
              onPress={handleProposeSubmit}
              disabled={proposing}
              activeOpacity={0.85}
            >
              {proposing ? (
                <ActivityIndicator color="#071108" />
              ) : (
                <Text style={styles.modalBtnText}>Send Proposal</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ScheduleCard({
  item,
  actionLoading,
  onApprove,
  onDecline,
  onPropose,
  faded = false,
}: {
  item: TaskScheduleDto;
  actionLoading: string | null;
  onApprove?: () => void;
  onDecline?: () => void;
  onPropose?: () => void;
  faded?: boolean;
}) {
  const sColor = statusColor(item.status);
  const sLabel = statusLabel(item.status);
  const isLoading = actionLoading === item.scheduleRequestId;

  return (
    <View style={[cardStyles.card, faded && cardStyles.faded]}>
      <View style={cardStyles.topRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={cardStyles.taskName} numberOfLines={2}>{item.taskName}</Text>
          <Text style={cardStyles.gardenerName}>Gardener: {item.gardenerName}</Text>
        </View>
        <View style={[cardStyles.pill, { borderColor: sColor + '50' }]}>
          <Text style={[cardStyles.pillText, { color: sColor }]}>{sLabel}</Text>
        </View>
      </View>

      <View style={cardStyles.row}>
        <Text style={cardStyles.label}>Proposed</Text>
        <Text style={cardStyles.value}>{formatDateTime(item.scheduledAtUtc)}</Text>
      </View>

      {item.proposedAtUtc ? (
        <View style={cardStyles.row}>
          <Text style={cardStyles.label}>Your time</Text>
          <Text style={[cardStyles.value, { color: '#60a5fa' }]}>{formatDateTime(item.proposedAtUtc)}</Text>
        </View>
      ) : null}

      {item.approvedAtUtc ? (
        <View style={cardStyles.row}>
          <Text style={cardStyles.label}>Confirmed</Text>
          <Text style={[cardStyles.value, { color: GardenColors.success }]}>{formatDateTime(item.approvedAtUtc)}</Text>
        </View>
      ) : null}

      {item.declinedAtUtc ? (
        <View style={cardStyles.row}>
          <Text style={cardStyles.label}>Declined</Text>
          <Text style={[cardStyles.value, { color: GardenColors.error }]}>{formatDateTime(item.declinedAtUtc)}</Text>
        </View>
      ) : null}

      {item.status === 'Pending' && (onApprove ?? onDecline ?? onPropose) ? (
        <View style={cardStyles.actionRow}>
          <TouchableOpacity
            style={[cardStyles.actionBtn, cardStyles.approveBtn]}
            onPress={onApprove}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size={12} color="#071108" />
            ) : (
              <Text style={cardStyles.approveBtnText}>✓ Accept</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.actionBtn, cardStyles.proposeBtn]}
            onPress={onPropose}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={cardStyles.proposeBtnText}>📅 Other time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.actionBtn, cardStyles.declineBtn]}
            onPress={onDecline}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={cardStyles.declineBtnText}>✕ Decline</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  sub: { fontSize: 13, color: GardenColors.textMuted, marginTop: 2 },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary, marginBottom: 10 },
  list: { gap: 10 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 28, alignItems: 'center', gap: 8,
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubText: { color: GardenColors.textMuted, fontSize: 12, textAlign: 'center', opacity: 0.7 },
  modal: { flex: 1, backgroundColor: GardenColors.bgRoot, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: GardenColors.textPrimary },
  modalClose: { fontSize: 20, color: GardenColors.textMuted, padding: 4 },
  modalHint: { fontSize: 13, color: GardenColors.textMuted, paddingHorizontal: 20, marginBottom: 8 },
  modalBody: { padding: 20, gap: 8, paddingBottom: 40 },
  modalLabel: { fontSize: 13, color: 'rgba(247, 248, 244, 0.9)', marginTop: 8 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)', backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 14,
  },
  pickerBtnText: { fontSize: 14, color: GardenColors.textPrimary },
  pickerBtnIcon: { fontSize: 16 },
  taskChip: {
    backgroundColor: 'rgba(217, 255, 106, 0.07)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.2)',
    padding: 12, gap: 2, marginBottom: 8,
  },
  taskChipLabel: { fontSize: 10, fontWeight: '600', color: GardenColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskChipName: { fontSize: 15, fontWeight: '700', color: GardenColors.textPrimary },
  taskChipSub: { fontSize: 12, color: GardenColors.textMuted },
  modalBtn: {
    height: 52, borderRadius: 999, backgroundColor: GardenColors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.65 },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#071108' },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 14, gap: 8,
  },
  faded: { opacity: 0.6 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  taskName: { fontSize: 14, fontWeight: '700', color: GardenColors.textPrimary },
  gardenerName: { fontSize: 12, color: GardenColors.textMuted },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  label: { fontSize: 11, color: GardenColors.textMuted, minWidth: 72 },
  value: { fontSize: 12, color: GardenColors.textPrimary, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.35)' },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: GardenColors.success },
  proposeBtn: { backgroundColor: 'rgba(96,165,250,0.10)', borderColor: 'rgba(96,165,250,0.3)' },
  proposeBtnText: { fontSize: 12, fontWeight: '600', color: '#60a5fa' },
  declineBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' },
  declineBtnText: { fontSize: 12, fontWeight: '600', color: GardenColors.error },
});

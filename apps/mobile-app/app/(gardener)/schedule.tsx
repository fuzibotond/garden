import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    getGardenerCalendar,
    rescheduleTask,
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
    case 'Pending': return 'Awaiting client';
    case 'Approved': return 'Confirmed';
    case 'Declined': return 'Declined';
    case 'ProposedAlternative': return 'Client proposed new time';
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

export default function GardenerSchedule() {
  const { token } = useAuth();
  const [items, setItems] = useState<TaskScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reschedule modal (for when client proposed an alternative time)
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedulingItem, setReschedulingItem] = useState<TaskScheduleDto | null>(null);
  const [reschedDateTime, setReschedDateTime] = useState<Date>(new Date());
  const [showReschedDatePicker, setShowReschedDatePicker] = useState(false);
  const [showReschedTimePicker, setShowReschedTimePicker] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedError, setReschedError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getGardenerCalendar(token, 1, 100);
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

  function openReschedule(item: TaskScheduleDto) {
    setReschedulingItem(item);
    // Pre-fill with client's proposed time
    const initial = item.proposedAtUtc ? new Date(item.proposedAtUtc) : new Date();
    setReschedDateTime(initial);
    setReschedError(null);
    setShowReschedule(true);
  }

  async function handleRescheduleSubmit() {
    if (!token || !reschedulingItem) return;
    const iso = reschedDateTime.toISOString();
    setRescheduling(true);
    setReschedError(null);
    try {
      await rescheduleTask(token, reschedulingItem.scheduleRequestId, iso);
      setShowReschedule(false);
      setItems((prev) =>
        prev.map((i) =>
          i.scheduleRequestId === reschedulingItem.scheduleRequestId
            ? { ...i, status: 'Rescheduled', scheduledAtUtc: iso }
            : i,
        ),
      );
      Alert.alert('Rescheduled ✅', 'The task has been rescheduled.');
    } catch (err) {
      setReschedError(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  }

  const pending = items.filter((i) => i.status === 'Pending');
  const proposals = items.filter((i) => i.status === 'ProposedAlternative');
  const confirmed = items.filter((i) => i.status === 'Approved' || i.status === 'Rescheduled');
  const declined = items.filter((i) => i.status === 'Declined');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>Track appointment requests</Text>
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

          {proposals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>💬 Client Proposals ({proposals.length})</Text>
              <View style={styles.list}>
                {proposals.map((item) => (
                  <ScheduleCard
                    key={item.scheduleRequestId}
                    item={item}
                    onAcceptProposal={() => openReschedule(item)}
                  />
                ))}
              </View>
            </>
          )}

          {pending.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, proposals.length > 0 ? { marginTop: 20 } : undefined]}>
                ⏳ Pending ({pending.length})
              </Text>
              <View style={styles.list}>
                {pending.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} />
                ))}
              </View>
            </>
          )}

          {confirmed.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>✅ Confirmed ({confirmed.length})</Text>
              <View style={styles.list}>
                {confirmed.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} />
                ))}
              </View>
            </>
          )}

          {declined.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>❌ Declined ({declined.length})</Text>
              <View style={styles.list}>
                {declined.map((item) => (
                  <ScheduleCard key={item.scheduleRequestId} item={item} faded />
                ))}
              </View>
            </>
          )}

          {items.length === 0 && !error && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No schedule requests yet.</Text>
              <Text style={styles.emptySubText}>
                Use the Tasks tab to send an appointment request to a client.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Reschedule modal */}
      <Modal
        visible={showReschedule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReschedule(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm New Time</Text>
            <TouchableOpacity onPress={() => setShowReschedule(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>
            Accept the client's proposed time or adjust it before confirming.
          </Text>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {reschedulingItem?.proposedAtUtc ? (
              <View style={styles.proposalBox}>
                <Text style={styles.proposalLabel}>Client proposed</Text>
                <Text style={styles.proposalDate}>{formatDateTime(reschedulingItem.proposedAtUtc)}</Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Date</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowReschedDatePicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>
                {reschedDateTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.pickerBtnIcon}>📅</Text>
            </TouchableOpacity>
            {showReschedDatePicker && (
              <DateTimePicker
                value={reschedDateTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowReschedDatePicker(false);
                  if (date) setReschedDateTime((prev) => {
                    const next = new Date(date);
                    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Time</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowReschedTimePicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerBtnText}>
                {reschedDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.pickerBtnIcon}>⏰</Text>
            </TouchableOpacity>
            {showReschedTimePicker && (
              <DateTimePicker
                value={reschedDateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowReschedTimePicker(false);
                  if (date) setReschedDateTime((prev) => {
                    const next = new Date(prev);
                    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    return next;
                  });
                }}
              />
            )}

            {reschedError ? <Text style={styles.errorText}>{reschedError}</Text> : null}

            <TouchableOpacity
              style={[styles.modalBtn, rescheduling && styles.btnDisabled]}
              onPress={handleRescheduleSubmit}
              disabled={rescheduling}
              activeOpacity={0.85}
            >
              {rescheduling ? (
                <ActivityIndicator color="#071108" />
              ) : (
                <Text style={styles.modalBtnText}>Confirm Appointment</Text>
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
  onAcceptProposal,
  faded = false,
}: {
  item: TaskScheduleDto;
  onAcceptProposal?: () => void;
  faded?: boolean;
}) {
  const sColor = statusColor(item.status);
  const sLabel = statusLabel(item.status);

  return (
    <View style={[cardStyles.card, faded && cardStyles.faded]}>
      <View style={cardStyles.topRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={cardStyles.taskName} numberOfLines={2}>{item.taskName}</Text>
          <Text style={cardStyles.clientName}>Client: {item.clientName}</Text>
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
          <Text style={cardStyles.label}>Client's time</Text>
          <Text style={[cardStyles.value, { color: '#60a5fa' }]}>{formatDateTime(item.proposedAtUtc)}</Text>
        </View>
      ) : null}

      {item.approvedAtUtc ? (
        <View style={cardStyles.row}>
          <Text style={cardStyles.label}>Approved</Text>
          <Text style={[cardStyles.value, { color: GardenColors.success }]}>{formatDateTime(item.approvedAtUtc)}</Text>
        </View>
      ) : null}

      {item.declinedAtUtc ? (
        <View style={cardStyles.row}>
          <Text style={cardStyles.label}>Declined</Text>
          <Text style={[cardStyles.value, { color: GardenColors.error }]}>{formatDateTime(item.declinedAtUtc)}</Text>
        </View>
      ) : null}

      {item.status === 'ProposedAlternative' && onAcceptProposal ? (
        <TouchableOpacity style={cardStyles.acceptBtn} onPress={onAcceptProposal} activeOpacity={0.8}>
          <Text style={cardStyles.acceptBtnText}>📅 Review & Confirm</Text>
        </TouchableOpacity>
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
  proposalBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.25)',
    padding: 12, gap: 2, marginBottom: 8,
  },
  proposalLabel: { fontSize: 10, fontWeight: '600', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.5 },
  proposalDate: { fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary },
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
  clientName: { fontSize: 12, color: GardenColors.textMuted },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  label: { fontSize: 11, color: GardenColors.textMuted, minWidth: 80 },
  value: { fontSize: 12, color: GardenColors.textPrimary, flex: 1 },
  acceptBtn: {
    backgroundColor: 'rgba(96, 165, 250, 0.12)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)',
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#60a5fa' },
});

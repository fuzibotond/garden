import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getClientJobs, getClientJobTasks, type JobDto, type TaskDto } from '@/services/api';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView,
    StatusBar, StyleSheet, Text, View,
} from 'react-native';

type JobWithStats = JobDto & { done: number; total: number };

export default function ClientHome() {
  const { profile, token } = useAuth();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getClientJobs(token, 1, 50);
      const withStats: JobWithStats[] = await Promise.all(
        res.items.map(async (j) => {
          try {
            const tasks = await getClientJobTasks(token, j.jobId, 1, 100);
            const done = tasks.items.filter((t: TaskDto) => !!t.finishedAt).length;
            return { ...j, done, total: tasks.items.length };
          } catch {
            return { ...j, done: 0, total: 0 };
          }
        }),
      );
      setJobs(withStats);
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

  const activeJobs = jobs.filter((j) => !j.isClosed);
  const doneJobs = jobs.filter((j) => j.isClosed);
  const totalTasks = jobs.reduce((s, j) => s + j.total, 0);
  const finishedTasks = jobs.reduce((s, j) => s + j.done, 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GardenColors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {profile?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.sub}>Here's your garden progress</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Active Jobs" value={activeJobs.length} color={GardenColors.accent} />
          <StatCard label="Completed" value={doneJobs.length} color={GardenColors.success} />
          <StatCard label="Tasks Done" value={`${finishedTasks}/${totalTasks}`} color={GardenColors.warning} />
        </View>

        {loading ? (
          <ActivityIndicator color={GardenColors.accent} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {activeJobs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Active Jobs</Text>
                <View style={styles.list}>
                  {activeJobs.map((job) => (
                    <JobProgressCard key={job.jobId} job={job} />
                  ))}
                </View>
              </>
            )}

            {doneJobs.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Completed Jobs</Text>
                <View style={styles.list}>
                  {doneJobs.map((job) => (
                    <JobProgressCard key={job.jobId} job={job} />
                  ))}
                </View>
              </>
            )}

            {jobs.length === 0 && !error && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No jobs yet.</Text>
                <Text style={styles.emptySubText}>Your gardener will add jobs here once work begins.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[scStyles.card, { borderColor: `${color}28` }]}>
      <Text style={[scStyles.value, { color }]}>{value}</Text>
      <Text style={scStyles.label}>{label}</Text>
    </View>
  );
}

function JobProgressCard({ job }: { job: JobWithStats }) {
  const progress = job.total > 0 ? (job.done / job.total) * 100 : (job.progressPercent ?? 0);
  return (
    <View style={jpStyles.card}>
      <View style={jpStyles.top}>
        <Text style={jpStyles.name} numberOfLines={2}>{job.name}</Text>
        <View style={[jpStyles.statusPill, job.isClosed ? jpStyles.closed : jpStyles.active]}>
          <View style={[jpStyles.dot, { backgroundColor: job.isClosed ? GardenColors.textMuted : GardenColors.success }]} />
          <Text style={[jpStyles.statusText, { color: job.isClosed ? GardenColors.textMuted : GardenColors.success }]}>
            {job.isClosed ? 'Done' : 'Active'}
          </Text>
        </View>
      </View>
      {job.total > 0 && (
        <Text style={jpStyles.taskCount}>{job.done} of {job.total} tasks completed</Text>
      )}
      <View style={jpStyles.barRow}>
        <View style={jpStyles.bar}>
          <View style={[jpStyles.fill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={jpStyles.pct}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: GardenColors.textPrimary },
  sub: { fontSize: 14, color: GardenColors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary, marginBottom: 10 },
  list: { gap: 10 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 28, alignItems: 'center', gap: 8,
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubText: { color: GardenColors.textMuted, fontSize: 12, textAlign: 'center', opacity: 0.7 },
});

const scStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, padding: 12, alignItems: 'center', gap: 4,
  },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 11, color: GardenColors.textMuted, textAlign: 'center' },
});

const jpStyles = StyleSheet.create({
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: GardenColors.cardBorder, padding: 14, gap: 8,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: GardenColors.textPrimary },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  active: { borderColor: 'rgba(74, 222, 128, 0.4)' },
  closed: { borderColor: 'rgba(192, 199, 184, 0.25)' },
  dot: { width: 6, height: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  taskCount: { fontSize: 12, color: GardenColors.textMuted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  fill: { height: 4, borderRadius: 999, backgroundColor: GardenColors.accent },
  pct: { fontSize: 11, color: GardenColors.textMuted, minWidth: 32, textAlign: 'right' },
});

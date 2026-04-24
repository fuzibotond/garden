import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getClientJobs, type JobDto } from '@/services/api';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView,
    StatusBar, StyleSheet, Text, View,
} from 'react-native';

export default function ClientJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                return (
                  <View key={job.jobId} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.jobName} numberOfLines={2}>{job.name}</Text>
                      <View style={[styles.statusPill, job.isClosed ? styles.statusClosed : styles.statusActive]}>
                        <View style={[styles.statusDot, { backgroundColor: job.isClosed ? GardenColors.textMuted : GardenColors.success }]} />
                        <Text style={[styles.statusText, { color: job.isClosed ? GardenColors.textMuted : GardenColors.success }]}>
                          {job.isClosed ? 'Done' : 'Active'}
                        </Text>
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
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
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
    padding: 28, alignItems: 'center',
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
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: GardenColors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressFill: { height: 4, borderRadius: 999, backgroundColor: GardenColors.accent },
  progressPct: { fontSize: 11, color: GardenColors.textMuted, minWidth: 32, textAlign: 'right' },
});

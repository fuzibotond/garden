import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getGardenerJobs, getNumberOfGardenerClients, type JobDto } from '@/services/api';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function GardenerHome() {
  const { token, profile } = useAuth();
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [jobsRes, clientsRes] = await Promise.all([
        getGardenerJobs(token, 1, 50),
        getNumberOfGardenerClients(token),
      ]);
      setJobs(jobsRes.items);
      setClientCount(clientsRes.numItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
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
  const closedJobs = jobs.filter((j) => j.isClosed);
  const inProgressTasks = jobs.reduce((acc, j) => acc + (j.inProgressTaskCount ?? 0), 0);
  const doneTasks = jobs.reduce((acc, j) => acc + (j.finishedTaskCount ?? 0), 0);

  const stats = [
    { label: 'Active Jobs', value: String(activeJobs.length), icon: '🌿' },
    { label: 'My Clients', value: clientCount != null ? String(clientCount) : '—', icon: '👥' },
    { label: 'In Progress', value: String(inProgressTasks), icon: '⚙️' },
    { label: 'Done Today', value: String(doneTasks), icon: '✅' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.name}>
                {profile?.companyName ?? profile?.name ?? 'Gardener'}
              </Text>
            </View>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Online</Text>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Stats */}
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Active Jobs */}
          <Text style={styles.sectionTitle}>Active Jobs</Text>
          {activeJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active jobs. Enjoy the sunshine! ☀️</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {activeJobs.slice(0, 5).map((job) => (
                <View key={job.jobId} style={styles.jobCard}>
                  <View style={styles.jobRow}>
                    <Text style={styles.jobName} numberOfLines={1}>{job.name}</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  </View>
                  {job.client ? (
                    <Text style={styles.jobClient}>👤 {job.client.name}</Text>
                  ) : null}
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(job.progressPercent ?? 0, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {job.finishedTaskCount ?? 0}/{job.taskCount ?? 0} tasks
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Closed summary */}
          {closedJobs.length > 0 && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>
                ✅ {closedJobs.length} job{closedJobs.length > 1 ? 's' : ''} completed this period
              </Text>
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
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  greeting: { fontSize: 13, color: GardenColors.textMuted, marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '700', color: GardenColors.textPrimary },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(8, 38, 18, 0.9)',
    borderWidth: 1, borderColor: 'rgba(190, 255, 171, 0.32)',
  },
  badgeDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: GardenColors.accent },
  badgeText: { fontSize: 12, color: GardenColors.textMuted },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: GardenColors.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 16, alignItems: 'center', gap: 4,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: GardenColors.accent },
  statLabel: { fontSize: 12, color: GardenColors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: GardenColors.textPrimary, marginBottom: 12 },
  list: { gap: 12 },
  jobCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 16, gap: 8,
  },
  jobRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  jobName: { flex: 1, fontSize: 14, fontWeight: '600', color: GardenColors.textPrimary },
  activePill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  activePillText: { fontSize: 11, fontWeight: '600', color: GardenColors.success },
  jobClient: { fontSize: 13, color: GardenColors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressFill: { height: 4, borderRadius: 999, backgroundColor: GardenColors.accent },
  progressText: { fontSize: 11, color: GardenColors.textMuted, minWidth: 60, textAlign: 'right' },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 24, alignItems: 'center',
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14 },
  closedBanner: {
    marginTop: 16, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
  },
  closedBannerText: { color: GardenColors.success, fontSize: 13 },
});

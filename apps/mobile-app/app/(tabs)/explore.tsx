import { GardenColors } from '@/constants/theme';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type JobStatus = 'active' | 'pending' | 'done';

const statusConfig: Record<JobStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: GardenColors.success },
  pending: { label: 'Pending', color: GardenColors.warning },
  done: { label: 'Done', color: GardenColors.textMuted },
};

const jobs: { id: string; name: string; client: string; tasks: number; status: JobStatus; date: string }[] = [
  { id: '1', name: 'Spring Garden Refresh', client: 'Smith Residence', tasks: 4, status: 'active', date: 'Apr 18' },
  { id: '2', name: 'Lawn Maintenance Q2', client: 'Green Manor', tasks: 2, status: 'active', date: 'Apr 19' },
  { id: '3', name: 'Hedge & Border Trim', client: 'City Park Trust', tasks: 3, status: 'pending', date: 'Apr 22' },
  { id: '4', name: 'Irrigation Install', client: 'Oak House', tasks: 6, status: 'pending', date: 'Apr 24' },
  { id: '5', name: 'Winter Cleanup', client: 'Maple Street', tasks: 5, status: 'done', date: 'Mar 30' },
  { id: '6', name: 'Soil Aeration', client: 'Riverside Park', tasks: 2, status: 'done', date: 'Mar 22' },
];

const filterLabels: JobStatus[] = ['active', 'pending', 'done'];

export default function JobsScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Jobs</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ New Job</Text>
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]} activeOpacity={0.75}>
            <Text style={[styles.filterText, styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {filterLabels.map((f) => (
            <TouchableOpacity key={f} style={styles.filterPill} activeOpacity={0.75}>
              <View style={[styles.filterDot, { backgroundColor: statusConfig[f].color }]} />
              <Text style={styles.filterText}>{statusConfig[f].label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Job cards */}
        <View style={styles.list}>
          {jobs.map((job) => {
            const s = statusConfig[job.status];
            return (
              <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.82}>
                <View style={styles.jobTop}>
                  <Text style={styles.jobName} numberOfLines={1}>{job.name}</Text>
                  <View style={[styles.jobStatusPill, { borderColor: s.color + '55' }]}>
                    <View style={[styles.jobStatusDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.jobStatusText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={styles.jobClient}>{job.client}</Text>
                <View style={styles.jobMeta}>
                  <Text style={styles.jobMetaText}>📋 {job.tasks} task{job.tasks !== 1 ? 's' : ''}</Text>
                  <Text style={styles.jobMetaText}>📅 {job.date}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GardenColors.bgRoot,
  },
  scroll: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: GardenColors.textPrimary,
    letterSpacing: 0.2,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GardenColors.accent,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#071108',
  },
  filtersScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  filtersRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 40, 24, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.18)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(217, 255, 106, 0.15)',
    borderColor: 'rgba(217, 255, 106, 0.45)',
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  filterText: {
    fontSize: 13,
    color: GardenColors.textMuted,
  },
  filterTextActive: {
    color: GardenColors.accent,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: GardenColors.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    padding: 16,
    gap: 8,
  },
  jobTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: GardenColors.textPrimary,
  },
  jobStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  jobStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  jobStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  jobClient: {
    fontSize: 13,
    color: GardenColors.textMuted,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 2,
  },
  jobMetaText: {
    fontSize: 12,
    color: GardenColors.textMuted,
  },
});


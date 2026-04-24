import { GardenColors } from '@/constants/theme';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const stats = [
  { label: 'Active Jobs', value: '—', icon: '🌿' },
  { label: 'Tasks Today', value: '—', icon: '📋' },
  { label: 'Clients', value: '—', icon: '👥' },
  { label: 'Materials', value: '—', icon: '📦' },
];

const quickActions = [
  { label: 'New Job', icon: '➕', color: GardenColors.accent },
  { label: 'Log Task', icon: '✅', color: GardenColors.success },
  { label: 'Clients', icon: '👤', color: '#6ee7b7' },
  { label: 'Schedule', icon: '📅', color: '#a3e635' },
];

const recentActivity = [
  { title: 'Front lawn mowing', client: 'Smith Residence', status: 'In progress', dot: GardenColors.success },
  { title: 'Hedge trimming', client: 'Green Manor', status: 'Pending', dot: GardenColors.warning },
  { title: 'Fertilising beds', client: 'City Park', status: 'Done', dot: GardenColors.textMuted },
];

export default function HomeScreen() {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.brand}>Garden Admin</Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Online</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} activeOpacity={0.75}>
              <View style={[styles.actionIcon, { borderColor: a.color + '55' }]}>
                <Text style={styles.actionIconText}>{a.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.card}>
          {recentActivity.map((item, i) => (
            <View key={item.title} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
              <View style={[styles.activityDot, { backgroundColor: item.dot }]} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityClient}>{item.client}</Text>
              </View>
              <View style={[styles.statusPill, { borderColor: item.dot + '55' }]}>
                <Text style={[styles.statusText, { color: item.dot }]}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>View all jobs →</Text>
        </TouchableOpacity>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: GardenColors.textMuted,
    marginBottom: 2,
  },
  brand: {
    fontSize: 26,
    fontWeight: '700',
    color: GardenColors.textPrimary,
    letterSpacing: 0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 38, 18, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: GardenColors.accent,
  },
  badgeText: {
    fontSize: 12,
    color: GardenColors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: GardenColors.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: GardenColors.accent,
  },
  statLabel: {
    fontSize: 12,
    color: GardenColors.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GardenColors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GardenColors.cardBg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 11,
    color: GardenColors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: GardenColors.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    padding: 4,
    marginBottom: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  activityDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GardenColors.textPrimary,
  },
  activityClient: {
    fontSize: 12,
    color: GardenColors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ctaBtn: {
    borderRadius: 999,
    backgroundColor: 'rgba(217, 255, 106, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 255, 106, 0.35)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: GardenColors.accent,
  },
});


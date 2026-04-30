import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ClientProfile() {
  const { profile, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  const fullName = profile?.name ?? '—';
  const email = profile?.email ?? '—';
  const role = profile?.role ?? '—';

  const initials = fullName !== '—'
    ? fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>🌱 {role}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow label="Email" value={email} />
          <Divider />
          <InfoRow label="Role" value={role} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: -16 }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GardenColors.bgRoot },
  topBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  body: { flex: 1, padding: 20, gap: 20 },
  avatarWrap: { alignItems: 'center', gap: 10, paddingTop: 12 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(217, 255, 106, 0.12)',
    borderWidth: 2, borderColor: 'rgba(217, 255, 106, 0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: GardenColors.accent },
  name: { fontSize: 20, fontWeight: '700', color: GardenColors.textPrimary },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(217, 255, 106, 0.08)',
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.2)',
  },
  roleText: { fontSize: 12, fontWeight: '600', color: GardenColors.accent },
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 16, gap: 12,
  },
  logoutBtn: {
    height: 52, borderRadius: 999, backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  label: { fontSize: 13, color: GardenColors.textMuted },
  value: { fontSize: 14, fontWeight: '500', color: GardenColors.textPrimary, flex: 1, textAlign: 'right' },
});

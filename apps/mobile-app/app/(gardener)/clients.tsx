import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getGardenerClients, type GardenerClientDto } from '@/services/api';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Linking, RefreshControl, ScrollView,
    StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

export default function GardenerClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<GardenerClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await getGardenerClients(token, 1, 100);
      setClients(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
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

  function openEmail(email: string) {
    void Linking.openURL(`mailto:${email}`);
  }

  function openSms(email: string) {
    // SMS deeplink — phone number not in API yet, fall back to email
    void Linking.openURL(`mailto:${email}?subject=Garden%20Update`);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <View style={styles.topBar}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.count}>{clients.length} total</Text>
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

          {clients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No clients yet.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {clients.map((c) => {
                const isOpen = expanded === c.clientId;
                const initials = c.fullName
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <TouchableOpacity
                    key={c.clientId}
                    style={styles.card}
                    onPress={() => setExpanded(isOpen ? null : c.clientId)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardMain}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.name}>{c.fullName}</Text>
                        <Text style={styles.email}>{c.email}</Text>
                      </View>
                      <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                    </View>

                    {isOpen && (
                      <View style={styles.expanded}>
                        {/* Contact actions */}
                        <Text style={styles.contactTitle}>Contact</Text>
                        <View style={styles.contactRow}>
                          <TouchableOpacity
                            style={styles.contactBtn}
                            onPress={() => openEmail(c.email)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.contactBtnIcon}>✉️</Text>
                            <Text style={styles.contactBtnText}>Email</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.contactBtn, styles.contactBtnDisabled]}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.contactBtnIcon}>📞</Text>
                            <Text style={[styles.contactBtnText, { color: GardenColors.textMuted }]}>
                              Call
                            </Text>
                            <Text style={styles.comingSoon}>coming soon</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.contactBtn}
                            onPress={() => openSms(c.email)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.contactBtnIcon}>💬</Text>
                            <Text style={styles.contactBtnText}>Message</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Invitation status */}
                        {c.invitationStatus ? (
                          <View style={styles.inviteRow}>
                            <Text style={styles.inviteLabel}>Invite status:</Text>
                            <Text style={[styles.inviteStatus, { color: c.invitationStatus === 'Accepted' ? GardenColors.success : GardenColors.warning }]}>
                              {c.invitationStatus}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: GardenColors.textPrimary },
  count: { fontSize: 13, color: GardenColors.textMuted },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { color: '#fecaca', fontSize: 13, marginBottom: 12 },
  list: { gap: 10 },
  emptyCard: {
    backgroundColor: GardenColors.cardBg, borderRadius: 16,
    borderWidth: 1, borderColor: GardenColors.cardBorder,
    padding: 28, alignItems: 'center',
  },
  emptyText: { color: GardenColors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: GardenColors.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: GardenColors.cardBorder, overflow: 'hidden',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(217, 255, 106, 0.15)',
    borderWidth: 1, borderColor: 'rgba(217, 255, 106, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: GardenColors.accent },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: GardenColors.textPrimary },
  email: { fontSize: 12, color: GardenColors.textMuted },
  chevron: { fontSize: 11, color: GardenColors.textMuted },
  expanded: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    padding: 14, gap: 12,
  },
  contactTitle: { fontSize: 12, color: GardenColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.12 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(190, 255, 171, 0.15)',
  },
  contactBtnDisabled: { opacity: 0.55 },
  contactBtnIcon: { fontSize: 20 },
  contactBtnText: { fontSize: 12, fontWeight: '600', color: GardenColors.textPrimary },
  comingSoon: { fontSize: 9, color: GardenColors.textMuted },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteLabel: { fontSize: 12, color: GardenColors.textMuted },
  inviteStatus: { fontSize: 12, fontWeight: '600' },
});

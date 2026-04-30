import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const { isLoading, token, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace('/login');
    } else if (role === 'Client') {
      router.replace('/(client)/');
    } else if (role === 'Gardener' || role === 'Admin') {
      router.replace('/(gardener)/');
    }
    // if role is still null/unknown, wait for next render
  }, [isLoading, token, role, router]);

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🌱</Text>
      </View>
      <Text style={styles.brand}>Garden</Text>
      <Text style={styles.tagline}>Growing made simple</Text>
      <ActivityIndicator
        color={GardenColors.accent}
        size="large"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GardenColors.bgRoot,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: GardenColors.cardBg,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    color: GardenColors.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: GardenColors.textMuted,
  },
  spinner: {
    marginTop: 40,
  },
});

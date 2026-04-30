import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // Navigate to splash — index.tsx reads the updated role and redirects to the correct section
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={GardenColors.bgRoot} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🌱</Text>
          <Text style={styles.brandText}>Garden</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Welcome back, gardener</Text>
          </View>

          <Text style={styles.title}>Sign in to Garden</Text>
          <Text style={styles.subtitle}>
            Manage your jobs and tasks in one lush dashboard.
          </Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor={GardenColors.textMuted}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={GardenColors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#071108" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GardenColors.bgRoot,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  brandIcon: { fontSize: 32 },
  brandText: {
    fontSize: 28,
    fontWeight: '700',
    color: GardenColors.accent,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: GardenColors.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GardenColors.cardBorder,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 38, 18, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)',
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: GardenColors.accent,
  },
  pillText: { fontSize: 12, color: GardenColors.textMuted },
  title: { fontSize: 22, fontWeight: '700', color: GardenColors.textPrimary },
  subtitle: { fontSize: 13, color: GardenColors.textMuted, lineHeight: 20 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, color: 'rgba(247, 248, 244, 0.9)' },
  input: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(190, 255, 171, 0.32)',
    backgroundColor: 'rgba(4, 20, 10, 0.86)',
    paddingHorizontal: 16,
    color: GardenColors.textPrimary,
    fontSize: 14,
  },
  errorText: { fontSize: 13, color: '#fecaca' },
  btn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: GardenColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#071108' },
});

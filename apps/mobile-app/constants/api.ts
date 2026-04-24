import { Platform } from 'react-native'

/**
 * API base URL.
 * - Set EXPO_PUBLIC_API_URL env var to override (recommended for physical devices).
 * - iOS simulator:      localhost works
 * - Android emulator:   10.0.2.2 maps to your machine's localhost
 * - Physical device:    Use a tunnel URL (e.g. ngrok) or your LAN IP
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? Platform.select({
  android: 'http://10.0.2.2:5055',
  default: 'http://localhost:5055',
})) as string

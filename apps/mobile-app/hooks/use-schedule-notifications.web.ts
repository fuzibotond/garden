// Web stub — expo-notifications is not supported on web.
// All exports are no-ops so the web bundler never pulls in the native module.

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function registerExpoPushToken(_authToken: string): Promise<void> {
  // no-op on web
}

function useScheduleNotifications(
  _token: string | null,
  _role: 'Gardener' | 'Client' | 'Admin' | null,
) {
  // no-op on web
}

export default useScheduleNotifications;

import { login as apiLogin, logout as apiLogout, getMyProfile, type Profile } from '@/services/api'
import { getStoredToken, removeToken, saveToken } from '@/services/storage'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

type Role = 'Gardener' | 'Client' | 'Admin'

type AuthContextValue = {
  token: string | null
  profile: Profile | null
  role: Role | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const stored = await getStoredToken()
      if (stored) {
        try {
          const p = await getMyProfile(stored)
          setToken(stored)
          setProfile(p)
        } catch {
          await removeToken()
        }
      }
      setIsLoading(false)
    })()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    const p = await getMyProfile(res.accessToken)
    await saveToken(res.accessToken)
    setToken(res.accessToken)
    setProfile(p)
  }, [])

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await apiLogout(token)
      } catch {
        // ignore — still clear locally
      }
    }
    await removeToken()
    setToken(null)
    setProfile(null)
  }, [token])

  const role = (profile?.role ? profile.role as Role : null)

  const value = useMemo(
    () => ({ token, profile, role, isLoading, signIn, signOut }),
    [token, profile, role, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
